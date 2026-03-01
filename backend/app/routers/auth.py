from fastapi import APIRouter, HTTPException, status, Request, Depends
from fastapi.responses import JSONResponse
from datetime import datetime
from bson import ObjectId

from app.database import users_col
from app.schemas import UserRegister, UserLogin
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
