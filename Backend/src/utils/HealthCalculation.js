import { ACTIVITY_MULTIPLIERS, GOALS } from "../constants.js";

/**
 * Calculate BMI and category
 */
const calculateBMI = (weightKg, heightCm) => {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const rounded = parseFloat(bmi.toFixed(1));

  let category;
  let message;
  if (bmi < 18.5) {
    category = "Underweight";
    message = "You are underweight. Consider increasing calorie intake.";
  } else if (bmi < 25) {
    category = "Normal";
    message = "Your weight is in the healthy range. Keep it up! 💪";
  } else if (bmi < 30) {
    category = "Overweight";
    message =
      "You are slightly overweight. Focus on a balanced diet and exercise.";
  } else {
    category = "Obese";
    message = "High BMI detected. Please consult a healthcare professional.";
  }

  return { bmi: rounded, category, message };
};

/**
 * Calculate TDEE (Total Daily Energy Expenditure) using Mifflin-St Jeor
 */
const calculateDailyCalories = (user) => {
  const { age, gender, weightKg, heightCm, activityLevel, goal } = user;

  // BMR calculation (Mifflin-St Jeor)
  let bmr;
  if (gender === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.2;
  let tdee = bmr * multiplier;

  // Adjust for goal
  if (goal === GOALS.WEIGHT_LOSS) {
    tdee -= 300; // 300 kcal deficit
  } else if (goal === GOALS.MUSCLE_GAIN) {
    tdee += 300; // 300 kcal surplus
  }

  return Math.round(tdee);
};

/**
 * Calculate daily protein requirement
 */
const calculateDailyProtein = (weightKg, goal) => {
  let proteinPerKg;
  if (goal === GOALS.MUSCLE_GAIN) {
    proteinPerKg = 1.5; // 1.2–1.5g per kg
  } else if (goal === GOALS.WEIGHT_LOSS) {
    proteinPerKg = 1.2;
  } else {
    proteinPerKg = 0.8; // maintain
  }
  return Math.round(weightKg * proteinPerKg);
};

/**
 * Generate health insights based on daily log vs requirements
 */
const generateInsights = ({
  dailyLog,
  requiredCalories,
  requiredProtein,
  bmiCategory,
  goal,
  dietPreference,
}) => {
  const insights = [];
  const suggestions = [];
  const warnings = [];

  const {
    totalCalories = 0,
    totalProtein = 0,
    waterIntake,
    sleepHours,
    steps,
  } = dailyLog;

  // ── Calorie analysis ──
  const calorieDiff = totalCalories - requiredCalories;
  if (calorieDiff < -400) {
    insights.push(
      `Calories are very low (${totalCalories} / ${requiredCalories} kcal)`
    );
    suggestions.push(
      "Eat a balanced meal with complex carbs and healthy fats."
    );
  } else if (calorieDiff < -100) {
    insights.push(
      `Calories are slightly below target (${totalCalories} / ${requiredCalories} kcal)`
    );
    suggestions.push("Add a small snack like a banana or handful of nuts.");
  } else if (calorieDiff > 300) {
    insights.push(
      `Calorie intake is above target (${totalCalories} / ${requiredCalories} kcal)`
    );
    suggestions.push("Consider reducing portion sizes for the next meal.");
  } else {
    insights.push(
      `Calorie intake is on track ✅ (${totalCalories} / ${requiredCalories} kcal)`
    );
  }

  // ── Protein analysis ──
  const proteinDiff = requiredProtein - totalProtein;
  if (proteinDiff > 20) {
    warnings.push(
      `Protein is low by ${proteinDiff}g (${totalProtein}g / ${requiredProtein}g needed)`
    );

    if (dietPreference === "veg") {
      suggestions.push("Add paneer, dal, or soy milk to boost protein.");
    } else if (dietPreference === "non_veg") {
      suggestions.push(
        "Add 2 eggs or a chicken breast to reach your protein goal."
      );
    } else {
      suggestions.push(
        "Add 2 eggs, paneer, or a glass of milk to meet your protein target."
      );
    }
  } else if (proteinDiff > 0) {
    insights.push(
      `Protein is slightly low (${totalProtein}g / ${requiredProtein}g)`
    );
  } else {
    insights.push(
      `Protein intake is sufficient ✅ (${totalProtein}g / ${requiredProtein}g)`
    );
  }

  // ── BMI-based insights ──
  if (bmiCategory === "Overweight" || bmiCategory === "Obese") {
    warnings.push(
      "BMI indicates you are overweight. Focus on portion control."
    );
    if (goal !== GOALS.WEIGHT_LOSS) {
      suggestions.push("Consider switching your goal to weight loss.");
    }
  }

  // ── Sleep analysis ──
  if (sleepHours !== undefined) {
    if (sleepHours < 6) {
      warnings.push(
        "Sleep is critically low (< 6 hours). This affects metabolism!"
      );
      suggestions.push("Try to sleep at least 7–8 hours for better recovery.");
    } else if (sleepHours < 7) {
      insights.push("Sleep is slightly low. Aim for 7–8 hours.");
    } else {
      insights.push("Sleep duration looks good ✅");
    }
  }

  // ── Water analysis ──
  if (waterIntake) {
    if (waterIntake === "<1L") {
      warnings.push("Water intake is very low! Risk of dehydration.");
      suggestions.push("Drink at least 2–3 litres of water daily.");
    } else if (waterIntake === "1-2L") {
      insights.push("Water intake is average. Try to drink more.");
      suggestions.push("Keep a water bottle nearby and drink regularly.");
    } else if (waterIntake === "2-3L") {
      insights.push("Water intake is good ✅");
    } else {
      insights.push("Excellent water intake ✅");
    }
  }

  // ── Steps analysis ──
  if (steps !== undefined && steps !== null) {
    if (steps < 3000) {
      warnings.push(
        "Step count is very low. Physical inactivity affects health."
      );
      suggestions.push("Walk at least 20 minutes daily to reach 5000+ steps.");
    } else if (steps < 7000) {
      insights.push(`Steps: ${steps} — Try to reach 8000+ steps daily.`);
      suggestions.push("A 15-minute evening walk can add ~2000 steps.");
    } else {
      insights.push(`Great step count today ✅ (${steps} steps)`);
    }
  } else {
    suggestions.push("Start tracking your steps — aim for 8000 steps/day.");
  }

  return { insights, suggestions, warnings };
};

/**
 * Calculate total calories and protein for a meal array
 */
const calculateMealTotals = (meals) => {
  let totalCalories = 0;
  let totalProtein = 0;

  meals.forEach((mealGroup) => {
    (mealGroup.items || []).forEach((item) => {
      // Support units declared as grams/ml (e.g. "200g", "100g", "330ml")
      // and a default mapping for ambiguous units like "bowl" -> 200g.
      const parseUnitToGrams = (unit) => {
        if (!unit) return null;
        const u = String(unit).toLowerCase().trim();
        const gMatch = u.match(/(\d+)\s*g/);
        if (gMatch) return Number(gMatch[1]);
        const mlMatch = u.match(/(\d+)\s*ml/);
        if (mlMatch) return Number(mlMatch[1]);
        if (u.includes("bowl")) return 200; // default bowl -> 200g
        if (u.includes("cup")) return 240; // approximate
        if (u.includes("glass")) return 240;
        if (u.includes("tbsp")) return 15;
        return null;
      };

      const unitBase = parseUnitToGrams(item.unit);

      // If client specified `servingGrams`, use it explicitly (most accurate)
      if (item.servingGrams && unitBase) {
        const perGramCal = (item.caloriesPerUnit || 0) / unitBase;
        const perGramProtein = (item.proteinPerUnit || 0) / unitBase;
        totalCalories += perGramCal * item.servingGrams;
        totalProtein += perGramProtein * item.servingGrams;
        return;
      }

      // If unit is gram/ml-like and quantity looks like grams (>=10), treat quantity as grams
      if (unitBase && item.quantity && item.quantity >= 10) {
        const perGramCal = (item.caloriesPerUnit || 0) / unitBase;
        const perGramProtein = (item.proteinPerUnit || 0) / unitBase;
        totalCalories += perGramCal * item.quantity;
        totalProtein += perGramProtein * item.quantity;
        return;
      }

      // Fallback: quantity is number of declared units (backwards compatible)
      totalCalories += (item.caloriesPerUnit || 0) * (item.quantity || 1);
      totalProtein += (item.proteinPerUnit || 0) * (item.quantity || 1);
    });
  });

  return {
    totalCalories: Math.round(totalCalories),
    totalProtein: parseFloat(totalProtein.toFixed(1)),
  };
};

export {
  calculateBMI,
  calculateDailyCalories,
  calculateDailyProtein,
  generateInsights,
  calculateMealTotals,
};

/**
 * Compute a consolidated health report and 0-100 health score.
 * Inputs: `user` (profile) and `dailyLog` (today's totals). Returns an object:
 * { score, components: { bmiScore,... }, requiredCalories, requiredProtein, insights, suggestions, warnings }
 */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const computeHealthReport = (user = {}, dailyLog = {}) => {
  const report = {
    score: 0,
    components: {},
    requiredCalories: null,
    requiredProtein: null,
    insights: [],
    suggestions: [],
    warnings: [],
  };

  if (!user || !user.weightKg || !user.heightCm || !user.age) {
    report.warnings.push(
      "Incomplete profile: age/height/weight required to compute full report."
    );
  }

  // Requirements
  const requiredCalories = calculateDailyCalories(user || {});
  const requiredProtein = calculateDailyProtein(
    user?.weightKg || 0,
    user?.goal
  );
  report.requiredCalories = requiredCalories;
  report.requiredProtein = requiredProtein;

  // Ensure we have totals
  const totals = {
    totalCalories: dailyLog.totalCalories ?? 0,
    totalProtein: dailyLog.totalProtein ?? 0,
    sleepHours: dailyLog.sleepHours,
    steps: dailyLog.steps,
    waterIntake: dailyLog.waterIntake,
  };

  // 1) BMI score (max 25 points)
  const { bmi } = calculateBMI(user?.weightKg || 0, user?.heightCm || 0);
  // ideal BMI 20-24.9 -> best; linear penalty outside 18.5-30
  let bmiScore = 0;
  if (bmi >= 20 && bmi <= 24.9) bmiScore = 25;
  else if (bmi < 18.5) bmiScore = clamp((bmi / 18.5) * 25, 0, 24);
  else bmiScore = clamp((1 - (bmi - 24.9) / 10) * 25, 0, 25);

  // 2) Nutrition score (max 30 points): calories (15) + protein (15)
  const calDiffPct =
    requiredCalories > 0
      ? (totals.totalCalories - requiredCalories) / requiredCalories
      : 0;
  let calScore = 0;
  if (Math.abs(calDiffPct) <= 0.1)
    calScore = 15; // within 10%
  else if (calDiffPct < -0.3)
    calScore = 5; // very low
  else if (calDiffPct > 0.3)
    calScore = 5; // very high
  else calScore = clamp(15 - Math.abs(calDiffPct) * 50, 5, 15);

  const proteinDiff = requiredProtein - totals.totalProtein;
  let proteinScore = 0;
  if (requiredProtein <= 0) proteinScore = 7.5;
  else if (proteinDiff <= 0) proteinScore = 15;
  else
    proteinScore = clamp(
      15 * Math.max(0, 1 - proteinDiff / requiredProtein),
      0,
      15
    );

  const nutritionScore = calScore + proteinScore;

  // 3) Activity score (max 20 points): combine activityLevel and steps
  const activityLevelMultiplier =
    {
      sedentary: 0.6,
      light: 0.8,
      moderate: 1.0,
      active: 1.1,
    }[user?.activityLevel] || 0.6;

  let steps = totals.steps ?? null;
  let stepsScore = 0;
  if (steps === null)
    stepsScore = 6; // neutral
  else if (steps < 3000) stepsScore = 2;
  else if (steps < 7000) stepsScore = 8;
  else stepsScore = 15;

  const activityScore = clamp(stepsScore * activityLevelMultiplier, 0, 20);

  // 4) Sleep score (max 15 points)
  let sleepScore = 0;
  const sh = totals.sleepHours;
  if (sh === undefined || sh === null) sleepScore = 7;
  else if (sh < 5) sleepScore = 2;
  else if (sh < 7) sleepScore = 9;
  else if (sh <= 9) sleepScore = 15;
  else sleepScore = 10; // oversleep mild penalty

  // 5) Hydration score (max 10 points)
  const waterMap = { "<1L": 2, "1-2L": 6, "2-3L": 8, "3L+": 10 };
  const hydrationScore = waterMap[totals.waterIntake] ?? 6;

  // Aggregate weights: BMI 25, Nutrition 30, Activity 20, Sleep 15, Hydration 10 => total 100
  const totalScore = clamp(
    Math.round(
      bmiScore + nutritionScore + activityScore + sleepScore + hydrationScore
    ),
    0,
    100
  );

  report.score = totalScore;
  report.components = {
    bmi: parseFloat(bmi.toFixed(1)),
    bmiScore: Math.round(bmiScore),
    nutritionScore: Math.round(nutritionScore),
    activityScore: Math.round(activityScore),
    sleepScore: Math.round(sleepScore),
    hydrationScore: Math.round(hydrationScore),
  };

  // Use existing insights generator for textual guidance
  const existing = generateInsights({
    dailyLog: dailyLog || {},
    requiredCalories,
    requiredProtein,
    bmiCategory: null,
    goal: user?.goal,
    dietPreference: user?.dietPreference,
  });

  report.insights.push(...(existing.insights || []));
  report.suggestions.push(...(existing.suggestions || []));
  report.warnings.push(...(existing.warnings || []));

  // Add targeted recommendations based on components
  if (report.components.nutritionScore < 20) {
    report.suggestions.push(
      "Focus on balanced meals: prioritize protein at each meal and whole foods."
    );
  }
  if (report.components.activityScore < 10) {
    report.suggestions.push(
      "Increase daily movement: short walks, standing breaks, or light cardio 3x/week."
    );
  }
  if (report.components.sleepScore < 10) {
    report.suggestions.push(
      "Improve sleep hygiene: consistent bedtime, limit screens 1h before bed."
    );
  }

  return report;
};

export { computeHealthReport };
