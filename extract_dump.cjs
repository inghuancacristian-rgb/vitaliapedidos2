const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.');
const logFiles = files.filter(f => f.endsWith('.log'));

console.log("Checking log files:", logFiles);

for (const file of logFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const keyword = 'KEFIR CONTROL DATA DUMP';
    let idx = content.indexOf(keyword);
    if (idx !== -1) {
      console.log(`\n=== Found in ${file} ===`);
      console.log(content.substring(idx, idx + 8000));
    } else {
      const idx2 = content.indexOf('BATCHES:');
      if (idx2 !== -1) {
        console.log(`\n=== Found BATCHES in ${file} ===`);
        console.log(content.substring(idx2 - 100, idx2 + 1000));
      }
    }
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
}
