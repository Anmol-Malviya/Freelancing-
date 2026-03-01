from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime

from app.database import (
    users_col, follows_col, projects_col,
    ratings_col, comments_col, likes_col,
    transactions_col, withdrawals_col
)
from app.schemas import UserUpdate, RatingCreate, WithdrawalRequest
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


def _public_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "bio": user.get("bio", ""),
        "skills": user.get("skills", []),
        "github_url": user.get("github_url", ""),
        "profile_image": user.get("profile_image", ""),
        "role": user.get("role", "user"),
        "total_earnings": user.get("total_earnings", 0),
        "created_at": user.get("created_at"),
    }


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return {"success": True, "data": {
        **_public_user(current_user),
        "email": current_user["email"],
        "withdrawable_balance": current_user.get("withdrawable_balance", 0),
        "email_verified": current_user.get("email_verified", False),
    }}


@router.put("/me")
async def update_me(body: UserUpdate, current_user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.dict().items() if v is not None}
    updates["updated_at"] = datetime.utcnow()
    users_col().update_one({"_id": current_user["_id"]}, {"$set": updates})
    updated = users_col().find_one({"_id": current_user["_id"]})
    return {"success": True, "data": _public_user(updated)}


@router.get("/{user_id}")
async def get_user(user_id: str):
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    user = users_col().find_one({"_id": oid, "is_active": True, "is_banned": False})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "data": _public_user(user)}


# ─── Follow / Unfollow ────────────────────────────────────────
@router.post("/{user_id}/follow")
async def follow_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    try:
        target_oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if not users_col().find_one({"_id": target_oid}):
        raise HTTPException(status_code=404, detail="User not found")

    try:
        follows_col().insert_one({
            "follower_id": current_user["_id"],
            "following_id": target_oid,
            "created_at": datetime.utcnow(),
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Already following")

    return {"success": True, "data": {"message": "Following"}}


@router.delete("/{user_id}/follow")
async def unfollow_user(user_id: str, current_user: dict = Depends(get_current_user)):
    try:
        target_oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = follows_col().delete_one({
        "follower_id": current_user["_id"],
        "following_id": target_oid,
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not following this user")

    return {"success": True, "data": {"message": "Unfollowed"}}


@router.get("/{user_id}/followers")
async def get_followers(user_id: str, page: int = 1, limit: int = 20):
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    skip = (page - 1) * limit
    total = follows_col().count_documents({"following_id": oid})
    docs = list(follows_col().find({"following_id": oid}).skip(skip).limit(limit))

    follower_ids = [d["follower_id"] for d in docs]
    followers = list(users_col().find({"_id": {"$in": follower_ids}}))

    return {
        "success": True,
        "data": [_public_user(u) for u in followers],
        "meta": {"total": total, "page": page, "limit": limit},
    }


@router.get("/{user_id}/following")
async def get_following(user_id: str, page: int = 1, limit: int = 20):
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    skip = (page - 1) * limit
    total = follows_col().count_documents({"follower_id": oid})
    docs = list(follows_col().find({"follower_id": oid}).skip(skip).limit(limit))

    following_ids = [d["following_id"] for d in docs]
    following = list(users_col().find({"_id": {"$in": following_ids}}))

    return {
        "success": True,
        "data": [_public_user(u) for u in following],
        "meta": {"total": total, "page": page, "limit": limit},
    }


# ─── Earnings & Withdrawal ────────────────────────────────────
@router.get("/me/earnings")
async def my_earnings(current_user: dict = Depends(get_current_user)):
    txns = list(
        transactions_col()
        .find({"user_id": current_user["_id"]})
        .sort("timestamp", -1)
        .limit(50)
    )
    return {
        "success": True,
        "data": {
            "total_earnings": current_user.get("total_earnings", 0),
            "withdrawable_balance": current_user.get("withdrawable_balance", 0),
            "transactions": [
                {
                    "id": str(t["_id"]),
                    "type": t["type"],
                    "amount": t["amount"],
                    "reference_id": t.get("reference_id"),
                    "timestamp": t["timestamp"],
                }
                for t in txns
            ],
        },
    }


@router.post("/me/withdraw")
async def request_withdrawal(body: WithdrawalRequest, current_user: dict = Depends(get_current_user)):
    balance = current_user.get("withdrawable_balance", 0)
    if body.amount > balance:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: {balance} paise")

    # Deduct balance atomically
    users_col().update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"withdrawable_balance": -body.amount}}
    )

    withdrawal = {
        "user_id": current_user["_id"],
        "amount": body.amount,
        "status": "pending",
        "upi_id": body.upi_id,
        "razorpay_payout_id": None,
        "requested_at": datetime.utcnow(),
        "processed_at": None,
    }
    result = withdrawals_col().insert_one(withdrawal)

    # Debit transaction
    transactions_col().insert_one({
        "user_id": current_user["_id"],
        "type": "debit",
        "amount": body.amount,
        "reference_id": str(result.inserted_id),
        "timestamp": datetime.utcnow(),
    })

    return {
        "success": True,
        "data": {
            "withdrawal_id": str(result.inserted_id),
            "amount": body.amount,
            "status": "pending",
            "message": "Withdrawal request submitted. Processing within 2–3 business days.",
        },
    }
