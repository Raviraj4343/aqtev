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
  requirePremium,
} from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(protect, requireEmailVerified, requireProfileComplete);

router.get("/today", getTodayInsight);
router.get("/summary", getWeeklySummary);
router.post("/action-plan", requirePremium, getActionPlan);
router.post("/live-suggestion", requirePremium, getLiveSuggestion);

export default router;
