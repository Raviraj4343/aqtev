import crypto from "crypto";

export const buildReceiptId = (userId) => {
  const tail = String(userId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-8) || "usr";
  const stamp = Date.now().toString(36);
  return `sub_${tail}_${stamp}`.slice(0, 40);
};

export const createRazorpayPaymentSignature = (
  razorpayOrderId,
  razorpayPaymentId,
  keySecret
) => {
  const payload = `${String(razorpayOrderId || "").trim()}|${String(
    razorpayPaymentId || ""
  ).trim()}`;
  return crypto.createHmac("sha256", String(keySecret || "")).update(payload).digest("hex");
};

export const verifyRazorpayPaymentSignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  keySecret,
}) => {
  const received = String(razorpaySignature || "").trim();
  if (!received || !keySecret) return false;

  const expected = createRazorpayPaymentSignature(
    razorpayOrderId,
    razorpayPaymentId,
    keySecret
  );

  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
};

export const createRazorpayWebhookSignature = (rawBody, keySecret) => {
  const payload = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(String(rawBody || ""), "utf8");
  return crypto.createHmac("sha256", String(keySecret || "")).update(payload).digest("hex");
};

export const verifyRazorpayWebhookSignature = ({
  rawBody,
  razorpaySignature,
  keySecret,
}) => {
  const received = String(razorpaySignature || "").trim();
  if (!received || !keySecret) return false;

  const expected = createRazorpayWebhookSignature(rawBody, keySecret);
  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
};
