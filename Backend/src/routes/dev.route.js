import express from "express";
import asyncHandler from "../utils/AsyncHandler.js";
import sendemail from "../utils/sendemail.js";

const router = express.Router();

// Development-only test endpoint to attempt sending an email and return provider response/error
router.post(
  "/test-email",
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res
        .status(404)
        .json({ success: false, message: "Not available in production" });
    }

    const { email, name } = req.body || {};
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });

    try {
      const token = "dev-test-token-" + Date.now();
      const result = await sendemail.sendVerificationEmail(
        email,
        name || "Dev Tester",
        token
      );
      return res
        .status(200)
        .json({ success: true, message: "Sent (or accepted)", result });
    } catch (err) {
      console.error(
        "Dev test-email failed:",
        err && err.stack ? err.stack : err
      );
      return res
        .status(500)
        .json({
          success: false,
          message: "Send failed",
          error: err && err.message,
          stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
        });
    }
  })
);

export default router;

// Development-only debug: report email config presence (does NOT return secret values)
router.get("/email-config", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res
      .status(404)
      .json({ success: false, message: "Not available in production" });
  }

  return res.status(200).json({
    success: true,
    BREVO_API_KEY_PRESENT: Boolean(process.env.BREVO_API_KEY),
    SENDER_EMAIL: process.env.SENDER_EMAIL || null,
  });
});
