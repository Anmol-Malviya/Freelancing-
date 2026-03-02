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
from app.schemas import UserRegister, UserLogin, SendOTPRequest, VerifyOTPRequest
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

def send_otp_email(email: str, otp: str):
    import urllib.request
    import json
    import os
    from fastapi import HTTPException
    
    # Render doesn't block out-bound HTTP requests, so Resend API will work!
    api_key = settings.RESEND_API_KEY
    if not api_key:
        print("Missing RESEND_API_KEY")
        return
        
    try:
        data = {
            "from": "DevMarket <onboarding@resend.dev>",
            "to": [email],
            "subject": "Your DevMarket Verification Code",
            "html": f"<h1>Verification Code</h1><p>Your OTP is <strong style='font-size: 24px; letter-spacing: 4px;'>{otp}</strong>. It will expire in 5 minutes.</p>"
        }
        
        req = urllib.request.Request("https://api.resend.com/emails", data=json.dumps(data).encode("utf-8"))
        req.add_header("Authorization", f"Bearer {api_key}")
        req.add_header("Content-Type", "application/json")
        
        response = urllib.request.urlopen(req)
        print(f"✅ EMAIL SENT SUCCESSFULLY VIA RESEND API: {response.read()}")
        
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"\n{'='*60}")
        print(f"🚨 RESEND API ERROR: You are trying to send to {email}")
        print(f"Resend Error details: {error_body}")
        print("💡 REMINDER: On Resend's free tier, you can ONLY send emails to the exact email address you registered Resend with (jsshmrgs@gmail.com). To send to other emails, you must verify a domain.")
        print(f"{'='*60}\n")
    except Exception as e:
        print(f"Exception sending email: {e}")



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
