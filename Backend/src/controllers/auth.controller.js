import asyncHandler from "../utils/AsyncHandler.js";
import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import tokenUtils from "../utils/gererateToken.js";
import sendemail from "../utils/sendemail.js";
import { COOKIE_OPTIONS } from "../constants.js";

const parseExpiryToMs = (value, fallbackMs) => {
  if (value === undefined || value === null) return fallbackMs;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = String(value).trim().toLowerCase();
  if (!raw) return fallbackMs;

  if (/^\d+$/.test(raw)) {
    // Plain integers are treated as seconds for env friendliness.
    return Number(raw) * 1000;
  }

  const m = raw.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!m) return fallbackMs;

  const amount = Number(m[1]);
  const unit = m[2];
  const unitMs = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * unitMs[unit];
};

const issueTokens = async (userId, res) => {
  const accessToken = tokenUtils.generateAccessToken(userId);
  const refreshToken = tokenUtils.generateRefreshToken(userId);

  // Persist refresh token without going through full document save lifecycle.
  await User.findByIdAndUpdate(
    userId,
    { $set: { refreshToken } },
    { new: false }
  );

  const accessMaxAgeMs = parseExpiryToMs(
    process.env.ACCESS_TOKEN_EXPIRATION,
    24 * 60 * 60 * 1000
  );
  const refreshMaxAgeMs = parseExpiryToMs(
    process.env.REFRESH_TOKEN_EXPIRATION,
    7 * 24 * 60 * 60 * 1000
  );

  const accessCookieOpts = {
    ...COOKIE_OPTIONS,
    maxAge: accessMaxAgeMs,
  };
  const refreshCookieOpts = {
    ...COOKIE_OPTIONS,
    maxAge: refreshMaxAgeMs,
  };

  res
    .cookie("accessToken", accessToken, accessCookieOpts)
    .cookie("refreshToken", refreshToken, refreshCookieOpts);

  return { accessToken, refreshToken };
};

const signup = asyncHandler(async (req, res) => {
  try {
    console.log("auth.signup invoked", {
      bodySnippet: { name: req.body?.name, email: req.body?.email },
    });
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(409, "An account with this email already exists.");
    }

    const user = await User.create({ name, email, password });
    // Generate a 6-digit verification code, store its hash and expiry, and send it
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = crypto.createHash("sha256").update(code).digest("hex");
    user.emailVerificationCode = hashed;
    const expireMs =
      parseInt(process.env.EMAIL_VERIFICATION_EXPIRE_MS) ||
      (parseInt(process.env.EMAIL_VERIFICATION_EXPIRE_MINUTES)
        ? parseInt(process.env.EMAIL_VERIFICATION_EXPIRE_MINUTES) * 60 * 1000
        : 15 * 60 * 1000);
    user.emailVerificationExpires = Date.now() + expireMs;
    await user.save({ validateBeforeSave: false });

    let emailSent = true;
    try {
      console.log(
        "signup: sending verification — BREVO key present:",
        Boolean(process.env.BREVO_API_KEY),
        "SENDER_EMAIL:",
        process.env.SENDER_EMAIL
      );
      await sendemail.sendVerificationEmail(email, user.name, code, {
        isCode: true,
      });
    } catch (emailErr) {
      emailSent = false;
      console.error("signup: Email send failed — env:", {
        BREVO: Boolean(process.env.BREVO_API_KEY),
        SENDER_EMAIL: process.env.SENDER_EMAIL,
      });
      console.error(
        "signup: send error stack:",
        emailErr && emailErr.stack ? emailErr.stack : emailErr
      );
      // don't block signup; frontend may offer a resend option
    }

    const respData = { userId: user._id, email: user.email, emailSent };

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          respData,
          emailSent
            ? "Account created! Please verify your email to continue."
            : "Account created but we couldn't send the verification email. Please resend verification."
        )
      );
  } catch (err) {
    console.error(
      "auth.signup unexpected error:",
      err && err.stack ? err.stack : err
    );
    throw err;
  }
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw new ApiError(400, "Verification token is required.");

  let decoded;
  try {
    decoded = tokenUtils.verifyToken(token, process.env.EMAIL_VERIFY_SECRET);
  } catch {
    throw new ApiError(400, "Invalid or expired verification link.");
  }

  const user = await User.findById(decoded._id);
  if (!user) throw new ApiError(404, "User not found.");
  if (user.isEmailVerified) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Email already verified."));
  }

  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "Email verified successfully! You can now log in."
      )
    );
});

const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required.");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "No account found with this email.");
  if (user.isEmailVerified) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Email is already verified."));
  }

  try {
    // Generate a fresh 6-digit code and store its hash+expiry
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = crypto.createHash("sha256").update(code).digest("hex");
    user.emailVerificationCode = hashed;
    user.emailVerificationExpires =
      Date.now() +
      (parseInt(process.env.EMAIL_VERIFICATION_EXPIRE_MS) || 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    console.log("resendVerification: sending code — env:", {
      BREVO: Boolean(process.env.BREVO_API_KEY),
      SENDER_EMAIL: process.env.SENDER_EMAIL,
    });
    console.log(
      "resendVerification: invoking sendemail.sendVerificationEmail for",
      email
    );

    let emailSent = true;
    try {
      await sendemail.sendVerificationEmail(email, user.name, code, {
        isCode: true,
      });
    } catch (e) {
      emailSent = false;
      console.error(
        "resendVerification: email send failed — error:",
        e && e.stack ? e.stack : e
      );
    }

    const respData = { emailSent };

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          respData,
          emailSent
            ? "Verification email resent."
            : "Could not send verification email."
        )
      );
  } catch (err) {
    console.error(
      "resendVerification: unexpected error",
      err && err.stack ? err.stack : err
    );
    throw err;
  }
});

// Forgot password — generate reset token and email the user
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required.");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "No account found with this email.");

  // create reset token (plain) and store hashed version
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashed = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.passwordResetToken = hashed;
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  await sendemail.sendPasswordResetEmail(email, user.name, resetToken);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "Password reset email sent if the account exists."
      )
    );
});

// Reset password using token
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    throw new ApiError(400, "Token and new password are required.");

  const hashed = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user)
    throw new ApiError(400, "Invalid or expired password reset token.");

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "Password has been reset. You can now sign in."
      )
    );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email })
    .select("_id name email profileCompleted isEmailVerified +password")
    .lean();
  if (!user) throw new ApiError(401, "Invalid email or password.");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(401, "Invalid email or password.");

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in.");
  }

  const { accessToken, refreshToken } = await issueTokens(user._id, res);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          profileCompleted: user.profileCompleted,
        },
        accessToken,
        refreshToken,
      },
      "Logged in successfully."
    )
  );
});

const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  const clearOpts = { ...COOKIE_OPTIONS, maxAge: 0 };
  res.clearCookie("accessToken", clearOpts);
  res.clearCookie("refreshToken", clearOpts);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Logged out successfully."));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token not provided.");
  }

  let decoded;
  try {
    decoded = tokenUtils.verifyToken(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token.");
  }

  const user = await User.findById(decoded._id).select("+refreshToken");
  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is invalid or has been revoked.");
  }

  const { accessToken, refreshToken } = await issueTokens(user._id, res);

  return res
    .status(200)
    .json(
      new ApiResponse(200, { accessToken, refreshToken }, "Token refreshed.")
    );
});

const getMe = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully."));
});

export {
  signup,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  login,
  logout,
  refreshAccessToken,
  getMe,
};
