import asyncHandler from "../utils/AsyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  calculateBMI,
  calculateDailyCalories,
  calculateDailyProtein,
  generateInsights,
  computeHealthReport,
} from "../utils/HealthCalculation.js";
import DailyLog from "../models/dailylog.model.js";
import { generateRealtimeActionPlan, generateGuideLiveSuggestion } from "../utils/healthActionPlanAI.js";

const getTodayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const compactUnique = (list = []) => {
  const seen = new Set();
  return list
    .map((item) => String(item || "").trim())
    .filter((item) => {
      if (!item) return false;
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const ensureMinItems = (list = [], fill = [], min = 2, max = 4) => {
  const merged = compactUnique([...list, ...fill]);
  return merged.slice(0, Math.max(min, Math.min(max, merged.length)));
};

const buildDerivedActionPlan = ({
  user,
  activeGoal,
  totals,
  requiredCalories,
  requiredProtein,
  calorieGap,
  proteinGap,
  bmiCategory,
}) => {
  const userObj = typeof user?.toObject === "function" ? user.toObject() : user;
  const report = computeHealthReport({ ...userObj, goal: activeGoal }, totals);

  const actionPlan = ensureMinItems(
    [
      calorieGap > 0
        ? `Add around ${Math.round(calorieGap)} kcal using balanced whole-food meals today.`
        : `Calories are on target (${totals.totalCalories}/${requiredCalories} kcal). Keep consistency.`,
      proteinGap > 0
        ? `Close about ${Math.round(proteinGap)}g protein gap with high-protein foods.`
        : `Protein goal met (${Math.round(totals.totalProtein)}g/${requiredProtein}g). Maintain this pattern.`,
      totals.steps == null
        ? "Start step tracking and target at least 7000 steps today."
        : totals.steps < 7000
          ? `Increase activity by about ${7000 - totals.steps} steps to reach 7000+ today.`
          : `Great activity (${totals.steps} steps). Add a short post-meal walk.`,
      totals.sleepHours == null
        ? "Log sleep tonight and target 7 to 9 hours for better recovery."
        : totals.sleepHours < 7
          ? `Sleep is ${totals.sleepHours}h. Move bedtime earlier to reach at least 7h.`
          : `Sleep looks solid (${totals.sleepHours}h). Keep your recovery routine steady.`,
    ],
    report?.suggestions || [],
    3,
    4
  );

  const riskFlags = ensureMinItems(
    [
      calorieGap > Math.max(250, requiredCalories * 0.15)
        ? `Calorie intake is meaningfully below target today (${totals.totalCalories}/${requiredCalories} kcal).`
        : "No major calorie risk detected from today's log.",
      proteinGap > 20
        ? `Protein shortfall is high (${Math.round(proteinGap)}g). Recovery may be limited.`
        : "Protein intake is not showing major risk today.",
      bmiCategory === "Overweight" || bmiCategory === "Obese"
        ? `BMI category is ${bmiCategory}; keep nutrition and activity consistent.`
        : "BMI trend risk is currently moderate from profile data.",
    ],
    report?.warnings || [],
    2,
    4
  );

  const nutritionFocus = ensureMinItems(
    [
      calorieGap > 0
        ? `Prioritize nutrient-dense calories to close ${Math.round(calorieGap)} kcal gap.`
        : "Keep current calorie quality and meal timing consistent.",
      proteinGap > 0
        ? `Add high-protein options to recover around ${Math.round(proteinGap)}g today.`
        : "Protein distribution is on track; keep protein in each meal.",
    ],
    report?.insights || [],
    2,
    4
  );

  const trainingFocus = ensureMinItems(
    [
      totals.steps == null
        ? "Track steps and build toward 7000 plus daily movement."
        : totals.steps < 7000
          ? `Use 2-3 short walks to move from ${totals.steps} to 7000+ steps.`
          : `Keep step volume above 7000 and include light strength work.`,
      activeGoal === "muscle_gain"
        ? "Prioritize progressive strength sessions 3 times this week."
        : "Maintain regular resistance sessions to support body composition.",
    ],
    report?.suggestions || [],
    2,
    4
  );

  const recoveryFocus = ensureMinItems(
    [
      totals.sleepHours == null
        ? "Track sleep and aim for a consistent 7 to 9 hour window."
        : totals.sleepHours < 7
          ? `Raise sleep from ${totals.sleepHours}h toward at least 7h for recovery.`
          : `Sleep duration is good at ${totals.sleepHours}h; protect this routine.`,
      totals.waterIntake
        ? `Hydration logged as ${totals.waterIntake}; spread water intake across the day.`
        : "Hydration not logged today; target steady intake through the day.",
    ],
    report?.insights || [],
    2,
    4
  );

  return {
    actionPlan,
    riskFlags,
    nutritionFocus,
    trainingFocus,
    recoveryFocus,
  };
};


const getTodayInsight = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.profileCompleted) {
    throw new ApiError(403, "Please complete your profile to get insights.");
  }

  // ── 1. Compute requirements ──
  const { bmi, category: bmiCategory, message: bmiMessage } = calculateBMI(
    user.weightKg,
    user.heightCm
  );
  const requiredCalories = calculateDailyCalories(user);
  const requiredProtein = calculateDailyProtein(user.weightKg, user.goal);

  // ── 2. Fetch today's log ──
  const today = getTodayIST();
  const dailyLog = await DailyLog.findOne({ userId: user._id, date: today });

  const logData = dailyLog || {
    totalCalories: 0,
    totalProtein: 0,
    waterIntake: null,
    sleepHours: null,
    steps: null,
  };

  // Use computeHealthReport to generate a consolidated report and recommendations
  const report = computeHealthReport(user, logData);

  const response = {
    date: today,
    user: {
      name: user.name,
      goal: user.goal,
      dietPreference: user.dietPreference,
    },
    bmi: {
      value: bmi,
      category: bmiCategory,
      message: bmiMessage,
    },
    requirements: {
      calories: requiredCalories,
      protein: requiredProtein,
    },
    today: {
      calories: logData.totalCalories || 0,
      protein: logData.totalProtein || 0,
      waterIntake: logData.waterIntake || "Not logged",
      sleepHours: logData.sleepHours ?? "Not logged",
      steps: logData.steps ?? "Not logged",
      logExists: !!dailyLog,
    },
    healthReport: report,
  };

  return res.status(200).json(new ApiResponse(200, response, "Today's insights generated."));
});


const getWeeklySummary = asyncHandler(async (req, res) => {
  const user = req.user;
  const days = Math.min(parseInt(req.query.days) || 7, 30);

  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  }

  const logs = await DailyLog.find({
    userId: user._id,
    date: { $in: dates },
  });

  if (logs.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, { message: "No logs found for this period." }, "No data."));
  }

  const requiredCalories = calculateDailyCalories(user);
  const requiredProtein = calculateDailyProtein(user.weightKg, user.goal);

  const totalCalories = logs.reduce((sum, l) => sum + (l.totalCalories || 0), 0);
  const totalProtein = logs.reduce((sum, l) => sum + (l.totalProtein || 0), 0);
  const totalSleep = logs.filter((l) => l.sleepHours != null).reduce((sum, l) => sum + l.sleepHours, 0);
  const sleepCount = logs.filter((l) => l.sleepHours != null).length;

  const avgCalories = Math.round(totalCalories / logs.length);
  const avgProtein = parseFloat((totalProtein / logs.length).toFixed(1));
  const avgSleep = sleepCount > 0 ? parseFloat((totalSleep / sleepCount).toFixed(1)) : null;

  const calorieDiff = avgCalories - requiredCalories;
  const proteinDiff = avgProtein - requiredProtein;

  const summary = {
    period: `Last ${days} days`,
    daysLogged: logs.length,
    averages: {
      calories: avgCalories,
      protein: avgProtein,
      sleep: avgSleep,
    },
    requirements: {
      calories: requiredCalories,
      protein: requiredProtein,
    },
    gaps: {
      calories: calorieDiff,
      protein: proteinDiff,
    },
    overallScore: computeHealthScore({ avgCalories, requiredCalories, avgProtein, requiredProtein, avgSleep }),
  };

  return res
    .status(200)
    .json(new ApiResponse(200, summary, "Weekly summary generated."));
});

const getActionPlan = asyncHandler(async (req, res) => {
  const user = req.user;
  const today = getTodayIST();
  const { dailyDiet = "", medicalConditions = "", goal } = req.body || {};

  const activeGoal = goal || user.goal;

  const log = await DailyLog.findOne({ userId: user._id, date: today });
  const totals = {
    totalCalories: log?.totalCalories || 0,
    totalProtein: log?.totalProtein || 0,
    sleepHours: log?.sleepHours ?? null,
    steps: log?.steps ?? null,
    waterIntake: log?.waterIntake ?? null,
  };

  const { bmi, category: bmiCategory } = calculateBMI(user.weightKg, user.heightCm);
  const requiredCalories = calculateDailyCalories({ ...user.toObject(), goal: activeGoal });
  const requiredProtein = calculateDailyProtein(user.weightKg, activeGoal);
  const calorieGap = Math.max(0, requiredCalories - totals.totalCalories);
  const proteinGap = Math.max(0, requiredProtein - totals.totalProtein);

  let plan;
  let source = "ai";

  try {
    plan = await generateRealtimeActionPlan({
      goal: activeGoal,
      dietPreference: user.dietPreference,
      bmi,
      bmiCategory,
      requiredCalories,
      requiredProtein,
      actualCalories: totals.totalCalories,
      actualProtein: totals.totalProtein,
      sleepHours: totals.sleepHours,
      steps: totals.steps,
      waterIntake: totals.waterIntake,
      calorieGap,
      proteinGap,
      dailyDiet,
      medicalConditions,
    });
  } catch (error) {
    source = "derived";
    plan = buildDerivedActionPlan({
      user,
      activeGoal,
      totals,
      requiredCalories,
      requiredProtein,
      calorieGap,
      proteinGap,
      bmiCategory,
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        date: today,
        source,
        plan,
        context: {
          goal: activeGoal,
          bmi,
          bmiCategory,
          requiredCalories,
          requiredProtein,
          actualCalories: totals.totalCalories,
          actualProtein: totals.totalProtein,
          calorieGap,
          proteinGap,
          sleepHours: totals.sleepHours,
          steps: totals.steps,
          waterIntake: totals.waterIntake,
        },
      },
      "Action plan generated."
    )
  );
});

const getLiveSuggestion = asyncHandler(async (req, res) => {
  const user = req.user;
  const today = getTodayIST();
  const { prompt, goal, history } = req.body || {};

  const userPrompt = String(prompt || "").trim();
  if (!userPrompt) {
    throw new ApiError(400, "Prompt is required.");
  }

  const activeGoal = goal || user.goal;
  const chatHistory = Array.isArray(history)
    ? history
        .slice(-12)
        .map((entry) => ({
          role: entry?.role === "assistant" ? "assistant" : "user",
          content: String(entry?.content || "").trim(),
        }))
        .filter((entry) => entry.content)
    : [];

  const log = await DailyLog.findOne({ userId: user._id, date: today });
  const totals = {
    totalCalories: log?.totalCalories || 0,
    totalProtein: log?.totalProtein || 0,
    sleepHours: log?.sleepHours ?? null,
    steps: log?.steps ?? null,
    waterIntake: log?.waterIntake ?? null,
  };

  const { bmi, category: bmiCategory } = calculateBMI(user.weightKg, user.heightCm);
  const requiredCalories = calculateDailyCalories({ ...user.toObject(), goal: activeGoal });
  const requiredProtein = calculateDailyProtein(user.weightKg, activeGoal);
  const calorieGap = Math.max(0, requiredCalories - totals.totalCalories);
  const proteinGap = Math.max(0, requiredProtein - totals.totalProtein);
  let reply = "";

  try {
    reply = await generateGuideLiveSuggestion({
      userName: user.name,
      userPrompt,
      goal: activeGoal,
      age: user.age,
      gender: user.gender,
      heightCm: user.heightCm,
      weightKg: user.weightKg,
      activityLevel: user.activityLevel,
      dietPreference: user.dietPreference,
      bmi,
      bmiCategory,
      requiredCalories,
      requiredProtein,
      actualCalories: totals.totalCalories,
      actualProtein: totals.totalProtein,
      sleepHours: totals.sleepHours,
      steps: totals.steps,
      waterIntake: totals.waterIntake,
      calorieGap,
      proteinGap,
      chatHistory,
    });
  } catch (err) {
    if (Number(err?.statusCode) === 429) {
      throw new ApiError(429, err?.message || "Gemini quota limit reached. Please retry shortly.");
    }
    throw new ApiError(
      502,
      "Live AI is currently unavailable. Please try again shortly."
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        date: today,
        source: "ai",
        prompt: userPrompt,
        reply,
        contextWindow: chatHistory.length,
      },
      "Live suggestion generated."
    )
  );
});


const computeHealthScore = ({ avgCalories, requiredCalories, avgProtein, requiredProtein, avgSleep }) => {
  let score = 100;

  const caloriePct = (avgCalories / requiredCalories) * 100;
  if (caloriePct < 70 || caloriePct > 130) score -= 20;
  else if (caloriePct < 80 || caloriePct > 120) score -= 10;

  const proteinPct = (avgProtein / requiredProtein) * 100;
  if (proteinPct < 70) score -= 20;
  else if (proteinPct < 85) score -= 10;

  if (avgSleep !== null) {
    if (avgSleep < 6) score -= 15;
    else if (avgSleep < 7) score -= 5;
  }

  return Math.max(score, 0);
};

export { getTodayInsight, getWeeklySummary, getActionPlan, getLiveSuggestion };
