import { Server } from "socket.io";
import cron from "node-cron";
import tokenUtils from "../utils/gererateToken.js";
import User from "../models/user.model.js";

const connectedUsers = new Map();

const socketCorsOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!socketCorsOrigins.includes("https://fitcek.vercel.app")) {
  socketCorsOrigins.push("https://fitcek.vercel.app");
}

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: socketCorsOrigins.length ? socketCorsOrigins : ["http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // ── Middleware: authenticate socket connections ────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const decoded = tokenUtils.verifyToken(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded._id).select("name email");
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  // ── Connection handler ─────────────────────────────────────
  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    connectedUsers.set(userId, socket.id);

    console.log(`🔌 Socket connected: ${socket.user.name} (${userId})`);

    // Join personal room
    socket.join(`user:${userId}`);

    // Send welcome notification
    socket.emit("notification", {
      type: "welcome",
      message: `Welcome back, ${socket.user.name}! 👋`,
    });

    // ── Client events ────────────────────────────────────────

    // Acknowledge daily log saved
    socket.on("log:saved", (data) => {
      io.to(`user:${userId}`).emit("notification", {
        type: "log_saved",
        message: "Daily log saved successfully ✅",
        data,
      });
    });

    socket.on("disconnect", () => {
      connectedUsers.delete(userId);
      console.log(`🔌 Socket disconnected: ${socket.user.name}`);
    });
  });

  // ── Scheduled notifications (cron jobs) ───────────────────

  // Sunday 8AM IST – weekly weight reminder
  cron.schedule(
    "0 8 * * 0",
    async () => {
      console.log("⏰ Running Sunday weight reminder...");
      try {
        const users = await User.find({ profileCompleted: true }).select("_id name");
        users.forEach((user) => {
          const socketId = connectedUsers.get(user._id.toString());
          if (socketId) {
            io.to(socketId).emit("notification", {
              type: "weekly_weight_reminder",
              message: `Hi ${user.name}! Don't forget to log your weight today 📊`,
            });
          }
        });
      } catch (err) {
        console.error("Cron error:", err.message);
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  // Daily 9PM IST – log reminder if user hasn't logged today
  cron.schedule(
    "0 21 * * *",
    () => {
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
      connectedUsers.forEach((socketId) => {
        io.to(socketId).emit("notification", {
          type: "daily_log_reminder",
          message: `Don't forget to log your meals for today (${today})! 🍽️`,
        });
      });
    },
    { timezone: "Asia/Kolkata" }
  );

  return io;
};

/**
 * Send a notification to a specific user if they are connected.
 */
const notifyUser = (io, userId, event, payload) => {
  const socketId = connectedUsers.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit(event, payload);
  }
};

export default { initSocket, notifyUser, connectedUsers };
