export function formatUnit(unit) {
  if (!unit && unit !== 0) return '';
  const u = String(unit).toLowerCase().trim();
  const gMatch = u.match(/(\d+)\s*g/);
  if (gMatch) return `${gMatch[1]}g`;
  const mlMatch = u.match(/(\d+)\s*ml/);
  if (mlMatch) return `${mlMatch[1]}ml`;
  if (u.includes('bowl')) return '200g';
  if (u.includes('cup')) return '240ml';
  if (u.includes('glass')) return '240ml';
  if (u.includes('tbsp')) return '15g';
  return unit;
}
