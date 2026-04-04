import { calculateMealTotals, computeHealthReport } from '../src/utils/HealthCalculation.js';

const meals = [
  {
    name: 'Lunch',
    items: [
      { name: 'Rice plain', caloriesPerUnit: 130, proteinPerUnit: 2.5, unit: '200g', quantity: 1.5 },
      { name: 'Dal Tadka', caloriesPerUnit: 180, proteinPerUnit: 9, unit: '200g', quantity: 1 },
      { name: 'Paneer Curry', caloriesPerUnit: 260, proteinPerUnit: 12, unit: '200g', quantity: 0.5 },
    ],
  },
  {
    name: 'Snacks',
    items: [
      { name: 'Maggi Noodles', caloriesPerUnit: 300, proteinPerUnit: 7, unit: '200g', quantity: 1 },
    ],
  },
];

console.log('Running meal totals validation...');
const totals = calculateMealTotals(meals);
console.log('Meal Totals:', totals);

const user = {
  age: 30,
  gender: 'male',
  weightKg: 75,
  heightCm: 175,
  activityLevel: 'moderate',
  goal: 'maintain',
  dietPreference: 'non_veg',
};

const dailyLog = {
  totalCalories: totals.totalCalories,
  totalProtein: totals.totalProtein,
  waterIntake: '1-2L',
  sleepHours: 7.5,
  steps: 5200,
};

console.log('Computing health report...');
const report = computeHealthReport(user, dailyLog);
console.log('Health Report Score:', report.score);
console.log('Components:', report.components);
console.log('Insights:', report.insights.slice(0,5));
console.log('Suggestions (top 5):', report.suggestions.slice(0,5));
console.log('Warnings:', report.warnings.slice(0,5));

export {};
