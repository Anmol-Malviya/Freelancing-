1. Project Overview

DevMarket is a developer-focused social platform where users can:

Showcase projects

Sell source code

Build followers

Earn revenue

2. MVP Goal

Deliver a working version with:

Authentication

Project upload

Secure file selling

Payment integration

Earnings dashboard

No advanced AI or scaling features in MVP.

3. Tech Stack
Frontend

Next.js (App Router)

Tailwind CSS

next-themes (Light/Dark mode)

Backend

FastAPI (Python)

JWT Authentication

Database

MongoDB Atlas

Storage

AWS S3 (ZIP files)

Cloudinary (Images)

Payments

Razorpay

Deployment

Frontend → Vercel

Backend → Render

DB → MongoDB Atlas

4. Core Features (MVP Scope)
1. Authentication

Register

Login

JWT token

Protected routes

2. Profile System

Name

Bio

Skills

GitHub link

Profile image

3. Project Management

Create project

Edit/Delete project

Upload ZIP to S3

Add screenshots

Set price (Free / Paid)

4. Marketplace

Browse projects

Search by tech stack

View project details

5. Payment Flow

Create Razorpay order

Verify payment

Store purchase record

Generate S3 signed URL

6. Earnings Dashboard

Total sales

Total revenue

Commission deducted

Withdraw request (manual for MVP)

5. Commission Logic

Platform commission: 10%

final_amount = project_price
platform_fee = final_amount * 0.10
creator_amount = final_amount - platform_fee
6. Security Rules

No public S3 buckets

Signed URLs (5–10 min expiry)

JWT route protection

Payment webhook verification

File access only after verified purchase