import crypto from "crypto";
import Razorpay from "razorpay";
import asyncHandler from "../utils/AsyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import SubscriptionPlan from "../models/subscriptionPlan.model.js";
import SubscriptionPayment from "../models/subscriptionPayment.model.js";
import WebhookEvent from "../models/webhookEvent.model.js";
import User from "../models/user.model.js";
import {
  buildReceiptId,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "../utils/paymentVerification.js";

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

const toValidDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const applyPaidSubscription = async ({
  payment,
  razorpayPaymentId,
  razorpaySignature = null,
  paidAt = new Date(),
}) => {
  if (!payment) return null;

  const normalizedPaidAt = toValidDate(paidAt);
  const plan = await SubscriptionPlan.findById(payment.plan);
  if (!plan) {
    throw new ApiError(404, "Subscription plan referenced by payment was not found.");
  }

  if (payment.status !== "paid") {
    payment.status = "paid";
    payment.razorpayPaymentId = razorpayPaymentId || payment.razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature || payment.razorpaySignature;
    payment.paidAt = normalizedPaidAt;
    await payment.save({ validateBeforeSave: false });
  }

  const expiresAt = new Date(
    normalizedPaidAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000
  );

  await User.findByIdAndUpdate(payment.user, {
    subscriptionStatus: "active",
    subscriptionPlanId: plan._id,
    subscriptionPlanName: plan.name,
    subscriptionStartsAt: normalizedPaidAt,
    subscriptionExpiresAt: expiresAt,
    subscriptionAmountPaise: plan.amountPaise,
    subscriptionCurrency: plan.currency || "INR",
  });

  return payment;
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

const updatePlan = asyncHandler(async (req, res) => {
  const planId = String(req.params.planId || "").trim();
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) throw new ApiError(404, "Subscription plan not found.");

  const next = {};

  if (req.body?.name !== undefined) {
    const name = String(req.body.name || "").trim();
    if (name.length < 2) throw new ApiError(400, "Plan name must be at least 2 characters long.");
    next.name = name;
  }

  if (req.body?.description !== undefined) {
    next.description = String(req.body.description || "").trim();
  }

  if (req.body?.amountInr !== undefined) {
    const amountInr = Number(req.body.amountInr);
    if (!Number.isFinite(amountInr) || amountInr <= 0) {
      throw new ApiError(400, "Plan amount must be greater than zero.");
    }
    next.amountPaise = Math.round(amountInr * 100);
  }

  if (req.body?.durationDays !== undefined) {
    const durationDays = Number(req.body.durationDays);
    if (!Number.isFinite(durationDays) || durationDays < 1) {
      throw new ApiError(400, "Duration must be at least 1 day.");
    }
    next.durationDays = Math.round(durationDays);
  }

  if (req.body?.isActive !== undefined) {
    next.isActive = Boolean(req.body.isActive);
  }

  if (!Object.keys(next).length) {
    throw new ApiError(400, "No valid fields provided for update.");
  }

  const updated = await SubscriptionPlan.findByIdAndUpdate(planId, next, {
    new: true,
    runValidators: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Subscription plan updated successfully."));
});

const setPlanStatus = asyncHandler(async (req, res) => {
  const planId = String(req.params.planId || "").trim();
  const isActive = Boolean(req.body?.isActive);

  const plan = await SubscriptionPlan.findByIdAndUpdate(
    planId,
    { isActive },
    { new: true, runValidators: true }
  );

  if (!plan) throw new ApiError(404, "Subscription plan not found.");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        plan,
        isActive
          ? "Subscription plan activated successfully."
          : "Subscription plan deactivated successfully."
      )
    );
});

const deletePlan = asyncHandler(async (req, res) => {
  const planId = String(req.params.planId || "").trim();
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) throw new ApiError(404, "Subscription plan not found.");

  const paidCount = await SubscriptionPayment.countDocuments({
    plan: plan._id,
    status: "paid",
  });

  if (paidCount > 0) {
    plan.isActive = false;
    await plan.save({ validateBeforeSave: false });
    return res.status(200).json(
      new ApiResponse(
        200,
        { plan, softDeleted: true },
        "Plan has historical payments, so it was deactivated instead of deleted."
      )
    );
  }

  await SubscriptionPlan.deleteOne({ _id: plan._id });

  return res
    .status(200)
    .json(new ApiResponse(200, { planId }, "Subscription plan deleted successfully."));
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
  const receipt = buildReceiptId(user._id);

  let order;
  try {
    order = await client.orders.create({
      amount: plan.amountPaise,
      currency: plan.currency || "INR",
      receipt,
      notes: {
        userId: String(user._id),
        planId: String(plan._id),
        planName: plan.name,
      },
    });
  } catch (err) {
    const upstreamMessage =
      err?.error?.description ||
      err?.description ||
      err?.message ||
      "Unable to create Razorpay order.";
    throw new ApiError(502, `Razorpay order creation failed: ${upstreamMessage}`);
  }

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
  const signatureValid = verifyRazorpayPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    keySecret,
  });

  if (!signatureValid) {
    payment.status = "failed";
    await payment.save({ validateBeforeSave: false });
    throw new ApiError(400, "Invalid Razorpay signature.");
  }

  const now = new Date();
  await applyPaidSubscription({
    payment,
    razorpayPaymentId,
    razorpaySignature,
    paidAt: now,
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

const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = String(req.headers["x-razorpay-signature"] || "").trim();
  if (!signature) throw new ApiError(400, "Missing Razorpay webhook signature header.");

  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(JSON.stringify(req.body || {}));

  const { keySecret } = getRazorpayConfig();
  const signatureValid = verifyRazorpayWebhookSignature({
    rawBody,
    razorpaySignature: signature,
    keySecret,
  });

  if (!signatureValid) {
    throw new ApiError(401, "Invalid Razorpay webhook signature.");
  }

  let eventPayload = {};
  try {
    eventPayload = JSON.parse(rawBody.toString("utf8") || "{}");
  } catch {
    throw new ApiError(400, "Invalid Razorpay webhook payload.");
  }

  const eventName = String(eventPayload?.event || "").trim();
  const eventIdFromPayload = String(eventPayload?.id || "").trim();
  const paymentEntity = eventPayload?.payload?.payment?.entity;
  const orderEntity = eventPayload?.payload?.order?.entity;

  const razorpayOrderId = String(
    paymentEntity?.order_id || orderEntity?.id || ""
  ).trim();
  const razorpayPaymentId = String(paymentEntity?.id || "").trim();
  const derivedEventId = [eventName, razorpayOrderId || "na", razorpayPaymentId || "na"]
    .join(":")
    .trim();
  const eventId = eventIdFromPayload || derivedEventId;
  const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const paidAt = paymentEntity?.created_at
    ? new Date(Number(paymentEntity.created_at) * 1000)
    : new Date();

  if (eventId) {
    try {
      await WebhookEvent.create({
        source: "razorpay",
        eventId,
        eventName: eventName || "unknown",
        orderId: razorpayOrderId || null,
        paymentId: razorpayPaymentId || null,
        payloadHash,
      });
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(200).json(
          new ApiResponse(
            200,
            { duplicated: true, event: eventName, eventId },
            "Duplicate webhook ignored."
          )
        );
      }
      throw err;
    }
  }

  if (!razorpayOrderId || !["payment.captured", "order.paid"].includes(eventName)) {
    return res
      .status(200)
      .json(new ApiResponse(200, { ignored: true, event: eventName }, "Webhook ignored."));
  }

  const payment = await SubscriptionPayment.findOne({ razorpayOrderId });
  if (!payment) {
    return res
      .status(200)
      .json(new ApiResponse(200, { ignored: true, event: eventName }, "Order not tracked for subscription."));
  }

  await applyPaidSubscription({
    payment,
    razorpayPaymentId,
    paidAt,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { reconciled: true, event: eventName }, "Webhook reconciled."));
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

const getMyPayments = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const payments = await SubscriptionPayment.find({ user: userId, status: "paid" })
    .populate("plan", "name durationDays")
    .sort({ paidAt: -1, createdAt: -1 })
    .limit(50)
    .lean();

  const items = payments.map((entry) => ({
    _id: entry._id,
    amountPaise: entry.amountPaise,
    currency: entry.currency,
    paidAt: entry.paidAt,
    razorpayOrderId: entry.razorpayOrderId,
    razorpayPaymentId: entry.razorpayPaymentId,
    plan: entry.plan || null,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        payments: items,
      },
      "Billing history fetched successfully."
    )
  );
});

export default {
  listPlans,
  createPlan,
  updatePlan,
  setPlanStatus,
  deletePlan,
  createOrder,
  verifyPayment,
  handleRazorpayWebhook,
  getRevenue,
  getMyPayments,
};
