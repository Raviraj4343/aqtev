Frontend (Vite + React)

Quick start:

1. Install dependencies

```bash
cd Frontend
npm install
```

2. Run dev server

```bash
npm run dev
```

The dev server runs at http://localhost:3000 by default.

Notes:
- Uses Inter font and a soft neutral palette with teal accent.
- Layout: fixed sidebar + top navbar, rounded components, subtle shadows.

API environment setup
---------------------

Set frontend API URLs using Vite environment variables.

For local development (`Frontend/.env`):

```env
VITE_API_BASE_DEV=http://localhost:8000/api/v1
VITE_API_BASE_PROD=https://fitcek.onrender.com/api/v1
```

For Vercel production environment variables:

```env
VITE_API_BASE_PROD=https://fitcek.onrender.com/api/v1
```

Optional override:

```env
VITE_API_BASE=https://your-api-domain/api/v1
```

Behavior summary:
- Browser on localhost/IP uses `VITE_API_BASE_DEV`.
- Production web uses `VITE_API_BASE_PROD`.
- Native APK builds default to `VITE_API_BASE_PROD` (avoids local HTTP network failures on mobile).
