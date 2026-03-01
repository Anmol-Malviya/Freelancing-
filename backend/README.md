# DevMarket Backend

FastAPI backend for the DevMarket developer marketplace.

## Quick Start

```bash
cd backend

# 1. Create virtual environment
python -m venv venv

# 2. Activate (Windows)
venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy and configure env
copy .env.example .env
# Edit .env with your credentials

# 5. Run development server
uvicorn app.main:app --reload --port 8000
```

## API Docs
Open http://localhost:8000/docs (only available in development mode)

## Project Structure

```
backend/
├── app/
│   ├── main.py          # FastAPI app entrypoint
│   ├── config.py        # Settings from .env
│   ├── database.py      # MongoDB connection + indexes
│   ├── auth.py          # JWT + password hashing
│   ├── schemas.py       # Pydantic request/response models
│   ├── commission.py    # Commission calculation (Decimal, no floats)
│   └── routers/
│       ├── auth.py      # Register, Login, Logout, Refresh
│       ├── projects.py  # CRUD + search + soft-delete
│       ├── payments.py  # Orders, verify, webhook, download
│       ├── users.py     # Profile, follow, earnings, withdraw
│       └── social.py    # Ratings, comments, likes
├── requirements.txt
├── .env                 # ← Never commit this
└── .env.example         # Safe to commit
```

## Key Design Decisions

| Decision | Reason |
|---|---|
| All money in **paise** (Integer) | No floating point errors on currency |
| Webhook **idempotency** via `processed_webhooks` | Razorpay retries webhooks — prevents double-credit |
| **Soft delete** on projects | Preserves purchase history after deletion |
| `s3_file_key` never in API responses | Security — private file key excluded via projection |
| **Atomic $inc** on earnings | No race condition on concurrent purchases |
| `follows` as separate collection | Prevents 16MB document limit on popular users |
| **Token version** on users | Allows instant global session invalidation |
| Self-purchase prevention | Anti-fraud: buyer_id != seller_id check |

## ⚠️ Before Production

- [ ] Set real `JWT_SECRET_KEY` (64+ random chars)
- [ ] Configure AWS S3 with proper IAM policy
- [ ] Set up Razorpay webhook secret
- [ ] Add email service (Resend/SendGrid)
- [ ] Restrict CORS to your actual domain
- [ ] Rotate MongoDB password (visible in this repo)
- [ ] Deploy on Railway (not Render free tier — webhooks need always-on)
