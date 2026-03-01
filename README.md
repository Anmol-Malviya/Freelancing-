<div align="center">
  
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/NextJS-Dark.svg" height="50" alt="Next.js" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Python-Dark.svg" height="50" alt="FastAPI" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/MongoDB.svg" height="50" alt="MongoDB" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/TailwindCSS-Dark.svg" height="50" alt="Tailwind CSS" />
  
  <br/>
  
  <h1>🚀 DevMarket</h1>

  <p>
    <b>A premium developer marketplace to sell source code, build followers, and earn revenue.</b>
  </p>

  <p>
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-features">Features</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-project-structure">Project Structure</a>
  </p>

</div>

<hr />

## ✨ Features

<table width="100%">
  <tr>
    <td width="50%">
      <h3>🛒 Dynamic Marketplace</h3>
      <p>Seamlessly browse, search, and filter premium developer projects by specific tech stacks.</p>
    </td>
    <td width="50%">
      <h3>💳 Secure Payments</h3>
      <p>Integrated <b>Razorpay</b> gateway with foolproof dual-verification (client + webhook idempotency).</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>📦 Protected Downloads</h3>
      <p>Highly secure artifact delivery via <b>AWS S3</b> pre-signed URLs with strict download limits.</p>
    </td>
    <td>
      <h3>👥 Social Ecosystem</h3>
      <p>Build a community! Follow favorite creators, drop likes, and engage through comments and ratings.</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>🔐 Bulletproof Auth</h3>
      <p>JWT-based authentication using refresh tokens and token versioning for global logouts.</p>
    </td>
    <td>
      <h3>💰 Creator Earnings</h3>
      <p>Clear analytics dashboard featuring commission breakdowns and rapid UPI withdrawals.</p>
    </td>
  </tr>
</table>

## 🛠️ Tech Stack

<div align="center">

| Layer | Tools & Technologies |
| :--- | :--- |
| 🌐 **Frontend** | **Next.js 14** (App Router), TypeScript, Tailwind CSS |
| ⚙️ **Backend**  | **FastAPI** (Python), JWT Auth |
| 🗄️ **Database** | **MongoDB Atlas** |
| ☁️ **Storage**  | **AWS S3** (Secure ZIPs), **Cloudinary** (Optimized Images) |
| 💳 **Payments** | **Razorpay** |
| 🚀 **Deploy**   | **Vercel** (Frontend) + **Railway** (Backend) |

</div>

<hr />

## 🚀 Quick Start

### ⚙️ Backend Setup (FastAPI)

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a Virtual Environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Environment Variables
cp .env.example .env         # Make sure to fill in your API keys!

# 5. Start the Server
uvicorn app.main:app --reload --port 8000
```

### 💻 Frontend Setup (Next.js)

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Environment Variables
cp .env.local.example .env.local   # Fill in your variables!

# 4. Start the Development Server
npm run dev
```

> **UI Available at**: [http://localhost:3000](http://localhost:3000) <br/>
> **API Docs Available at**: [http://localhost:8000/docs](http://localhost:8000/docs)

<hr />

## 📂 Project Structure

<details>
<summary><b>Click to expand Directory Tree</b></summary>

```text
├── backend/                  # FastAPI Python Application
│   ├── app/
│   │   ├── main.py           # Application Entrypoint
│   │   ├── config.py         # App Configuration
│   │   ├── database.py       # MongoDB Connection
│   │   ├── auth.py           # JWT Security
│   │   ├── schemas.py        # Pydantic Models
│   │   ├── commission.py     # Revenue Logic
│   │   └── routers/
│   │       ├── auth.py
│   │       ├── projects.py
│   │       ├── payments.py
│   │       ├── users.py
│   │       └── social.py
│   └── requirements.txt
│
└── frontend/                 # Next.js 14 Frontend UI
    ├── app/
    │   ├── page.tsx          # Landing Page
    │   ├── marketplace/      # Explore Projects
    │   ├── projects/[id]/    # Project Details & Checkout
    │   ├── profile/[id]/     # Developer Profiles
    │   ├── dashboard/        # Earnings & User Dashboard
    │   ├── upload/           # Project Upload Wizard
    │   └── auth/             # Login & Registration
    ├── components/
    │   ├── Navbar.tsx
    │   └── ProjectCard.tsx
    └── lib/
        ├── api.ts            # Strongly Typed API Client
        └── auth-context.tsx  # Auth Provider
```
</details>

<hr />

## 💸 Commission Structure

Transparency is key. We deduct simple platform and payment processing fees directly at the source.

<div align="center">

| Transaction Breakdown | Amount |
| :--- | :--- |
| 🛒 **Buyer Pays** | `₹100.00` |
| 💳 Razorpay Fee (approx 2%) | `- ₹2.00` |
| 🏢 Platform Fee (10%) | `- ₹9.80` |
| 🎯 **You Receive** | `₹88.20` |

</div>

<br/>

<div align="center">
  <i>Built with ❤️ for Developers</i>
</div>
