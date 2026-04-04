import assert from 'assert';
import { calculateMealTotals } from '../src/utils/HealthCalculation.js';

console.log('Running unit tests for HealthCalculation.calculateMealTotals');

// Test 1: fractional quantity with unit '200g' (1.5 * per-200g values)
const meals1 = [
  {
    items: [
      { caloriesPerUnit: 200, proteinPerUnit: 10, unit: '200g', quantity: 1.5 },
    ],
  },
];
const res1 = calculateMealTotals(meals1);
assert.strictEqual(res1.totalCalories, Math.round(200 * 1.5));
assert.strictEqual(Number(res1.totalProtein.toFixed(1)), parseFloat((10 * 1.5).toFixed(1)));

// Test 2: grams input treated as grams when quantity >= 10
const meals2 = [
  {
    items: [
      { caloriesPerUnit: 200, proteinPerUnit: 10, unit: '200g', quantity: 100 }, // 100 grams
    ],
  },
];
// per gram calories = 200/200 = 1 kcal/g -> 100g => 100 kcal
const res2 = calculateMealTotals(meals2);
assert.strictEqual(res2.totalCalories, 100);

// Test 3: servingGrams explicit
const meals3 = [
  {
    items: [
      { caloriesPerUnit: 300, proteinPerUnit: 15, unit: '200g', servingGrams: 50 },
    ],
  },
];
// per gram = 300/200 = 1.5 -> 50g => 75 kcal
const res3 = calculateMealTotals(meals3);
assert.strictEqual(res3.totalCalories, 75);

// Test 4: legacy unit (piece) uses quantity as count
const meals4 = [
  {
    items: [
      { caloriesPerUnit: 80, proteinPerUnit: 3, unit: 'piece', quantity: 2 },
    ],
  },
];
const res4 = calculateMealTotals(meals4);
assert.strictEqual(res4.totalCalories, 160);

console.log('All unit tests passed.');

export {};
