from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─── Enums ───────────────────────────────────────────────────
class UserRole(str, Enum):
    user = "user"
    admin = "admin"


class ProjectStatus(str, Enum):
    draft = "draft"
    published = "published"


class PurchaseStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"
    disputed = "disputed"


class RefundStatus(str, Enum):
    none = "none"
    requested = "requested"
    approved = "approved"
    processed = "processed"


class TransactionType(str, Enum):
    credit = "credit"
    debit = "debit"


class WithdrawalStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


# ─── User Schemas ─────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class SendOTPRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str
    name: Optional[str] = None


class FirebaseLoginRequest(BaseModel):
    token: str
    name: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=60)
    bio: Optional[str] = Field(None, max_length=500)
    skills: Optional[List[str]] = None
    github_url: Optional[str] = None


class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    bio: Optional[str] = None
    skills: List[str] = []
    github_url: Optional[str] = None
    profile_image: Optional[str] = None
    role: UserRole
    email_verified: bool
    total_earnings: int  # paise
    withdrawable_balance: int  # paise
    created_at: datetime


# ─── Project Schemas ──────────────────────────────────────────
class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    description: str = Field(..., min_length=20, max_length=5000)
    tech_stack: List[str] = Field(..., min_items=1, max_items=20)
    category: str = Field(..., max_length=50)
    license: str = Field(default="MIT", max_length=50)
    price: int = Field(..., ge=0)  # paise; 0 = free
    s3_file_key: str  # Cloudinary public_id
    file_url: str = ""  # Cloudinary secure URL
    live_url: str = ""  # Live demo link
    github_url: str = ""  # GitHub repo link
    image_urls: List[str] = []  # Cloudinary image URLs


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=120)
    description: Optional[str] = Field(None, min_length=20, max_length=5000)
    tech_stack: Optional[List[str]] = None
    category: Optional[str] = None
    license: Optional[str] = None
    price: Optional[int] = Field(None, ge=0)
    live_url: Optional[str] = None
    github_url: Optional[str] = None
    image_urls: Optional[List[str]] = None


class ProjectPublic(BaseModel):
    id: str
    user_id: str
    title: str
    description: str
    tech_stack: List[str]
    category: str
    license: str
    price: int  # paise
    image_urls: List[str] = []
    total_sales: int
    average_rating: float
    rating_count: int
    like_count: int
    is_published: bool
    created_at: datetime
    updated_at: datetime
    # NOTE: s3_file_key is NEVER included here


# ─── Payment Schemas ──────────────────────────────────────────
class CreateOrderRequest(BaseModel):
    project_id: str


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


class CommissionBreakdown(BaseModel):
    buyer_pays_paise: int
    razorpay_fee_paise: int
    platform_fee_paise: int
    creator_amount_paise: int


# ─── Social Schemas ───────────────────────────────────────────
class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=1000)


class RatingCreate(BaseModel):
    score: int = Field(..., ge=1, le=5)
    review: Optional[str] = Field(None, max_length=2000)


# ─── Withdrawal Schemas ───────────────────────────────────────
class WithdrawalRequest(BaseModel):
    amount: int = Field(..., gt=0)  # paise
    upi_id: str = Field(..., min_length=5, max_length=100)


# ─── Standard API Response ────────────────────────────────────
class APIResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    meta: Optional[dict] = None
    error: Optional[str] = None
