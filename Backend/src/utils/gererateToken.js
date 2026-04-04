import jwt from "jsonwebtoken";

const generateAccessToken = (userId) => {
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRATION || "15m";
  return jwt.sign({ _id: userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn,
  });
};

const generateRefreshToken = (userId) => {
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRATION || "7d";
  return jwt.sign({ _id: userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn,
  });
};

const generateEmailVerifyToken = (userId) => {
  const expiresIn =
    process.env.EMAIL_VERIFICATION_EXPIRE_TIME ||
    process.env.EMAIL_VERIFY_EXPIRATION ||
    "24h";
  // Prefer a dedicated EMAIL_VERIFY_SECRET; fall back to ACCESS_TOKEN_SECRET if absent
  let secret = process.env.EMAIL_VERIFY_SECRET;
  if (!secret) {
    secret = process.env.ACCESS_TOKEN_SECRET;
    console.warn(
      "Warning: EMAIL_VERIFY_SECRET is not set. Falling back to ACCESS_TOKEN_SECRET for email verification tokens."
    );
  }
  if (!secret) {
    throw new Error(
      "No secret available to sign email verification tokens. Set EMAIL_VERIFY_SECRET or ACCESS_TOKEN_SECRET in your .env."
    );
  }
  return jwt.sign({ _id: userId }, secret, {
    expiresIn,
  });
};

const verifyToken = (token, secret) => {
  return jwt.verify(token, secret);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerifyToken,
  verifyToken,
};
