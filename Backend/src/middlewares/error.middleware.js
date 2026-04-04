import ApiError from "../utils/ApiError.js";

const errorHandler = (err, req, res, _next) => {
  // Log in development
  if (process.env.NODE_ENV === "development") {
    console.error("\n🔴 ERROR:", err);
  }

  // Handle known ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
  }

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "Validation failed",
      errors,
    });
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      statusCode: 409,
      message: `${field} already exists`,
      errors: [],
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: "Invalid token",
      errors: [],
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: "Token expired",
      errors: [],
    });
  }

  // Default: 500 Internal Server Error
  const payload = {
    success: false,
    statusCode: 500,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    errors: [],
  };
  // In development include stack for easier debugging (local-only)
  if (process.env.NODE_ENV === "development") {
    payload.stack = err.stack;
  }

  return res.status(500).json(payload);
};

/**
 * Handle 404 – route not found
 */
const notFound = (req, res, _next) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errors: [],
  });
};
export { errorHandler, notFound };
