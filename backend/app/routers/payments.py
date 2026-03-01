import hmac
import hashlib
import razorpay
import boto3

from fastapi import APIRouter, HTTPException, Depends, Request, status
from datetime import datetime, timedelta
from bson import ObjectId

from app.config import settings
from app.database import (
    projects_col, purchases_col, transactions_col,
    users_col, processed_webhooks_col, audit_logs_col
)
from app.schemas import CreateOrderRequest, VerifyPaymentRequest
from app.auth import get_current_user
from app.commission import calculate_commission

router = APIRouter(prefix="/api/v1/payments", tags=["Payments"])

# ─── Razorpay client ─────────────────────────────────────────
def get_razorpay_client():
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


# ─── S3 client ───────────────────────────────────────────────
def get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


# ─── Create Order ─────────────────────────────────────────────
@router.post("/create-order")
async def create_order(body: CreateOrderRequest, current_user: dict = Depends(get_current_user)):
    if not current_user.get("email_verified"):
        raise HTTPException(status_code=403, detail="Email verification required to purchase")

    try:
        project_oid = ObjectId(body.project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = projects_col().find_one({"_id": project_oid, "is_deleted": False, "is_published": True})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Anti-fraud: prevent self-purchase
    if str(project["user_id"]) == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="You cannot purchase your own project")

    # Check for existing completed purchase
    existing = purchases_col().find_one({
        "buyer_id": current_user["_id"],
        "project_id": project_oid,
        "status": "completed",
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already own this project")

    price_paise = project["price"]

    # Free project — direct claim
    if price_paise == 0:
        now = datetime.utcnow()
        purchase_doc = {
            "buyer_id": current_user["_id"],
            "project_id": project_oid,
            "seller_id": project["user_id"],
            "amount": 0,
            "platform_fee": 0,
            "creator_amount": 0,
            "razorpay_order_id": None,
            "razorpay_payment_id": None,
            "status": "completed",
            "download_count": 0,
            "max_downloads": settings.MAX_DOWNLOADS_PER_PURCHASE,
            "refund_status": "none",
            "created_at": now,
        }
        result = purchases_col().insert_one(purchase_doc)
        projects_col().update_one({"_id": project_oid}, {"$inc": {"total_sales": 1}})
        return {
            "success": True,
            "data": {"purchase_id": str(result.inserted_id), "free": True},
        }

    commission = calculate_commission(price_paise)

    # Create Razorpay order (amount in paise)
    rz = get_razorpay_client()
    rz_order = rz.order.create({
        "amount": price_paise,
        "currency": "INR",
        "receipt": f"dm_{str(current_user['_id'])[:8]}",
        "notes": {"project_id": str(project_oid)},
    })

    now = datetime.utcnow()
    purchase_doc = {
        "buyer_id": current_user["_id"],
        "project_id": project_oid,
        "seller_id": project["user_id"],
        "amount": commission["buyer_pays_paise"],
        "platform_fee": commission["platform_fee_paise"],
        "creator_amount": commission["creator_amount_paise"],
        "razorpay_order_id": rz_order["id"],
        "razorpay_payment_id": None,
        "status": "pending",
        "download_count": 0,
        "max_downloads": settings.MAX_DOWNLOADS_PER_PURCHASE,
        "refund_status": "none",
        "expires_at": now + timedelta(minutes=30),
        "created_at": now,
    }
    result = purchases_col().insert_one(purchase_doc)

    return {
        "success": True,
        "data": {
            "purchase_id": str(result.inserted_id),
            "razorpay_order_id": rz_order["id"],
            "amount": price_paise,
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID,
            "commission": commission,
        },
    }


# ─── Verify Payment (client callback) ────────────────────────
@router.post("/verify")
async def verify_payment(body: VerifyPaymentRequest, current_user: dict = Depends(get_current_user)):
    # 1. Verify HMAC signature
    expected_sig = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment signature verification failed")

    # 2. Verify payment with Razorpay API
    rz = get_razorpay_client()
    try:
        payment = rz.payment.fetch(body.razorpay_payment_id)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not verify payment with Razorpay")

    if payment.get("status") != "captured":
        raise HTTPException(status_code=400, detail=f"Payment not captured: {payment.get('status')}")

    # 3. Find purchase record
    purchase = purchases_col().find_one({
        "razorpay_order_id": body.razorpay_order_id,
        "buyer_id": current_user["_id"],
    })
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase record not found")

    if purchase["status"] == "completed":
        return {"success": True, "data": {"purchase_id": str(purchase["_id"]), "already_completed": True}}

    # 4. Complete purchase atomically
    _complete_purchase(purchase, body.razorpay_payment_id)

    return {"success": True, "data": {"purchase_id": str(purchase["_id"])}}


# ─── Webhook (Razorpay retry-safe) ───────────────────────────
@router.post("/webhook")
async def razorpay_webhook(request: Request):
    body_bytes = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # Verify webhook signature
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body_bytes,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = await request.json()
    event_id = payload.get("id")
    event_type = payload.get("event")

    # Idempotency check
    try:
        processed_webhooks_col().insert_one({
            "razorpay_event_id": event_id,
            "processed_at": datetime.utcnow()
        })
    except Exception:
        # Duplicate key = already processed
        return {"success": True, "data": {"message": "Already processed"}}

    if event_type == "payment.captured":
        payment_data = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment_data.get("order_id")
        payment_id = payment_data.get("id")

        purchase = purchases_col().find_one({
            "razorpay_order_id": order_id,
            "status": "pending",
        })
        if purchase:
            _complete_purchase(purchase, payment_id)

    return {"success": True}


def _complete_purchase(purchase: dict, razorpay_payment_id: str):
    """Atomically mark purchase completed and credit seller."""
    now = datetime.utcnow()

    purchases_col().update_one(
        {"_id": purchase["_id"]},
        {
            "$set": {
                "status": "completed",
                "razorpay_payment_id": razorpay_payment_id,
                "completed_at": now,
            }
        }
    )

    # Atomic increment — no race condition
    projects_col().update_one(
        {"_id": purchase["project_id"]},
        {"$inc": {"total_sales": 1}}
    )

    # Credit seller's withdrawable balance
    users_col().update_one(
        {"_id": purchase["seller_id"]},
        {
            "$inc": {
                "withdrawable_balance": purchase["creator_amount"],
                "total_earnings": purchase["creator_amount"],
            }
        }
    )

    # Ledger entry
    transactions_col().insert_one({
        "user_id": purchase["seller_id"],
        "type": "credit",
        "amount": purchase["creator_amount"],
        "reference_id": str(purchase["_id"]),
        "timestamp": now,
    })

    # Audit log
    audit_logs_col().insert_one({
        "action": "purchase_completed",
        "entity": "purchase",
        "entity_id": str(purchase["_id"]),
        "amount": purchase["amount"],
        "timestamp": now,
    })


# ─── Secure File Download ─────────────────────────────────────
@router.get("/download/{purchase_id}")
async def download_file(purchase_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(purchase_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid purchase ID")

    purchase = purchases_col().find_one({"_id": oid})
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    # Ownership check
    if purchase["buyer_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    if purchase["status"] != "completed":
        raise HTTPException(status_code=403, detail="Payment not completed")

    # Download limit check
    if purchase["download_count"] >= purchase.get("max_downloads", settings.MAX_DOWNLOADS_PER_PURCHASE):
        raise HTTPException(
            status_code=403,
            detail=f"Download limit reached ({purchase['max_downloads']} downloads). Contact support."
        )

    # Get the project (need s3_file_key)
    project = projects_col().find_one({"_id": purchase["project_id"]})
    if not project or not project.get("s3_file_key"):
        raise HTTPException(status_code=404, detail="Project file not found")

    # Atomic increment download count
    purchases_col().update_one(
        {"_id": oid},
        {"$inc": {"download_count": 1}}
    )

    # Audit log
    audit_logs_col().insert_one({
        "action": "file_downloaded",
        "entity": "purchase",
        "entity_id": str(purchase["_id"]),
        "actor_id": str(current_user["_id"]),
        "timestamp": datetime.utcnow(),
    })

    # Generate pre-signed S3 URL (5 min expiry)
    s3 = get_s3_client()
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": project["s3_file_key"]},
        ExpiresIn=settings.SIGNED_URL_EXPIRY_SECONDS,
    )

    return {
        "success": True,
        "data": {
            "download_url": url,
            "expires_in": settings.SIGNED_URL_EXPIRY_SECONDS,
            "downloads_remaining": purchase.get("max_downloads", 5) - purchase["download_count"] - 1,
        },
    }


# ─── Purchase History ─────────────────────────────────────────
@router.get("/purchases")
async def my_purchases(current_user: dict = Depends(get_current_user)):
    docs = list(
        purchases_col()
        .find({"buyer_id": current_user["_id"], "status": "completed"})
        .sort("created_at", -1)
    )
    return {
        "success": True,
        "data": [
            {
                "id": str(d["_id"]),
                "project_id": str(d["project_id"]),
                "amount": d["amount"],
                "download_count": d.get("download_count", 0),
                "max_downloads": d.get("max_downloads", 5),
                "created_at": d["created_at"],
            }
            for d in docs
        ],
    }
