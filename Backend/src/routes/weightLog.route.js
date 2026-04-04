import express from "express";
import { body } from "express-validator";
import {
  logWeight,
  getWeightHistory,
  getWeeklySummary,
  deleteWeightLog,
} from "../controllers/weightLog.controller.js";
import {
  protect,
  requireEmailVerified,
  requireProfileComplete,
} from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.use(protect, requireEmailVerified, requireProfileComplete);

const weightValidation = [
  body("weightKg")
    .notEmpty()
    .withMessage("Weight is required")
    .isFloat({ min: 10, max: 500 })
    .withMessage("Weight must be between 10 and 500 kg"),
  body("note")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Note cannot exceed 200 characters"),
];

router.post("/", weightValidation, validate, logWeight);
router.get("/history", getWeightHistory);
router.get("/weekly-summary", getWeeklySummary);
router.delete("/:date", deleteWeightLog);

export default router;
