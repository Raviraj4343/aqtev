const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      if (typeof next === "function") return next(err);

      // Detailed logging when `next` is not a function so we can debug production issues
      try {
        console.error(
          "\n🔴 AsyncHandler fallback error (next is not a function)"
        );
        console.error("Request:", {
          method: req?.method,
          url: req?.originalUrl || req?.url,
          headers: req?.headers && {
            ...req.headers,
            authorization: req.headers.authorization ? "[REDACTED]" : undefined,
          },
          body: req?.body,
        });
        console.error("Error message:", err && err.message);
        console.error("Error stack:", err && err.stack);
      } catch (loggingErr) {
        console.error(
          "Failed to log AsyncHandler fallback details:",
          loggingErr
        );
      }

      // Fallback response
      try {
        res
          .status(500)
          .json({
            success: false,
            statusCode: 500,
            message: err.message || "Internal server error",
          });
      } catch (e) {
        console.error("Also failed to send 500 response:", e);
      }
    });
  };
};

export default asyncHandler;
