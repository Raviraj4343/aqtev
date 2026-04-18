import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

// ── Route imports ──────────────────────────────────────
import authRoutes from "./routes/auth.route.js";
import devRoutes from "./routes/dev.route.js";
import userRoutes from "./routes/user.route.js";
import foodRoutes from "./routes/food.route.js";
import dailyLogRoutes from "./routes/dailyLog.route.js";
import weightLogRoutes from "./routes/weightLog.route.js";
import insightRoutes from "./routes/insight.route.js";
import postRoutes from "./routes/post.route.js";
import subscriptionRoutes from "./routes/subscription.route.js";
import subscriptionController from "./controllers/subscription.controller.js";

const API = "/api/v1";

const app = express();

// Trust reverse proxy headers on hosted platforms (Render, Vercel, etc.).
app.set("trust proxy", 1);

const normalizeOrigin = (value = "") => value.trim().replace(/\/$/, "");

const configuredOrigins = new Set(
  (process.env.CORS_ORIGIN || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean)
);

[
  "http://localhost",
  "https://localhost",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://fitcek.vercel.app",
].forEach((origin) => configuredOrigins.add(origin));

const isAllowedOrigin = (origin) => {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return true;
  if (configuredOrigins.has(normalized)) return true;

  try {
    const { hostname, protocol } = new URL(normalized);
    if (
      protocol === "https:" &&
      (hostname === "vercel.app" || hostname.endsWith(".vercel.app"))
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

// ── Security middlewares ───────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: (origin, cb) => {
      // In development allow any origin to avoid preflight blocking for local dev
      if (process.env.NODE_ENV !== "production") return cb(null, true);
      // Allow requests with no origin (curl, mobile)
      if (!origin) return cb(null, true);
      const ok = isAllowedOrigin(origin);
      return cb(ok ? null : new Error(`Not allowed by CORS: ${origin}`), ok);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Compress JSON/text responses for faster delivery on production networks.
app.use(compression());

// Note: global CORS middleware above handles preflight requests

// ── Rate limiting ──────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// Razorpay webhook must read raw body for signature verification.
app.post(
  `${API}/subscriptions/webhook/razorpay`,
  express.raw({ type: "application/json" }),
  subscriptionController.handleRazorpayWebhook
);

// ── Body / cookie parsers ──────────────────────────────
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
// express-mongo-sanitize's built-in middleware reassigns req.query (Express 4 style),
// so use the package sanitizer directly for Express 5 compatibility.
app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    mongoSanitize.sanitize(req.body);
  }

  if (req.params && typeof req.params === "object") {
    mongoSanitize.sanitize(req.params);
  }

  if (req.query && typeof req.query === "object") {
    mongoSanitize.sanitize(req.query);
  }

  next();
});
app.use(hpp());

// ── Logging ────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ── Static files ───────────────────────────────────────
app.use(express.static("public"));

// ── Health check ──────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "🏃 Health Tracker is running",
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ─────────────────────────────────────────
// Keep route-level auth limiting only on sensitive endpoints (e.g. login).
// Limiting the whole /auth group can block /auth/me and /auth/refresh-token,
// which breaks session bootstrap on deployed clients.
app.use(`${API}/auth`, authRoutes);
// Dev-only helpers
app.use(`${API}/dev`, devRoutes);
// Apply global limiter to all non-auth routes (avoid throttling auth endpoints like /me during development)
app.use(globalLimiter);

app.use(`${API}/user`, userRoutes);
app.use(`${API}/food`, foodRoutes);
app.use(`${API}/daily-log`, dailyLogRoutes);
// Backwards-compatible alias used by the frontend (camelCase)
app.use(`${API}/dailyLog`, dailyLogRoutes);
app.use(`${API}/weight`, weightLogRoutes);
// Backwards-compatible alias used by the frontend (camelCase)
app.use(`${API}/weightLog`, weightLogRoutes);
app.use(`${API}/insight`, insightRoutes);
app.use(`${API}/posts`, postRoutes);
app.use(`${API}/subscriptions`, subscriptionRoutes);

// ── 404 + error handler ────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
