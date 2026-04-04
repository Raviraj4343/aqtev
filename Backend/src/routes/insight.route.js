import express from "express";
import {
  getTodayInsight,
  getWeeklySummary,
  getActionPlan,
  getLiveSuggestion,
} from "../controllers/insight.controller.js";
import {
  protect,
  requireEmailVerified,
  requireProfileComplete,
} from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(protect, requireEmailVerified, requireProfileComplete);

router.get("/today", getTodayInsight);
router.get("/summary", getWeeklySummary);
router.post("/action-plan", getActionPlan);
router.post("/live-suggestion", getLiveSuggestion);

export default router;
