import path from 'path';
import fs from 'fs';

const foodPath = path.join(process.cwd(), 'src', 'data', 'foods.js');
if (!fs.existsSync(foodPath)) {
  console.error('foods.js not found at', foodPath);
  process.exit(2);
}

const foodsModule = await import(`../src/data/foods.js`);
const RAW_FOOD = foodsModule.default || foodsModule.RAW_FOOD || [];

const parseUnitToGrams = (unit) => {
  if (!unit) return null;
  const u = String(unit).toLowerCase().trim();
  const gMatch = u.match(/(\d+)\s*g/);
  if (gMatch) return Number(gMatch[1]);
  const mlMatch = u.match(/(\d+)\s*ml/);
  if (mlMatch) return Number(mlMatch[1]);
  if (u.includes('bowl')) return 200;
  if (u.includes('cup')) return 240;
  if (u.includes('glass')) return 240;
  if (u.includes('tbsp')) return 15;
  return null;
};

const results = [];

for (const food of RAW_FOOD) {
  const c = Number(food.caloriesPerUnit || 0);
  const p = Number(food.proteinPerUnit || 0);
  const carbs = Number(food.carbsPerUnit || 0);
  const f = Number(food.fatsPerUnit || 0);
  const fiber = Number(food.fiberPerUnit || 0);

  const expected = p * 4 + carbs * 4 + f * 9;
  const expectedWithFiber = expected + fiber * 2; // approximate

  const absDiff = Math.abs(expected - c);
  const pctDiff = c ? absDiff / c : (expected ? 1 : 0);

  const unitGrams = parseUnitToGrams(food.unit);
  let per100 = null;
  if (unitGrams) {
    const factor = 100 / unitGrams;
    per100 = {
      calories: +( (c * factor).toFixed(2) ),
      protein: +( (p * factor).toFixed(2) ),
      carbs: +( (carbs * factor).toFixed(2) ),
      fats: +( (f * factor).toFixed(2) ),
    };
  }

  results.push({
    name: food.name,
    unit: food.unit,
    caloriesPerUnit: c,
    expectedFromMacros: +expected.toFixed(2),
    expectedWithFiber: +expectedWithFiber.toFixed(2),
    absDiff: +absDiff.toFixed(2),
    pctDiff: +pctDiff.toFixed(3),
    per100,
  });
}

// Find offenders where pctDiff > 15% or absDiff > 30 kcal
const offenders = results.filter(r => r.pctDiff > 0.15 || r.absDiff > 30).sort((a,b) => b.absDiff - a.absDiff);

console.log('Foods analysed:', results.length);
console.log('Flagged items (pctDiff>15% or absDiff>30):', offenders.length);
if (offenders.length) {
  console.log('Top 30 offenders:');
  offenders.slice(0,30).forEach((o, idx) => {
    console.log(`${idx+1}. ${o.name} — unit: ${o.unit} — kcal:${o.caloriesPerUnit} expected:${o.expectedFromMacros} diff:${o.absDiff} (${(o.pctDiff*100).toFixed(1)}%)`);
    if (o.per100) console.log(`    per100g: ${JSON.stringify(o.per100)}`);
  });
} else {
  console.log('No significant discrepancies detected.');
}

// Summary stats
const avgPct = results.reduce((s,r)=>s+r.pctDiff,0)/results.length;
console.log('Average percent difference:', (avgPct*100).toFixed(2)+'%');

// Exit with code 0 but print path to review
console.log('\nIf items are flagged, consider updating their caloriesPerUnit or macros in src/data/foods.js or in DB.');

export {};
