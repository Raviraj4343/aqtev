import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";
import {
  calculateBMI,
  calculateDailyCalories,
  calculateDailyProtein,
} from "../utils/HealthCalculation.js";
import multer from "multer";
import crypto from "crypto";
import mongoose from "mongoose";
import DailyLog from "../models/dailylog.model.js";
import Post from "../models/post.model.js";

const getTodayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const waterToLiters = (value) => {
  const map = { "<1L": 0.8, "1-2L": 1.5, "2-3L": 2.5, "3L+": 3.2 };
  return map[value] ?? null;
};

const buildDashboardSummary = (logs = []) => {
  const loggedDays = logs.length;
  const averageCalories = loggedDays
    ? Math.round(
        logs.reduce((sum, log) => sum + Number(log?.totalCalories || 0), 0) /
          loggedDays
      )
    : null;
  const averageProtein = loggedDays
    ? Math.round(
        logs.reduce((sum, log) => sum + Number(log?.totalProtein || 0), 0) /
          loggedDays
      )
    : null;
  const averageFiber = loggedDays
    ? Math.round(
        logs.reduce((sum, log) => sum + Number(log?.totalFiber || 0), 0) /
          loggedDays
      )
    : null;

  const waterValues = logs
    .map((log) => waterToLiters(log?.waterIntake))
    .filter((value) => value !== null);
  const averageWaterLiters = waterValues.length
    ? Math.round(
        (waterValues.reduce((sum, value) => sum + value, 0) / waterValues.length) *
          10
      ) / 10
    : null;

  const sleepValues = logs
    .map((log) => Number(log?.sleepHours))
    .filter((value) => Number.isFinite(value) && value > 0);
  const averageSleepHours = sleepValues.length
    ? Math.round(
        (sleepValues.reduce((sum, value) => sum + value, 0) /
          sleepValues.length) *
          10
      ) / 10
    : null;

  const stepValues = logs
    .map((log) => Number(log?.steps))
    .filter((value) => Number.isFinite(value) && value > 0);
  const averageSteps = stepValues.length
    ? Math.round(stepValues.reduce((sum, value) => sum + value, 0) / stepValues.length)
    : null;

  return {
    averageCalories,
    averageProtein,
    averageFiber,
    averageWaterLiters,
    averageSleepHours,
    averageSteps,
    loggedDays,
  };
};

const getFeaturedPost = (posts = []) => {
  if (!posts.length) return null;

  return [...posts].sort((a, b) => {
    const aScore =
      Number(a?.viewsCount || 0) +
      Number(a?.likeCount || 0) * 5 +
      Number(a?.commentCount || 0) * 4;
    const bScore =
      Number(b?.viewsCount || 0) +
      Number(b?.likeCount || 0) * 5 +
      Number(b?.commentCount || 0) * 4;

    if (bScore !== aScore) return bScore - aScore;

    return (
      new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
    );
  })[0];
};

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      cb(new ApiError(400, "Please upload a valid image file."));
      return;
    }
    cb(null, true);
  },
});

const getCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(500, "Cloudinary is not configured on the server.");
  }

  return { cloudName, apiKey, apiSecret };
};

const signCloudinaryParams = (params, apiSecret) => {
  const payload = Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${payload}${apiSecret}`)
    .digest("hex");
};

const uploadToCloudinary = async (file, userId) => {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "fitcek/avatars";
  const publicId = `user_${userId}_${Date.now()}`;
  const signature = signCloudinaryParams(
    { folder, public_id: publicId, timestamp },
    apiSecret
  );

  const form = new FormData();
  form.append(
    "file",
    new Blob([file.buffer], {
      type: file.mimetype || "application/octet-stream",
    }),
    file.originalname || "avatar.png"
  );
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: form,
    }
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.secure_url || !payload?.public_id) {
    throw new ApiError(
      502,
      payload?.error?.message || "Cloudinary upload failed."
    );
  }

  return payload;
};

const removeOldAvatar = async (publicId) => {
  if (!publicId) return;

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signCloudinaryParams(
    { public_id: publicId, timestamp },
    apiSecret
  );

  const form = new FormData();
  form.append("public_id", publicId);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);

  await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body: form,
  }).catch(() => {});
};

const setupProfile = asyncHandler(async (req, res) => {
  const {
    age,
    gender,
    heightCm,
    weightKg,
    bodyFatPercent,
    goal,
    activityLevel,
    dietPreference,
  } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      age,
      gender,
      heightCm,
      weightKg,
      bodyFatPercent,
      goal,
      activityLevel,
      dietPreference,
      profileCompleted: true,
    },
    { new: true, runValidators: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        "Profile set up successfully! Let's start tracking."
      )
    );
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    "age",
    "gender",
    "heightCm",
    "weightKg",
    "bodyFatPercent",
    "goal",
    "activityLevel",
    "dietPreference",
    "name",
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid fields provided for update.");
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile updated successfully."));
});

const getHealthStats = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.profileCompleted) {
    throw new ApiError(403, "Please complete your profile first.");
  }

  const { bmi, category, message } = calculateBMI(user.weightKg, user.heightCm);
  const requiredCalories = calculateDailyCalories(user);
  const requiredProtein = calculateDailyProtein(user.weightKg, user.goal);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        bmi,
        bmiCategory: category,
        bmiMessage: message,
        requiredCalories,
        requiredProtein,
        goal: user.goal,
        activityLevel: user.activityLevel,
        dietPreference: user.dietPreference,
      },
      "Health stats fetched."
    )
  );
});

const getDashboardSummary = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.profileCompleted) {
    throw new ApiError(403, "Please complete your profile first.");
  }

  const today = getTodayIST();
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  }

  const { bmi, category, message } = calculateBMI(user.weightKg, user.heightCm);
  const requiredCalories = calculateDailyCalories(user);
  const requiredProtein = calculateDailyProtein(user.weightKg, user.goal);

  const [todayLog, historyLogs, posts] = await Promise.all([
    DailyLog.findOne({ userId: user._id, date: today })
      .select("totalCalories totalProtein waterIntake sleepHours steps")
      .lean(),
    DailyLog.find({
      userId: user._id,
      date: { $in: dates },
    })
      .sort({ date: -1 })
      .select("date totalCalories totalProtein totalFiber waterIntake sleepHours steps")
      .lean(),
    Post.find({})
      .sort({ createdAt: -1 })
      .limit(12)
      .select("author title description images likes comments viewsCount createdAt")
      .populate("author", "name avatarUrl goal activityLevel dietPreference")
      .lean(),
  ]);

  const featuredPost = getFeaturedPost(
    posts.map((post) => ({
      ...post,
      likeCount: Array.isArray(post?.likes) ? post.likes.length : 0,
      commentCount: Array.isArray(post?.comments) ? post.comments.length : 0,
    }))
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        stats: {
          bmi,
          bmiCategory: category,
          bmiMessage: message,
          requiredCalories,
          requiredProtein,
          goal: user.goal,
          activityLevel: user.activityLevel,
          dietPreference: user.dietPreference,
        },
        today: {
          calories: todayLog?.totalCalories || 0,
          protein: todayLog?.totalProtein || 0,
          waterIntake: todayLog?.waterIntake || null,
          sleepHours: todayLog?.sleepHours ?? null,
          steps: todayLog?.steps ?? null,
          logExists: Boolean(todayLog),
        },
        summary: buildDashboardSummary(historyLogs),
        featuredPost,
      },
      "Dashboard summary fetched."
    )
  );
});

const getProfile = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Profile fetched."));
});

const getPublicProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user id.");
  }

  const profile = await User.findById(userId)
    .select(
      "name avatarUrl goal activityLevel dietPreference profileCompleted createdAt"
    )
    .lean();

  if (!profile) {
    throw new ApiError(404, "User profile not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, profile, "Public profile fetched."));
});

const uploadAvatar = [
  avatarUpload.single("avatar"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, "Please choose an image to upload.");
    }
    const uploaded = await uploadToCloudinary(req.file, req.user._id);
    await removeOldAvatar(req.user.avatarPublicId);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        avatarUrl: uploaded.secure_url,
        avatarPublicId: uploaded.public_id,
      },
      { new: true, runValidators: true }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Avatar uploaded successfully."));
  }),
];

export default {
  setupProfile,
  updateProfile,
  getHealthStats,
  getDashboardSummary,
  getProfile,
  getPublicProfile,
  uploadAvatar,
};
