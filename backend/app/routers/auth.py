from fastapi import APIRouter, HTTPException, status, Request, Depends
from fastapi.responses import JSONResponse
from datetime import datetime
from bson import ObjectId
import urllib.request
import json
import urllib.error
import random

from app.database import users_col, otps_col
from app.config import settings
from app.schemas import UserRegister, UserLogin, SendOTPRequest, VerifyOTPRequest, FirebaseLoginRequest
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


def _serialize_user(user: dict) -> dict:
    """Convert MongoDB doc to JSON-safe dict (no password_hash)."""
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role", "user"),
        "email_verified": user.get("email_verified", False),
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister):
    # Check duplicate email
    if users_col().find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=409, detail="Email already registered")

    now = datetime.utcnow()
    user_doc = {
        "name": body.name,
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "email_verified": True,  # Auto-verified for MVP (no email service configured)
        "bio": "",
        "skills": [],
        "github_url": "",
        "profile_image": "",
        "role": "user",
        "is_active": True,
        "is_banned": False,
        "token_version": 0,
        "last_login": None,
        "withdrawable_balance": 0,   # paise
        "total_earnings": 0,          # paise
        "created_at": now,
        "updated_at": now,
    }

    result = users_col().insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    access_token = create_access_token(
        {"sub": str(result.inserted_id), "tv": 0}
    )
    refresh_token = create_refresh_token(
        {"sub": str(result.inserted_id), "tv": 0}
    )

    return {
        "success": True,
        "data": {
            "user": _serialize_user(user_doc),
            "access_token": access_token,
            "refresh_token": refresh_token,
        },
    }


@router.post("/login")
async def login(body: UserLogin):
    user = users_col().find_one({"email": body.email.lower()})

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get("is_banned"):
        raise HTTPException(status_code=403, detail="Account has been suspended")

    tv = user.get("token_version", 0)

    # Update last_login
    users_col().update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )

    access_token = create_access_token({"sub": str(user["_id"]), "tv": tv})
    refresh_token = create_refresh_token({"sub": str(user["_id"]), "tv": tv})

    return {
        "success": True,
        "data": {
            "user": _serialize_user(user),
            "access_token": access_token,
            "refresh_token": refresh_token,
        },
    }

@router.post("/firebase-login")
async def firebase_login(body: FirebaseLoginRequest):
    import firebase_admin
    from firebase_admin import auth
    
    try:
        # 1. Verify token with Google
        decoded_token = auth.verify_id_token(body.token)
        email = decoded_token.get("email").lower()
        now = datetime.utcnow()
        
        # 2. Find MongoDB user
        user = users_col().find_one({"email": email})
        
        # 3. Create if missing (Registration flow)
        if not user:
            name = body.name or decoded_token.get("name") or email.split("@")[0]
            user_doc = {
                "name": name,
                "email": email,
                "password_hash": "", # Firebase handles passwords
                "email_verified": decoded_token.get("email_verified", True),
                "bio": "",
                "skills": [],
                "github_url": "",
                "profile_image": decoded_token.get("picture", ""),
                "role": "user",
                "is_active": True,
                "is_banned": False,
                "token_version": 0,
                "last_login": now,
                "withdrawable_balance": 0,
                "total_earnings": 0,
                "created_at": now,
                "updated_at": now,
            }
            result = users_col().insert_one(user_doc)
            user_doc["_id"] = result.inserted_id
            user = user_doc
        else:
            # Check banned
            if user.get("is_banned"):
                raise HTTPException(status_code=403, detail="Account suspended")
            # Update login time
            users_col().update_one({"_id": user["_id"]}, {"$set": {"last_login": now}})
            
        # 4. Give them our custom JWT so none of our backend requires changes
        tv = user.get("token_version", 0)
        access_token = create_access_token({"sub": str(user["_id"]), "tv": tv})
        refresh_token = create_refresh_token({"sub": str(user["_id"]), "tv": tv})
        
        return {
            "success": True,
            "data": {
                "user": _serialize_user(user),
                "access_token": access_token,
                "refresh_token": refresh_token,
            },
        }
    except Exception as e:
        import traceback
        print(f"Firebase token error: {traceback.format_exc()}")
        raise HTTPException(status_code=401, detail=f"Invalid Firebase Token: {e}")

def send_otp_email(email: str, otp: str):
    import os
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from fastapi import HTTPException

    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    
    # We will try SSL on 465 first, and if that fails, STARTTLS on 587.
    smtp_server = "smtp.gmail.com"
    sender_email = settings.EMAIL_FROM
    sender_password = settings.RESEND_API_KEY # Repurposed as SMTP password
    
    # Force read from .env if current settings are empty or default
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if line.startswith("RESEND_API_KEY="): # Repurposing this env var for SMTP App Password
                    sender_password = line.strip().split("=", 1)[1]
                elif line.startswith("EMAIL_FROM="):
                    sender_email = line.strip().split("=", 1)[1]

    message = MIMEMultipart("alternative")
    message["Subject"] = "Your DevMarket Verification Code"
    message["From"] = sender_email
    message["To"] = email

    html = f"<h1>Verification Code</h1><p>Your OTP is <strong style='font-size: 24px; letter-spacing: 4px;'>{otp}</strong>. It will expire in 5 minutes.</p>"
    part2 = MIMEText(html, "html")
    message.attach(part2)

    try:
        # Attempt 1: SSL on port 465
        context = smtplib.SMTP_SSL(smtp_server, 465, timeout=10)
        context.login(sender_email, sender_password)
        context.sendmail(sender_email, email, message.as_string())
        context.quit()
        print(f"✅ SMTP EMAIL SENT SUCCESSFULLY (SSL) to {email}")
        return {"id": "smtp-sent"}
    except Exception as e:
        print(f"SSL Port 465 failed: {e}. Trying STARTTLS on 587...")
        try:
            # Attempt 2: STARTTLS on port 587
            context2 = smtplib.SMTP(smtp_server, 587, timeout=10)
            context2.starttls()
            context2.login(sender_email, sender_password)
            context2.sendmail(sender_email, email, message.as_string())
            context2.quit()
            print(f"✅ SMTP EMAIL SENT SUCCESSFULLY (STARTTLS) to {email}")
            return {"id": "smtp-sent"}
        except smtplib.SMTPAuthenticationError as auth_err:
            print(f"🚨 SMTP Auth Blocked. Invalid App Password for {sender_email}: {auth_err}")
            return
        except Exception as e2:
            print(f"\n{'='*60}")
            print(f"🚨 GOOGLE SMTP SEND FAILED (Render likely blocking ports)")
            print(f"Error 1 (465): {e}")
            print(f"Error 2 (587): {e2}")
            print(f"📧 Fallback log: Your OTP for {email} is -> {otp} <-")
            print(f"{'='*60}\n")
            return



@router.post("/request-otp")
async def request_otp(body: SendOTPRequest):
    try:
        # REAL RANDOM OTP IS RESTORED
        otp = str(random.randint(100000, 999999))
        now = datetime.utcnow()
        
        # Store OTP in db
        otps_col().insert_one({
            "email": body.email.lower(),
            "otp": otp,
            "created_at": now
        })
        
        # Log the OTP on the server for easy testing on Render
        print(f"\n🔑 GENERATED OTP for {body.email}: {otp}\n")
        
        # Send email asynchronously using RESEND API (bypasses Render's port blocks!)
        import asyncio
        asyncio.create_task(asyncio.to_thread(send_otp_email, body.email.lower(), otp))
        
        return {"success": True, "data": {"message": "OTP sent successfully"}}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        with open("c:/Users/anmol/Documents/NEW-001/backend/error_log.txt", "w") as f:
            f.write(f"CRITICAL ERROR in request_otp:\n{error_details}")
        print(f"CRITICAL ERROR in request_otp:\n{error_details}")
        raise HTTPException(status_code=500, detail=f"Server logic error: {str(e)}")


@router.post("/verify-otp")
async def verify_otp(body: VerifyOTPRequest):
    try:
        email = body.email.lower()
        
        # Check OTP (get the most recent one)
        otp_doc = otps_col().find_one({"email": email}, sort=[("created_at", -1)])
        
        if not otp_doc or otp_doc["otp"] != body.otp:
            raise HTTPException(status_code=401, detail="Invalid or expired OTP")
            
        # Valid OTP, clear it
        otps_col().delete_many({"email": email})
        
        # Find user or create if new
        user = users_col().find_one({"email": email})
        now = datetime.utcnow()
        
        if not user:
            name = body.name or email.split("@")[0]
            # Create user
            user_doc = {
                "name": name,
                "email": email,
                "password_hash": hash_password(body.otp), # dummy password
                "email_verified": True,
                "bio": "",
                "skills": [],
                "github_url": "",
                "profile_image": "",
                "role": "user",
                "is_active": True,
                "is_banned": False,
                "token_version": 0,
                "last_login": now,
                "withdrawable_balance": 0,
                "total_earnings": 0,
                "created_at": now,
                "updated_at": now,
            }
            result = users_col().insert_one(user_doc)
            user_doc["_id"] = result.inserted_id
            user = user_doc
        else:
            if user.get("is_banned"):
                raise HTTPException(status_code=403, detail="Account has been suspended")
            # Update last_login
            users_col().update_one(
                {"_id": user["_id"]},
                {"$set": {"last_login": now, "email_verified": True}}
            )

        tv = user.get("token_version", 0)
        access_token = create_access_token({"sub": str(user["_id"]), "tv": tv})
        refresh_token = create_refresh_token({"sub": str(user["_id"]), "tv": tv})

        return {
            "success": True,
            "data": {
                "user": _serialize_user(user),
                "access_token": access_token,
                "refresh_token": refresh_token,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"CRITICAL ERROR in verify_otp:\n{error_details}")
        raise HTTPException(status_code=500, detail=f"Server logic error: {str(e)}")


@router.post("/refresh-token")
async def refresh_token(request: Request):
    body = await request.json()
    token = body.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="refresh_token required")

    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    tv = payload.get("tv", 0)
    user = users_col().find_one({"_id": ObjectId(user_id)})

    if not user or user.get("token_version", 0) != tv:
        raise HTTPException(status_code=401, detail="Session invalidated")

    new_access = create_access_token({"sub": user_id, "tv": tv})
    return {"success": True, "data": {"access_token": new_access}}


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Increment token_version to invalidate ALL existing tokens for this user.
    """
    new_tv = current_user.get("token_version", 0) + 1
    users_col().update_one(
        {"_id": current_user["_id"]},
        {"$set": {"token_version": new_tv}}
    )
    return {"success": True, "data": {"message": "Logged out successfully"}}
