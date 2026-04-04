const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'data', 'foods.js');

if (!fs.existsSync(filePath)) {
  console.error('foods.js not found at', filePath);
  process.exit(2);
}

const content = fs.readFileSync(filePath, 'utf8');
const backupPath = filePath + '.bak.' + Date.now();
fs.writeFileSync(backupPath, content, 'utf8');

const replaced = content.replace(/"unit"\s*:\s*"bowl"/g, '"unit":"200g"');
fs.writeFileSync(filePath, replaced, 'utf8');

const before = (content.match(/"unit"\s*:\s*"bowl"/g) || []).length;
const after = (replaced.match(/"unit"\s*:\s*"bowl"/g) || []).length;

console.log(`Normalized units in ${filePath}`);
console.log(`Replacements: ${before} -> ${after}`);
console.log('Backup saved to', backupPath);

process.exit(0);
