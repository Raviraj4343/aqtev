import assert from "assert";
import {
  buildReceiptId,
  createRazorpayPaymentSignature,
  verifyRazorpayPaymentSignature,
  createRazorpayWebhookSignature,
  verifyRazorpayWebhookSignature,
} from "../src/utils/paymentVerification.js";

console.log("Running payment verification tests...");

const secret = "test_secret_123";
const orderId = "order_ABC123";
const paymentId = "pay_XYZ789";

const receipt = buildReceiptId("66b2f9f9a59a85d3e42ca123");
assert.ok(receipt.startsWith("sub_"), "Receipt must start with sub_");
assert.ok(receipt.length <= 40, "Receipt must be <= 40 chars");
assert.ok(/^[a-zA-Z0-9_]+$/.test(receipt), "Receipt must be URL-safe");

const validPaymentSignature = createRazorpayPaymentSignature(orderId, paymentId, secret);
assert.strictEqual(validPaymentSignature.length, 64, "Payment signature should be sha256 hex");

assert.strictEqual(
  verifyRazorpayPaymentSignature({
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: validPaymentSignature,
    keySecret: secret,
  }),
  true,
  "Payment signature should verify for valid payload"
);

assert.strictEqual(
  verifyRazorpayPaymentSignature({
    razorpayOrderId: orderId,
    razorpayPaymentId: `${paymentId}_tampered`,
    razorpaySignature: validPaymentSignature,
    keySecret: secret,
  }),
  false,
  "Payment signature should fail for tampered payload"
);

const webhookBody = JSON.stringify({
  event: "payment.captured",
  payload: { payment: { entity: { id: paymentId, order_id: orderId } } },
});

const validWebhookSignature = createRazorpayWebhookSignature(webhookBody, secret);
assert.strictEqual(validWebhookSignature.length, 64, "Webhook signature should be sha256 hex");

assert.strictEqual(
  verifyRazorpayWebhookSignature({
    rawBody: webhookBody,
    razorpaySignature: validWebhookSignature,
    keySecret: secret,
  }),
  true,
  "Webhook signature should verify for string body"
);

assert.strictEqual(
  verifyRazorpayWebhookSignature({
    rawBody: Buffer.from(webhookBody, "utf8"),
    razorpaySignature: validWebhookSignature,
    keySecret: secret,
  }),
  true,
  "Webhook signature should verify for Buffer body"
);

assert.strictEqual(
  verifyRazorpayWebhookSignature({
    rawBody: webhookBody,
    razorpaySignature: "invalid_signature",
    keySecret: secret,
  }),
  false,
  "Webhook signature should fail for invalid signature"
);

assert.strictEqual(
  verifyRazorpayPaymentSignature({
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: "",
    keySecret: secret,
  }),
  false,
  "Payment verification should fail for empty signature"
);

console.log("All payment verification tests passed.");
