# 💰 Wealth Building LLC — Member Platform

A **production-ready, private member-based financial coordination system** built with Next.js 14, Firebase, and Paystack.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| Payments | Paystack |
| State | Zustand |
| PDF | jsPDF + autoTable |
| Charts | Chart.js + react-chartjs-2 |
| Email | Nodemailer (SMTP) |
| WhatsApp | Twilio Sandbox |
| Hosting | Vercel |

---

## 📁 Project Structure

```
wealth-building-llc/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login
│   │   └── signup/page.tsx         # Account creation
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Auth guard + sidebar
│   │   ├── dashboard/page.tsx      # Member dashboard
│   │   ├── pay/page.tsx            # Payment flow
│   │   ├── history/page.tsx        # Transaction history
│   │   ├── statement/page.tsx      # PDF statement
│   │   ├── roadmap/page.tsx        # Milestones
│   │   └── exit/page.tsx           # Exit request
│   ├── admin/page.tsx              # Full admin panel
│   ├── apply/page.tsx              # Public application
│   ├── pending/page.tsx            # Awaiting approval
│   ├── api/
│   │   ├── payments/initiate/      # Start Paystack payment
│   │   ├── payments/verify/        # Verify + store payment
│   │   ├── payments/approve/       # Admin approve/reject
│   │   ├── admin/income/           # Record income
│   │   ├── admin/withdrawals/      # Record withdrawals
│   │   ├── admin/users/            # Manage members
│   │   ├── admin/milestones/       # Roadmap milestones
│   │   └── exit/                   # Exit requests
│   ├── layout.tsx
│   ├── page.tsx                    # Redirects to /login
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── AuthProvider.tsx
│   └── ui/index.tsx                # All shared UI components
├── hooks/
│   ├── useAuth.ts
│   ├── useDashboard.ts
│   └── usePayments.ts
├── lib/
│   ├── firebase.ts                 # Client SDK
│   ├── firebase-admin.ts           # Server SDK (API routes only)
│   ├── firestore.ts                # All DB operations
│   ├── types.ts                    # TypeScript types
│   └── notifications.ts            # Email + WhatsApp
├── store/
│   └── authStore.ts                # Zustand auth state
├── utils/
│   ├── calculations.ts             # Pure business logic
│   └── pdfGenerator.ts             # PDF export
├── firestore.rules                 # Security rules
├── firestore.indexes.json          # Composite indexes
└── firebase.json
```

---

## ⚙️ Setup Guide

### 1. Clone & Install

```bash
git clone <your-repo>
cd wealth-building-llc
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Email/Password
4. Enable **Firestore Database**
5. Go to **Project Settings → Service Accounts** → Generate new private key
6. Copy your web app config

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`:

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (from service account JSON)
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password  # Use Gmail App Password

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MONTHLY_CONTRIBUTION=50000   # In base currency units
NEXT_PUBLIC_CURRENCY_SYMBOL=₦
NEXT_PUBLIC_COMPANY_NAME="Wealth Building LLC"
```

### 4. Deploy Firestore Rules & Indexes

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project
firebase deploy --only firestore
```

### 5. Create First Admin User

1. Start the app: `npm run dev`
2. Go to `/signup` and create an account
3. In Firebase Console → Firestore → `users` collection
4. Find your user document → change `role` to `"admin"` and `isActive` to `true`

### 6. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

---

## 🔐 Security Architecture

- **All financial data** requires Firebase Auth token
- **API routes** verify tokens server-side via Admin SDK
- **Firestore rules** enforce row-level security:
  - Members can only read their own data
  - Only admins can approve/reject payments
  - Only admins can write income and withdrawals
  - Audit logs are write-protected (Admin SDK only)
- **Payment verification** happens server-side via Paystack API
- **No sensitive logic** on the frontend — all approvals go through API routes

---

## 💳 Payment Flow

```
Member selects months → POST /api/payments/initiate
  → Validates month order (no skipping)
  → Calls Paystack Initialize Transaction
  → Returns payment URL

Member completes Paystack payment → Redirected to /pay?verify=REF
  → POST /api/payments/verify
  → Verifies with Paystack server-side
  → Stores payment as "pending"
  → Marks months as "pending"

Admin reviews → POST /api/payments/approve
  → action: "approve" | "reject"
  → On approve: marks months "paid", creates contribution records
  → On reject: reverts months to "unpaid"
```

---

## ⚖️ Business Rules

| Rule | Implementation |
|------|---------------|
| No skipping months | API validates month order before Paystack call |
| Equal shares | `100 / totalActiveMembers` recalculated on join/exit |
| Exit fee | 7.5% deducted from contributions + profit share |
| Net balance | Contributions + Income − Withdrawals |
| Admin approval required | Payments never auto-approve |

---

## 🚀 Deploy to Vercel

```bash
npm run build   # verify build passes
vercel          # or push to GitHub and connect Vercel

# Add all .env.local variables to Vercel Environment Variables
```

---

## 📬 Notifications

### Email (Nodemailer)
- Payment reminders (monthly)
- Payment confirmation
- Approval/rejection notification
- Welcome email on member approval

### WhatsApp (Twilio Sandbox)
- Reminders on 1st, 5th, 10th of month
- Only sent to members with unpaid months

---

## 📊 Net Balance Formula

```
Net Balance = Total Contributions + Total Income − Total Withdrawals
```

Displayed on:
- Member dashboard
- Admin overview
- Financial statements (PDF)

---

## 🔧 Maintenance

### Add a new month for all members (monthly cron):
```
POST /api/admin/users
{ action: "add_months", month: "2025-01" }
```

### Recalculate shares:
```
POST /api/admin/users
{ action: "recalculate_shares" }
```

---

## 📄 License

Private — Wealth Building LLC. All rights reserved.
