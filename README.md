# FitCek

FitCek is a full-stack health tracking platform focused on practical daily use: nutrition logging, weight progress, community posts, AI-backed insights, and premium subscriptions.

![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=white)
![Build Tool](https://img.shields.io/badge/Build-Vite-646CFF?logo=vite&logoColor=white)
![Backend](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js&logoColor=white)
![Framework](https://img.shields.io/badge/Framework-Express-000000?logo=express&logoColor=white)
![Database](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb&logoColor=white)
![Payments](https://img.shields.io/badge/Payments-Razorpay-0C2451)
![Security](https://img.shields.io/badge/Security-Helmet%2BRateLimit%2BHPP%2BMongoSanitize-2E7D32)
![Auth](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)
![Realtime](https://img.shields.io/badge/Realtime-Socket.IO-010101?logo=socket.io&logoColor=white)
![ODM](https://img.shields.io/badge/ODM-Mongoose-880000?logo=mongoose&logoColor=white)
![AI](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google&logoColor=white)
![Email](https://img.shields.io/badge/Email-Brevo-0B996E)
![Media](https://img.shields.io/badge/Media-Cloudinary-3448C5?logo=cloudinary&logoColor=white)
![Mobile](https://img.shields.io/badge/Mobile-Capacitor-119EFF?logo=capacitor&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Android-3DDC84?logo=android&logoColor=white)
![Frontend%20Hosting](https://img.shields.io/badge/Frontend%20Hosting-Vercel-000000?logo=vercel&logoColor=white)
![Backend%20Hosting](https://img.shields.io/badge/Backend%20Hosting-Render-46E3B7)

## Live URLs

- Frontend: https://fitcek.vercel.com
- Backend: https://fitcek.onrender.com

## Download Android APK

Download the latest Android build here:

- [FitCek APK](Frontend/android/app/build/outputs/apk/debug/Fitcek%20v2.1.0.apk)

If Android blocks the installation, allow installs from unknown sources for the browser or file manager you used to download the APK, then open it again.

## Core Capabilities

- Authentication and account lifecycle
  - Signup, login, refresh token flow, email verification, forgot/reset password
- Health tracking
  - Daily log with calories, macros, meals, water, sleep, steps, vitals
  - Weight tracking and trend summaries
- Community module
  - Create posts with images, likes, comments, views
  - Image lightbox and mobile image navigation
  - Author mini-profiles and public profile page
- Premium subscriptions
  - Razorpay order creation and payment verification
  - Webhook handling with signature validation and idempotency
  - Billing history and subscription state updates
- Super-admin control
  - Plan management (create, update, activate/deactivate, delete/deactivate fallback)
  - Revenue view and payment monitoring
  - Moderation actions for community content

## Security Highlights

- JWT-based authenticated APIs
- Password hashing with bcrypt
- Helmet hardening
- CORS allowlist controls for production
- Express rate limiting
  - Global limiter for API abuse protection
  - Focused auth limiter for brute-force resistance
  - Focused payment limiter for repeated payment endpoint abuse
- Express Mongo sanitize middleware to strip MongoDB operators from incoming payloads
- HPP middleware to mitigate HTTP parameter pollution
- Razorpay signature verification for both checkout verification and webhooks

## Repository Structure

```text
.
├── Backend/   # Express API, MongoDB models, auth, subscriptions, community
└── Frontend/  # React + Vite web app (and Capacitor Android build assets)
```

## Tech Stack

- Frontend: React 18, Vite, React Router
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- Payments: Razorpay
- Email: Brevo
- Media: Cloudinary
- AI: Google Gemini
- Mobile Packaging: Capacitor (Android)

## Quick Start

### 1. Install dependencies

```bash
git clone https://github.com/Raviraj4343/fitcek.git
cd fitcek

cd Backend
npm install

cd ../Frontend
npm install
```

### 2. Configure environment variables

Create Backend/.env:

```env
NODE_ENV=development
PORT=8000

MONGODB_URI=mongodb://127.0.0.1:27017/fitcek

ACCESS_TOKEN_SECRET=change-me-access
REFRESH_TOKEN_SECRET=change-me-refresh
EMAIL_VERIFY_SECRET=change-me-email-verify

ACCESS_TOKEN_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION=7d
EMAIL_VERIFICATION_EXPIRE_TIME=24h

BREVO_API_KEY=your_brevo_api_key
SENDER_EMAIL=verified-sender@example.com
SENDER_NAME=FitCek

CLIENT_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

GEMINI_API_KEY=
HEALTH_MODEL=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

SUPER_ADMIN_EMAIL=super-admin@example.com
SUPER_ADMIN_PASSWORD=change-me-super-admin
SUPER_ADMIN_NAME=Super Admin
```

Create Frontend/.env:

```env
VITE_API_BASE_DEV=http://localhost:8000/api/v1
VITE_API_BASE_PROD=https://fitcek.onrender.com/api/v1
```

### 3. Run locally

Backend:

```bash
cd Backend
npm run dev
```

Frontend:

```bash
cd Frontend
npm run dev
```

## Testing and Validation

Backend payment verification tests:

```bash
cd Backend
npm run test:payments
```

This test validates receipt generation and Razorpay signature verification logic used by payment and webhook flows.

## API Base Path

All backend routes are mounted under:

```text
/api/v1
```

Key modules:

- /api/v1/auth
- /api/v1/user
- /api/v1/food
- /api/v1/daily-log
- /api/v1/weight
- /api/v1/posts
- /api/v1/subscriptions
- /api/v1/insight

## Operational Notes

- The frontend route /posts and /community currently map to the same community page.
- Payment endpoints are protected by authentication, email verification, validation, and rate limiting.
- Public profile endpoint exposes only basic non-sensitive fields for community viewing.

## Documentation by Module

- Backend details: [Backend/README.md](Backend/README.md)
- Frontend details: [Frontend/README.md](Frontend/README.md)

## License

ISC

## Author

Ravi Raj

- LinkedIn: https://www.linkedin.com/in/ravi-r-318b55247/
- GitHub: https://github.com/Raviraj4343
