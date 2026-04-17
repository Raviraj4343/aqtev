import express from "express";
import { body } from "express-validator";
import subscriptionController from "../controllers/subscription.controller.js";
import {
  protect,
  requireEmailVerified,
  requireSuperAdmin,
} from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.use(protect, requireEmailVerified);

router.get("/plans", subscriptionController.listPlans);

router.post(
  "/plans",
  requireSuperAdmin,
  body("name").trim().isLength({ min: 2 }).withMessage("Plan name is required"),
  body("amountInr").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  body("durationDays").isInt({ min: 1 }).withMessage("Duration must be at least 1 day"),
  validate,
  subscriptionController.createPlan
);

router.put(
  "/plans/:planId",
  requireSuperAdmin,
  subscriptionController.updatePlan
);

router.patch(
  "/plans/:planId/status",
  requireSuperAdmin,
  body("isActive").isBoolean().withMessage("isActive must be boolean"),
  validate,
  subscriptionController.setPlanStatus
);

router.delete(
  "/plans/:planId",
  requireSuperAdmin,
  subscriptionController.deletePlan
);

router.post(
  "/create-order",
  body("planId").notEmpty().withMessage("planId is required"),
  validate,
  subscriptionController.createOrder
);

router.post(
  "/verify-payment",
  body("planId").notEmpty().withMessage("planId is required"),
  body("razorpayOrderId").notEmpty().withMessage("razorpayOrderId is required"),
  body("razorpayPaymentId").notEmpty().withMessage("razorpayPaymentId is required"),
  body("razorpaySignature").notEmpty().withMessage("razorpaySignature is required"),
  validate,
  subscriptionController.verifyPayment
);

router.get("/revenue", requireSuperAdmin, subscriptionController.getRevenue);

export default router;
