1. High-Level Architecture
Client (Next.js)
        ↓
FastAPI Backend
        ↓
MongoDB
        ↓
AWS S3 (ZIP storage)
        ↓
Razorpay Webhook
2. Component Breakdown
Frontend (Next.js)

Auth pages

Dashboard

Marketplace

Profile page

Theme toggle (Light/Dark)

Backend (FastAPI)

Auth service

Project service

Payment service

Dashboard service

3. Database Schema (MongoDB)
users
{
  _id,
  name,
  email,
  password_hash,
  bio,
  skills: [],
  github_url,
  profile_image,
  followers: [],
  earnings: Number,
  role: "user" | "admin",
  created_at
}
projects
{
  _id,
  user_id,
  title,
  description,
  tech_stack: [],
  price,
  s3_file_key,
  image_urls: [],
  total_sales,
  rating,
  created_at
}
purchases
{
  _id,
  buyer_id,
  project_id,
  amount,
  platform_fee,
  creator_amount,
  razorpay_payment_id,
  status,
  created_at
}
transactions
{
  _id,
  user_id,
  type: "credit" | "debit",
  amount,
  reference_id,
  timestamp
}
4. Payment Flow (Detailed)

User clicks "Buy"

Backend creates Razorpay order

User completes payment

Razorpay sends webhook

Backend verifies signature

Purchase saved in DB

Signed S3 URL generated

User downloads file

5. Security Architecture

JWT auth middleware

Role-based access control

Payment signature verification

Signed URL with expiration

Rate limiting (future phase)

6. Scalability Plan
Phase 1 (MVP)

Single FastAPI instance

MongoDB Atlas

Direct S3 storage

Phase 2 (Growth)

Redis caching

CDN (CloudFront)

Load balancer

Phase 3 (Scale)

Microservices (Auth, Payments, Projects)

Separate analytics service

Queue system for heavy tasks