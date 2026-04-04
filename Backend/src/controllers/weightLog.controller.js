import asyncHandler from "../utils/AsyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import WeightLog from "../models/weightlog.model.js";
import User from "../models/user.model.js";

const getTodayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const logWeight = asyncHandler(async (req, res) => {
  const { weightKg, note, date } = req.body;
  const logDate = date || getTodayIST();

  if (!weightKg || weightKg <= 0) {
    throw new ApiError(400, "A valid weight is required.");
  }

  // Upsert: one entry per user per day
  const entry = await WeightLog.findOneAndUpdate(
    { userId: req.user._id, date: logDate },
    { weightKg, note },
    { new: true, upsert: true, runValidators: true }
  );

  // Also update current weight in User profile
  await User.findByIdAndUpdate(req.user._id, { weightKg });

  return res
    .status(200)
    .json(new ApiResponse(200, entry, "Weight logged successfully."));
});

const getWeightHistory = asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 7, 90);

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const logs = await WeightLog.find({
    userId: req.user._id,
    date: { $gte: sinceStr },
  }).sort({ date: 1 });

  // Calculate trend
  let trend = null;
  if (logs.length >= 2) {
    const first = logs[0].weightKg;
    const last = logs[logs.length - 1].weightKg;
    const diff = parseFloat((last - first).toFixed(1));
    const absDiff = Math.abs(diff);

    if (diff < -0.1) {
      trend = {
        direction: "down",
        change: absDiff,
        message: `You lost ${absDiff} kg over the last ${days} days 🔥`,
      };
    } else if (diff > 0.1) {
      trend = {
        direction: "up",
        change: absDiff,
        message: `You gained ${absDiff} kg over the last ${days} days`,
      };
    } else {
      trend = {
        direction: "stable",
        change: 0,
        message: "Your weight has been stable 📊",
      };
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { logs, trend }, "Weight history fetched."));
});

const getWeeklySummary = asyncHandler(async (req, res) => {
  // Get last 8 days to capture a full week
  const dates = [];
  for (let i = 0; i < 8; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  }

  const logs = await WeightLog.find({
    userId: req.user._id,
    date: { $in: dates },
  }).sort({ date: 1 });

  let summary = {
    dataPoints: logs.length,
    logs,
    weeklyChange: null,
    message: "Not enough data for weekly summary. Log weight at least twice.",
  };

  if (logs.length >= 2) {
    const first = logs[0].weightKg;
    const last = logs[logs.length - 1].weightKg;
    const diff = parseFloat((last - first).toFixed(1));

    summary.weeklyChange = diff;
    summary.message =
      diff < 0
        ? `You lost ${Math.abs(diff)} kg this week 🔥`
        : diff > 0
          ? `You gained ${diff} kg this week`
          : "Weight is stable this week 📊";
  }

  return res
    .status(200)
    .json(new ApiResponse(200, summary, "Weekly summary fetched."));
});

const deleteWeightLog = asyncHandler(async (req, res) => {
  const { date } = req.params;

  const deleted = await WeightLog.findOneAndDelete({
    userId: req.user._id,
    date,
  });

  if (!deleted) throw new ApiError(404, `No weight log found for ${date}.`);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Weight log deleted."));
});

export { logWeight, getWeightHistory, getWeeklySummary, deleteWeightLog };
