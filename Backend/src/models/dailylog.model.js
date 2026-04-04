import mongoose from "mongoose";
import { MEAL_TYPES, WATER_LEVELS } from "../constants.js";

const mealItemSchema = new mongoose.Schema(
  {
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Food",
      required: true,
    },
    foodName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.1 },
    unit: { type: String },
    servingGrams: { type: Number },
    caloriesPerUnit: { type: Number, required: true },
    proteinPerUnit: { type: Number, required: true },
    carbsPerUnit: { type: Number, default: 0 },
    fatsPerUnit: { type: Number, default: 0 },
    fiberPerUnit: { type: Number, default: 0 },
    calciumPerUnit: { type: Number, default: 0 },
    totalCalories: { type: Number },
    totalProtein: { type: Number },
    totalCarbs: { type: Number },
    totalFats: { type: Number },
    totalFiber: { type: Number },
    totalCalcium: { type: Number },
  },
  { _id: false }
);

mealItemSchema.pre("save", function () {
  const parseUnitToGrams = (unit) => {
    if (!unit) return null;
    const u = String(unit).toLowerCase().trim();
    const gMatch = u.match(/(\d+)\s*g/);
    if (gMatch) return Number(gMatch[1]);
    const mlMatch = u.match(/(\d+)\s*ml/);
    if (mlMatch) return Number(mlMatch[1]);
    if (u.includes("bowl")) return 200;
    if (u.includes("cup")) return 240;
    if (u.includes("glass")) return 240;
    if (u.includes("tbsp")) return 15;
    return null;
  };

  const unitBase = parseUnitToGrams(this.unit);

  // If explicit servingGrams provided, use it (most accurate)
  if (this.servingGrams && unitBase) {
    const perGramCal = (this.caloriesPerUnit || 0) / unitBase;
    const perGramProt = (this.proteinPerUnit || 0) / unitBase;
    this.totalCalories = parseFloat(
      (perGramCal * this.servingGrams).toFixed(2)
    );
    this.totalProtein = parseFloat(
      (perGramProt * this.servingGrams).toFixed(2)
    );
  } else if (unitBase && this.quantity && this.quantity >= 10) {
    // treat quantity as grams when quantity >= 10 and unitBase exists
    const perGramCal = (this.caloriesPerUnit || 0) / unitBase;
    const perGramProt = (this.proteinPerUnit || 0) / unitBase;
    this.totalCalories = parseFloat((perGramCal * this.quantity).toFixed(2));
    this.totalProtein = parseFloat((perGramProt * this.quantity).toFixed(2));
  } else {
    this.totalCalories = parseFloat(
      (this.caloriesPerUnit * this.quantity).toFixed(2)
    );
    this.totalProtein = parseFloat(
      (this.proteinPerUnit * this.quantity).toFixed(2)
    );
  }

  this.totalCarbs = parseFloat((this.carbsPerUnit * this.quantity).toFixed(2));
  this.totalFats = parseFloat((this.fatsPerUnit * this.quantity).toFixed(2));
  this.totalFiber = parseFloat((this.fiberPerUnit * this.quantity).toFixed(2));
  this.totalCalcium = parseFloat(
    (this.calciumPerUnit * this.quantity).toFixed(2)
  );
});

const mealGroupSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(MEAL_TYPES),
      required: true,
    },
    items: [mealItemSchema],
  },
  { _id: false }
);

const dailyLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    meals: [mealGroupSchema],
    totalCalories: {
      type: Number,
      default: 0,
    },
    totalProtein: {
      type: Number,
      default: 0,
    },
    totalCarbs: {
      type: Number,
      default: 0,
    },
    totalFats: {
      type: Number,
      default: 0,
    },
    totalFiber: {
      type: Number,
      default: 0,
    },
    totalCalcium: {
      type: Number,
      default: 0,
    },
    waterIntake: {
      type: String,
      enum: Object.values(WATER_LEVELS),
    },
    sleepHours: {
      type: Number,
      min: 0,
      max: 24,
    },
    steps: {
      type: Number,
      min: 0,
    },
  },
  { timestamps: true }
);

// Compound index: one log per user per day
dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

/**
 * Recalculate totals before saving
 */
dailyLogSchema.pre("save", function () {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  let totalFiber = 0;
  let totalCalcium = 0;

  this.meals.forEach((mealGroup) => {
    mealGroup.items.forEach((item) => {
      const parseUnitToGrams = (unit) => {
        if (!unit) return null;
        const u = String(unit).toLowerCase().trim();
        const gMatch = u.match(/(\d+)\s*g/);
        if (gMatch) return Number(gMatch[1]);
        const mlMatch = u.match(/(\d+)\s*ml/);
        if (mlMatch) return Number(mlMatch[1]);
        if (u.includes("bowl")) return 200;
        if (u.includes("cup")) return 240;
        if (u.includes("glass")) return 240;
        if (u.includes("tbsp")) return 15;
        return null;
      };

      const unitBase = parseUnitToGrams(item.unit);

      let cal = 0;
      let prot = 0;
      if (item.servingGrams && unitBase) {
        const perGramCal = (item.caloriesPerUnit || 0) / unitBase;
        const perGramProt = (item.proteinPerUnit || 0) / unitBase;
        cal = perGramCal * item.servingGrams;
        prot = perGramProt * item.servingGrams;
      } else if (unitBase && item.quantity && item.quantity >= 10) {
        const perGramCal = (item.caloriesPerUnit || 0) / unitBase;
        const perGramProt = (item.proteinPerUnit || 0) / unitBase;
        cal = perGramCal * item.quantity;
        prot = perGramProt * item.quantity;
      } else {
        cal = (item.caloriesPerUnit || 0) * (item.quantity || 1);
        prot = (item.proteinPerUnit || 0) * (item.quantity || 1);
      }

      const carbs = (item.carbsPerUnit || 0) * (item.quantity || 1);
      const fats = (item.fatsPerUnit || 0) * (item.quantity || 1);
      const fiber = (item.fiberPerUnit || 0) * (item.quantity || 1);
      const calcium = (item.calciumPerUnit || 0) * (item.quantity || 1);

      item.totalCalories = parseFloat(cal.toFixed(2));
      item.totalProtein = parseFloat(prot.toFixed(2));
      item.totalCarbs = parseFloat(carbs.toFixed(2));
      item.totalFats = parseFloat(fats.toFixed(2));
      item.totalFiber = parseFloat(fiber.toFixed(2));
      item.totalCalcium = parseFloat(calcium.toFixed(2));

      totalCalories += cal;
      totalProtein += prot;
      totalCarbs += carbs;
      totalFats += fats;
      totalFiber += fiber;
      totalCalcium += calcium;
    });
  });

  this.totalCalories = parseFloat(totalCalories.toFixed(2));
  this.totalProtein = parseFloat(totalProtein.toFixed(2));
  this.totalCarbs = parseFloat(totalCarbs.toFixed(2));
  this.totalFats = parseFloat(totalFats.toFixed(2));
  this.totalFiber = parseFloat(totalFiber.toFixed(2));
  this.totalCalcium = parseFloat(totalCalcium.toFixed(2));
});

const DailyLog = mongoose.model("DailyLog", dailyLogSchema);

export default DailyLog;
