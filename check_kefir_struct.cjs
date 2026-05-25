const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

// Find JSON.parse or setItem related to kefir_batches_v3 or yield records
const findContext = (key) => {
  console.log(`\n--- Looking for ${key} ---`);
  const idx = content.indexOf(key);
  if (idx !== -1) {
    const start = Math.max(0, idx - 200);
    const end = Math.min(content.length, idx + 200);
    console.log(content.substring(start, end));
  }
}

findContext('kefir_yield_records_v3');
findContext('kefir_batches_v3');
