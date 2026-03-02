from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

from app.config import settings
from app.database import connect_db, disconnect_db
from app.routers import auth, projects, payments, users, social

# ─── Logging ─────────────────────────────────────────────────
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
log = structlog.get_logger()

# ─── Rate limiter ─────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ─── Lifespan ─────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("startup", app=settings.APP_NAME, env=settings.APP_ENV)
    connect_db()

    # Initialize Cloudinary
    import cloudinary
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    log.info("cloudinary_configured", cloud=settings.CLOUDINARY_CLOUD_NAME)

    # Initialize Firebase Admin SDK
    import firebase_admin
    from firebase_admin import credentials
    import os
    
    cred_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "firebase-service-account.json")
    if os.path.exists(cred_path):
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            log.info("firebase_admin_configured")
        except Exception as e:
            log.error(f"firebase_admin_failed: {e}")
    else:
        log.warning("firebase_admin_missing", message="firebase-service-account.json not found in backend folder. Firebase auth login will fail.")

    yield
    disconnect_db()
    log.info("shutdown")


# ─── App factory ─────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.APP_ENV == "development" else None,
    redoc_url="/redoc" if settings.APP_ENV == "development" else None,
    lifespan=lifespan,
)

# ─── Rate limit error handler ─────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── Request logging middleware (added BEFORE CORS so CORS wraps it) ──
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        log.info(
            "request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
        )
        return response

app.add_middleware(LoggingMiddleware)

# ─── CORS — must be added LAST so it wraps everything ─────────
# Starlette processes add_middleware() in LIFO order, so the last
# middleware added here runs FIRST on incoming requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        settings.FRONTEND_URL.rstrip("/"),
        "http://localhost:3000",
        "https://devmarket-three.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(payments.router)
app.include_router(users.router)
app.include_router(social.router)


# ─── Health check ─────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "env": settings.APP_ENV,
    }
