# XperienceWave LMS

A Learning Management System for managing programs, learners, and video content.

## 🏗️ Project Structure

```
lms-project/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── routes/         # API route definitions
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # Auth, validation
│   │   ├── utils/          # Helpers (email, upload, etc.)
│   │   └── config/         # Configuration
│   ├── prisma/             # Database schema & migrations
│   └── package.json
│
├── frontend/               # Next.js 14 App
│   ├── app/               # App router pages
│   │   ├── auth/          # Login, password setup
│   │   ├── admin/         # Admin dashboard & pages
│   │   └── learner/       # Learner portal
│   ├── components/        # Reusable components
│   ├── lib/               # Utilities & API client
│   └── package.json
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn
- PostgreSQL database (Railway - already set up)

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

Fill in your environment variables (from Railway, Bunny, R2, Resend).

Run database migrations:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

Seed admin user:
```bash
npm run seed
```

Start development server:
```bash
npm run dev
```

Backend runs at: `http://localhost:3001`

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local`:
```bash
cp .env.example .env.local
```

Start development server:
```bash
npm run dev
```

Frontend runs at: `http://localhost:3000`

## 🔑 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
ADMIN_EMAIL=admin@xperiencewave.com
ADMIN_PASSWORD=your-admin-password

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=xperiencewave-lms
R2_PUBLIC_URL=

# Bunny.net
BUNNY_LIBRARY_ID=592270
BUNNY_STREAM_API_KEY=
BUNNY_TOKEN_AUTH_KEY=
BUNNY_CDN_HOSTNAME=

# Resend
RESEND_API_KEY=
EMAIL_FROM=noreply@xperiencewave.com

FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_BUNNY_CDN=https://vz-xxxxx.b-cdn.net
```

## 📝 Development with Claude CLI

This project is designed to be built incrementally with Claude CLI. 

### Suggested build order:

1. **Backend Core**
   - Database models (Prisma) ✅ Ready
   - Authentication routes
   - Program CRUD routes
   - Learner management routes

2. **Frontend Auth**
   - Login page
   - Password setup page
   - Auth context/provider

3. **Admin Panel**
   - Dashboard
   - Programs management
   - Learners management
   - Sessions/Calendar

4. **Learner Portal**
   - Home page
   - Program view
   - Lesson player
   - Sessions view

### Example Claude CLI prompts:

```
"Implement the login API endpoint in backend/src/routes/auth.js"

"Create the admin dashboard page showing program stats"

"Build the video player component with progress tracking"
```

## 🗄️ Database Schema

See `backend/prisma/schema.prisma` for complete schema.

Key models:
- User (admin & learners)
- Program
- Topic → Subtopic → Lesson
- Enrollment
- Progress
- Session

## 📚 API Documentation

See `docs/API_SPECIFICATION.md` for complete API reference.

## 🚢 Deployment

### Backend (Railway)
1. Connect GitHub repo to Railway
2. Railway auto-detects Node.js
3. Environment variables already configured

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variables
4. Deploy

## 📄 License

Private - XperienceWave
