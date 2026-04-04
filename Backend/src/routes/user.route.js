import express from "express";
import { body } from "express-validator";
import userController from "../controllers/user.controller.js";
const {
  getProfile,
  setupProfile,
  updateProfile,
  getHealthStats,
  uploadAvatar,
} = userController;
import {
  protect,
  requireEmailVerified,
} from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

// All routes require authentication + verified email
router.use(protect, requireEmailVerified);

// ── Validation chain ──────────────────────────────────

const profileValidation = [
  body("age")
    .isInt({ min: 10, max: 120 })
    .withMessage("Age must be between 10 and 120"),
  body("gender")
    .isIn(["male", "female", "other"])
    .withMessage("Invalid gender"),
  body("heightCm")
    .isFloat({ min: 50, max: 300 })
    .withMessage("Height must be between 50 and 300 cm"),
  body("weightKg")
    .isFloat({ min: 10, max: 500 })
    .withMessage("Weight must be between 10 and 500 kg"),
  body("goal")
    .isIn(["weight_loss", "muscle_gain", "maintain"])
    .withMessage("Invalid goal"),
  body("activityLevel")
    .isIn(["sedentary", "light", "moderate", "active"])
    .withMessage("Invalid activity level"),
  body("dietPreference")
    .isIn(["veg", "non_veg", "mixed"])
    .withMessage("Invalid diet preference"),
];

// ── Routes ──────────────────────────────────────────────
router.get("/profile", getProfile);
router.post("/profile", profileValidation, validate, setupProfile);
router.put("/profile", updateProfile);
router.post("/profile/avatar", uploadAvatar);
router.get("/stats", getHealthStats);

export default router;
