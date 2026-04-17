export const DB_NAME = "actev";

export const ACTIVITY_LEVELS = {
  SEDENTARY: "sedentary",
  LIGHT: "light",
  MODERATE: "moderate",
  ACTIVE: "active",
};

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export const GOALS = {
  WEIGHT_LOSS: "weight_loss",
  MUSCLE_GAIN: "muscle_gain",
  MAINTAIN: "maintain",
};

export const DIET_PREFERENCES = {
  VEG: "veg",
  NON_VEG: "non_veg",
  MIXED: "mixed",
};

export const GENDER = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
};

export const WATER_LEVELS = {
  LOW: "<1L",
  MODERATE: "1-2L",
  GOOD: "2-3L",
  EXCELLENT: "3L+",
};

export const MEAL_TYPES = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACKS: "snacks",
};

// Environment-backed values
import dotenv from "dotenv";

dotenv.config();

export const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGODB_URL ||
  "mongodb://127.0.0.1:27017";
export const PORT = process.env.PORT || 3000;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  // In production, use secure cookies and SameSite=None for cross-site requests.
  // During local development, allow SameSite=lax so browsers will send cookies from the frontend dev server.
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

export default {
  DB_NAME,
  ACTIVITY_LEVELS,
  ACTIVITY_MULTIPLIERS,
  GOALS,
  DIET_PREFERENCES,
  GENDER,
  WATER_LEVELS,
  MEAL_TYPES,
  COOKIE_OPTIONS,
};

export const POST_IMAGES_UPLOAD_LIMIT = 10;
export const POST_IMAGE_MAX_SIZE = 6 * 1024 * 1024; // 6MB

