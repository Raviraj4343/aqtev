import asyncHandler from "../utils/AsyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import DailyLog from "../models/dailylog.model.js";
import Food from "../models/food.model.js";
import { MEAL_TYPES } from "../constants.js";


const getTodayIST = () => {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // "YYYY-MM-DD"
};

const enrichMeals = async (meals) => {
  if (!Array.isArray(meals)) return [];

  const enriched = [];

  for (const mealGroup of meals) {
    if (!Object.values(MEAL_TYPES).includes(mealGroup.type)) {
      throw new ApiError(400, `Invalid meal type: "${mealGroup.type}"`);
    }

    const enrichedItems = [];

    for (const item of mealGroup.items || []) {
      if (!item.foodId) throw new ApiError(400, "Each meal item must have a foodId.");
      if (!item.quantity || item.quantity <= 0) {
        throw new ApiError(400, "Quantity must be a positive number.");
      }

      const food = await Food.findById(item.foodId);
      if (!food || !food.isActive) {
        throw new ApiError(404, `Food item not found: ${item.foodId}`);
      }

      enrichedItems.push({
        foodId: food._id,
        foodName: food.name,
        quantity: item.quantity,
        caloriesPerUnit: food.caloriesPerUnit,
        proteinPerUnit: food.proteinPerUnit,
        carbsPerUnit: food.carbsPerUnit || 0,
        fatsPerUnit: food.fatsPerUnit || 0,
        fiberPerUnit: food.fiberPerUnit || 0,
        calciumPerUnit: food.calciumPerUnit || 0,
        totalCalories: parseFloat((food.caloriesPerUnit * item.quantity).toFixed(1)),
        totalProtein: parseFloat((food.proteinPerUnit * item.quantity).toFixed(1)),
        totalCarbs: parseFloat(((food.carbsPerUnit || 0) * item.quantity).toFixed(1)),
        totalFats: parseFloat(((food.fatsPerUnit || 0) * item.quantity).toFixed(1)),
        totalFiber: parseFloat(((food.fiberPerUnit || 0) * item.quantity).toFixed(1)),
        totalCalcium: parseFloat(((food.calciumPerUnit || 0) * item.quantity).toFixed(1)),
      });
    }

    if (enrichedItems.length > 0) {
      enriched.push({ type: mealGroup.type, items: enrichedItems });
    }
  }

  return enriched;
};


const createOrUpdateDailyLog = asyncHandler(async (req, res) => {
  const { meals, waterIntake, sleepHours, steps, date } = req.body;
  const logDate = date || getTodayIST();

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    throw new ApiError(400, "Date must be in YYYY-MM-DD format.");
  }

  // Enrich meals with nutrition data
  const enrichedMeals = await enrichMeals(meals || []);

  const logData = {
    userId: req.user._id,
    date: logDate,
    meals: enrichedMeals,
    waterIntake,
    sleepHours,
    steps,
  };

  const existingLog = await DailyLog.findOne({ userId: req.user._id, date: logDate });

  let log;
  if (existingLog) {
    Object.assign(existingLog, logData);
    log = await existingLog.save();
  } else {
    log = await DailyLog.create(logData);
  }

  return res.status(200).json(
    new ApiResponse(200, log, "Daily log saved successfully.")
  );
});


const updateMealSection = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const { type, items } = req.body; // type = "breakfast" | "lunch" | etc.

  if (!Object.values(MEAL_TYPES).includes(type)) {
    throw new ApiError(400, `Invalid meal type: "${type}"`);
  }

  const enrichedItems = [];
  for (const item of items || []) {
    if (!item.foodId) throw new ApiError(400, "Each meal item must have a foodId.");
    const food = await Food.findById(item.foodId);
    if (!food || !food.isActive) throw new ApiError(404, `Food not found: ${item.foodId}`);

    enrichedItems.push({
      foodId: food._id,
      foodName: food.name,
      quantity: item.quantity,
      caloriesPerUnit: food.caloriesPerUnit,
      proteinPerUnit: food.proteinPerUnit,
      carbsPerUnit: food.carbsPerUnit || 0,
      fatsPerUnit: food.fatsPerUnit || 0,
      fiberPerUnit: food.fiberPerUnit || 0,
      calciumPerUnit: food.calciumPerUnit || 0,
      totalCalories: parseFloat((food.caloriesPerUnit * item.quantity).toFixed(1)),
      totalProtein: parseFloat((food.proteinPerUnit * item.quantity).toFixed(1)),
      totalCarbs: parseFloat(((food.carbsPerUnit || 0) * item.quantity).toFixed(1)),
      totalFats: parseFloat(((food.fatsPerUnit || 0) * item.quantity).toFixed(1)),
      totalFiber: parseFloat(((food.fiberPerUnit || 0) * item.quantity).toFixed(1)),
      totalCalcium: parseFloat(((food.calciumPerUnit || 0) * item.quantity).toFixed(1)),
    });
  }

  let log = await DailyLog.findOne({ userId: req.user._id, date });
  if (!log) {
    log = new DailyLog({ userId: req.user._id, date, meals: [] });
  }

  // Remove existing section of same type and replace
  log.meals = log.meals.filter((m) => m.type !== type);
  if (enrichedItems.length > 0) {
    log.meals.push({ type, items: enrichedItems });
  }

  await log.save(); // pre-save hook recalculates totals

  return res.status(200).json(new ApiResponse(200, log, `${type} updated.`));
});


const updateVitals = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const { waterIntake, sleepHours, steps } = req.body;

  let log = await DailyLog.findOne({ userId: req.user._id, date });
  if (!log) {
    log = new DailyLog({ userId: req.user._id, date, meals: [] });
  }

  if (waterIntake !== undefined) log.waterIntake = waterIntake;
  if (sleepHours !== undefined) log.sleepHours = sleepHours;
  if (steps !== undefined) log.steps = steps;

  await log.save();

  return res.status(200).json(new ApiResponse(200, log, "Vitals updated."));
});


const getTodayLog = asyncHandler(async (req, res) => {
  const today = getTodayIST();
  const log = await DailyLog.findOne({ userId: req.user._id, date: today })
    .populate("meals.items.foodId", "name nameHindi unit category caloriesPerUnit proteinPerUnit carbsPerUnit fatsPerUnit fiberPerUnit calciumPerUnit vitamins");

  return res.status(200).json(
    new ApiResponse(200, log || null, log ? "Today's log fetched." : "No log found for today.")
  );
});


const getLogByDate = asyncHandler(async (req, res) => {
  const { date } = req.params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiError(400, "Date must be in YYYY-MM-DD format.");
  }

  const log = await DailyLog.findOne({ userId: req.user._id, date })
    .populate("meals.items.foodId", "name nameHindi unit category caloriesPerUnit proteinPerUnit carbsPerUnit fatsPerUnit fiberPerUnit calciumPerUnit vitamins");

  if (!log) throw new ApiError(404, `No log found for ${date}.`);

  return res.status(200).json(new ApiResponse(200, log, "Log fetched."));
});


const getHistory = asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 7, 30);
  const summaryOnly = ["1", "true", "yes"].includes(String(req.query.summary || "").toLowerCase());

  // Build date range
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  }

  let historyQuery = DailyLog.find({
    userId: req.user._id,
    date: { $in: dates },
  }).sort({ date: -1 });

  if (summaryOnly) {
    historyQuery = historyQuery.select("date meals totalCalories totalProtein totalFiber waterIntake sleepHours steps");
  }

  const logs = await historyQuery.lean();

  const payload = summaryOnly
    ? logs.map((log) => {
        const mealItemCount = Array.isArray(log?.meals)
          ? log.meals.reduce((sum, meal) => sum + (Array.isArray(meal?.items) ? meal.items.length : 0), 0)
          : 0;

        return {
          date: log?.date,
          totalCalories: log?.totalCalories || 0,
          totalProtein: log?.totalProtein || 0,
          totalFiber: log?.totalFiber || 0,
          waterIntake: log?.waterIntake || null,
          sleepHours: log?.sleepHours ?? null,
          steps: log?.steps ?? null,
          mealItemCount,
        };
      })
    : logs;

  return res
    .status(200)
    .json(new ApiResponse(200, payload, `Last ${days} day history fetched.`));
});

export {
  createOrUpdateDailyLog,
  updateMealSection,
  updateVitals,
  getTodayLog,
  getLogByDate,
  getHistory,
};
