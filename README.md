# DevMarket 🚀

> A developer marketplace to sell source code, build followers, and earn revenue.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend  | FastAPI (Python), JWT Auth |
| Database | MongoDB Atlas |
| Storage  | AWS S3 (ZIP files), Cloudinary (Images) |
| Payments | Razorpay |
| Deploy   | Vercel (FE) + Railway (BE) |

## Project Structure

```
├── backend/          # FastAPI Python backend
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── auth.py
│   │   ├── schemas.py
│   │   ├── commission.py
│   │   └── routers/
│   │       ├── auth.py
│   │       ├── projects.py
│   │       ├── payments.py
│   │       ├── users.py
│   │       └── social.py
│   └── requirements.txt
│
└── frontend/         # Next.js frontend
    ├── app/
    │   ├── page.tsx            # Landing page
    │   ├── marketplace/        # Browse projects
    │   ├── projects/[id]/      # Project detail + buy
    │   ├── profile/[id]/       # User profile
    │   ├── dashboard/          # Earnings + purchases
    │   ├── upload/             # Upload project
    │   └── auth/               # Login + Register
    ├── components/
    │   ├── Navbar.tsx
    │   └── ProjectCard.tsx
    └── lib/
        ├── api.ts              # Typed API client
        └── auth-context.tsx    # Auth state management
```

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # Fill in your credentials
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local   # Fill in your credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Key Features

- 🔐 **Auth** — JWT with refresh tokens + token version global logout
- 🛒 **Marketplace** — Browse, search, filter by tech stack
- 💳 **Payments** — Razorpay with dual-verify (client + webhook)
- 📦 **Secure Downloads** — S3 pre-signed URLs, download limits
- 👥 **Social** — Follow, like, comment, rate
- 💰 **Earnings** — Commission breakdown, UPI withdrawal
- 🛡️ **Fraud Prevention** — Self-purchase block, idempotent webhooks

## Commission

```
Buyer pays ₹100
Razorpay fee (-2%): -₹2
Platform fee (-10%): -₹9.80
You receive: ₹88.20
```
