from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
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

# ─── CORS ─────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],   # Strict origin, NOT "*"
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


# ─── Request logging middleware ───────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    log.info(
        "request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
    )
    return response
