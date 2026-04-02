FitCek Backend
===============

Email delivery
--------------

The backend uses Brevo (Sendinblue) for all transactional email sending. SMTP / nodemailer is no longer used.

Required environment variables (set these in `Backend/.env` or your deployment environment):

- `BREVO_API_KEY` — your Brevo API key
- `SENDER_EMAIL` — a verified sender email configured in your Brevo account
- `SENDER_NAME` — display name for the sender (optional)
- `CLIENT_URL` — frontend URL used in email links (e.g. `http://localhost:3000`)
- `CORS_ORIGIN` — comma-separated list of allowed browser origins in production (e.g. `https://fitcek.vercel.app,https://your-preview.vercel.app`)

Important notes
---------------

- Do not set `SMTP_USER`/`SMTP_PASS` — SMTP is deprecated in this project. If present it will be ignored.
- After changing env vars, restart the backend with `npm run dev` so the new Brevo-based email utility is loaded.
- If you previously installed `nodemailer`, run a fresh install to remove it from `node_modules`:

  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

Local debug endpoints
---------------------

- `GET /api/v1/dev/email-config` — returns `{ BREVO_API_KEY_PRESENT: true/false, SENDER_EMAIL: ... }` in development mode only.

How to test email sending locally
---------------------------------

1. Ensure `BREVO_API_KEY` and `SENDER_EMAIL` are set in `Backend/.env`.
2. Start the backend: `npm run dev`.
3. Trigger a resend (replace email):

```bash
curl -X POST 'http://localhost:8000/api/v1/auth/resend-verification' \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com"}'
```

If Brevo returns an error (401/403/422) the server logs will show the provider error — ensure the API key and sender email are valid in your Brevo dashboard.

Production networking notes
---------------------------

- Use an HTTPS backend URL for production and APK/mobile builds.
- Keep `NODE_ENV=production` in hosted environments so secure cookie/CORS behavior is applied.
- Requests with no `Origin` header (mobile/native/curl) are allowed by backend CORS logic.
- The backend trusts reverse proxy headers for hosted deployments (`trust proxy` enabled).
