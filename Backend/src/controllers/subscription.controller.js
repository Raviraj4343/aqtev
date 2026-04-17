import crypto from "crypto";
import Razorpay from "razorpay";
import asyncHandler from "../utils/AsyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import SubscriptionPlan from "../models/subscriptionPlan.model.js";
import SubscriptionPayment from "../models/subscriptionPayment.model.js";
import User from "../models/user.model.js";

const getRazorpayConfig = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new ApiError(500, "Razorpay credentials are missing in server environment.");
  }

  return { keyId, keySecret };
};

const getRazorpayClient = () => {
  const { keyId, keySecret } = getRazorpayConfig();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const hasActiveSubscription = (user) => {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  if (user.subscriptionStatus !== "active") return false;
  if (!user.subscriptionExpiresAt) return true;
  return new Date(user.subscriptionExpiresAt).getTime() > Date.now();
};

const listPlans = asyncHandler(async (req, res) => {
  const includeInactive =
    req.user?.role === "super_admin" && String(req.query.includeInactive || "") === "1";

  const filter = includeInactive ? {} : { isActive: true };
  const plans = await SubscriptionPlan.find(filter).sort({ amountPaise: 1, createdAt: -1 });

  const keyId = process.env.RAZORPAY_KEY_ID || "";

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        plans,
        razorpayKeyId: keyId,
      },
      "Subscription plans fetched successfully."
    )
  );
});

const createPlan = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const description = String(req.body?.description || "").trim();
  const amountInr = Number(req.body?.amountInr);
  const durationDays = Number(req.body?.durationDays);
  const isActive = req.body?.isActive !== undefined ? Boolean(req.body?.isActive) : true;

  if (name.length < 2) {
    throw new ApiError(400, "Plan name must be at least 2 characters long.");
  }

  if (!Number.isFinite(amountInr) || amountInr <= 0) {
    throw new ApiError(400, "Plan amount must be greater than zero.");
  }

  if (!Number.isFinite(durationDays) || durationDays < 1) {
    throw new ApiError(400, "Duration must be at least 1 day.");
  }

  const plan = await SubscriptionPlan.create({
    name,
    description,
    amountPaise: Math.round(amountInr * 100),
    durationDays,
    currency: "INR",
    isActive,
    createdBy: req.user?._id || null,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, plan, "Subscription plan created successfully."));
});

const createOrder = asyncHandler(async (req, res) => {
  const planId = String(req.body?.planId || "").trim();
  if (!planId) throw new ApiError(400, "planId is required.");

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan || !plan.isActive) {
    throw new ApiError(404, "Subscription plan not found or inactive.");
  }

  const user = req.user;
  if (hasActiveSubscription(user)) {
    throw new ApiError(400, "You already have an active premium subscription.");
  }

  const client = getRazorpayClient();
  const receipt = `sub_${String(user._id)}_${Date.now()}`;
  const order = await client.orders.create({
    amount: plan.amountPaise,
    currency: plan.currency || "INR",
    receipt,
    notes: {
      userId: String(user._id),
      planId: String(plan._id),
      planName: plan.name,
    },
  });

  await SubscriptionPayment.create({
    user: user._id,
    plan: plan._id,
    amountPaise: plan.amountPaise,
    currency: plan.currency || "INR",
    status: "created",
    razorpayOrderId: order.id,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        order,
        plan,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      },
      "Razorpay order created successfully."
    )
  );
});

const verifyPayment = asyncHandler(async (req, res) => {
  const planId = String(req.body?.planId || "").trim();
  const razorpayOrderId = String(req.body?.razorpayOrderId || "").trim();
  const razorpayPaymentId = String(req.body?.razorpayPaymentId || "").trim();
  const razorpaySignature = String(req.body?.razorpaySignature || "").trim();

  if (!planId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new ApiError(400, "Missing Razorpay payment verification fields.");
  }

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) throw new ApiError(404, "Subscription plan not found.");

  const payment = await SubscriptionPayment.findOne({
    razorpayOrderId,
    user: req.user._id,
    plan: plan._id,
  });
  if (!payment) throw new ApiError(404, "Payment order not found.");

  const { keySecret } = getRazorpayConfig();
  const digest = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (digest !== razorpaySignature) {
    payment.status = "failed";
    await payment.save({ validateBeforeSave: false });
    throw new ApiError(400, "Invalid Razorpay signature.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  payment.status = "paid";
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.paidAt = now;
  await payment.save({ validateBeforeSave: false });

  await User.findByIdAndUpdate(req.user._id, {
    subscriptionStatus: "active",
    subscriptionPlanId: plan._id,
    subscriptionPlanName: plan.name,
    subscriptionStartsAt: now,
    subscriptionExpiresAt: expiresAt,
    subscriptionAmountPaise: plan.amountPaise,
    subscriptionCurrency: plan.currency || "INR",
  });

  const updatedUser = await User.findById(req.user._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: updatedUser,
        payment: {
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          paidAt: now,
        },
      },
      "Subscription activated successfully."
    )
  );
});

const getRevenue = asyncHandler(async (_req, res) => {
  const [summary] = await SubscriptionPayment.aggregate([
    { $match: { status: "paid" } },
    {
      $group: {
        _id: null,
        totalPaidPaise: { $sum: "$amountPaise" },
        paidTransactions: { $sum: 1 },
      },
    },
  ]);

  const recentPayments = await SubscriptionPayment.find({ status: "paid" })
    .populate("user", "name email")
    .populate("plan", "name durationDays")
    .sort({ paidAt: -1 })
    .limit(20);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalPaidPaise: summary?.totalPaidPaise || 0,
        paidTransactions: summary?.paidTransactions || 0,
        recentPayments,
      },
      "Revenue summary fetched successfully."
    )
  );
});

export default {
  listPlans,
  createPlan,
  createOrder,
  verifyPayment,
  getRevenue,
};
