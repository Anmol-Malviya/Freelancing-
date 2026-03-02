from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "DevMarket"
    APP_ENV: str = "development"
    APP_VERSION: str = "1.0.0"
    FRONTEND_URL: str = "http://localhost:3000"

    # MongoDB
    MONGO_URI: str
    MONGO_DB_NAME: str = "devmarket"

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"
    S3_BUCKET_NAME: str = "devmarket-files"

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # Email
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@devmarket.com"

    # Platform Config
    PLATFORM_COMMISSION_RATE: float = 0.10
    RAZORPAY_FEE_RATE: float = 0.02
    MAX_DOWNLOADS_PER_PURCHASE: int = 5
    SIGNED_URL_EXPIRY_SECONDS: int = 300
    ZIP_MAX_SIZE_MB: int = 100

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
