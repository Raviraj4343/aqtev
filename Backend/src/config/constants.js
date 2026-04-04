import dotenv from "dotenv";

dotenv.config();

export const DB_NAME = process.env.DB_NAME || "healthtracker";
export const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGODB_URL ||
  "mongodb://127.0.0.1:27017";
export const PORT = process.env.PORT || 3000;

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

// TOKEN_EXPIRY intentionally omitted — use environment variables for expirations

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};

export default {
  DB_NAME,
  MONGODB_URI,
  PORT,
  ACTIVITY_LEVELS,
  ACTIVITY_MULTIPLIERS,
  GOALS,
  DIET_PREFERENCES,
  GENDER,
  WATER_LEVELS,
  MEAL_TYPES,
  COOKIE_OPTIONS,
};
