# 🏋️ FitCek – Smart Health Tracking Platform

FitCek is a full-stack health tracking application that helps users monitor daily nutrition, weight, and lifestyle habits with AI-powered insights and personalized recommendations.

It provides real-time tracking, intelligent suggestions, and a clean user experience designed for long-term health improvement.

---

## 🌐 Live Demo

* 🔗 Frontend: https://fitcek.vercel.com
* 🔗 Backend: https://fitcek.onrender.com


---

## ✨ Features

* 🔐 JWT-based User Authentication (Login/Signup)
* 🍽️ Daily calorie & nutrition tracking
* ⚖️ Weight progress monitoring
* 🔍 Food search (Indian-focused dataset)
* 🧠 AI-powered health insights (Google Gemini)
* 📧 Email verification & password reset (Brevo)
* 🖼️ Avatar upload support (Cloudinary)
* 📊 Clean dashboard with user stats

---

## 🏗️ Monorepo Structure

```
.
├── Backend/    # Express API, MongoDB, Auth, Insights
└── Frontend/   # React + Vite Web App
```

---

## ⚙️ Tech Stack

* **Frontend:** React 18, Vite, React Router
* **Backend:** Node.js, Express, Mongoose, JWT
* **Database:** MongoDB
* **Realtime:** Socket.IO
* **Email:** Brevo
* **AI Integration:** Google Gemini

---

## 🚀 Quick Start

### 1. Clone and install dependencies

```bash
git clone <your-repo-url> fitcek
cd fitcek

cd Backend
npm install
cd ../Frontend
npm install
cd ..
```

---

### 2. Configure environment variables

Create `Backend/.env`:

```env
NODE_ENV=development
PORT=8000

MONGODB_URI=mongodb://127.0.0.1:27017/healthtracker

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

# Optional
GEMINI_API_KEY=
HEALTH_MODEL=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

Create `Frontend/.env`:

```env
VITE_API_BASE_DEV=http://localhost:8000/api/v1
VITE_API_BASE_PROD=https://fitcek.onrender.com/api/v1
```

---

### 3. Run backend and frontend

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

---

## 🔗 API Base Path

All backend routes are mounted under:

```
/api/v1
```

Examples:

* `/api/v1/auth`
* `/api/v1/user`
* `/api/v1/food`
* `/api/v1/daily-log`
* `/api/v1/weight`
* `/api/v1/insight`

---

## 🔐 Security

* Passwords hashed using bcrypt
* JWT-based authentication
* Secure environment variables
* CORS protection in production

---

## 🚀 Deployment Checklist

* Set `NODE_ENV=production`
* Configure MongoDB Atlas connection string
* Add JWT secrets and Brevo API key
* Set correct `CORS_ORIGIN`
* Use HTTPS URLs for frontend & backend

---

## 🧠 Motivation

This project was built to solve real-world health tracking problems by combining structured data tracking with AI-driven insights.

---

## 📸 Screenshots

<img width="1276" height="857" alt="image" src="https://github.com/user-attachments/assets/6b008519-6046-4dbe-a374-65419e6356ac" />
<img width="1203" height="864" alt="image" src="https://github.com/user-attachments/assets/d12534e0-1035-44a9-ab77-427c7883b755" />

<img width="1196" height="866" alt="image" src="https://github.com/user-attachments/assets/1d78ac66-7842-44e3-a3da-d9363b7ab600" />



---

## 📄 License

ISC
