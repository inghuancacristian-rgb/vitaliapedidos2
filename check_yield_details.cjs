const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

// Find all indices of kefir_yield_records_v3 and print 500 characters around each
let idx = -1;
console.log("=== OCCURRENCES OF kefir_yield_records_v3 ===");
while ((idx = content.indexOf('kefir_yield_records_v3', idx + 1)) !== -1) {
  console.log(`\nPosition ${idx}:`);
  console.log(content.substring(Math.max(0, idx - 300), Math.min(content.length, idx + 400)));
}

// Find all indices of kefir_batches_v3 and print 500 characters around each
idx = -1;
console.log("\n=== OCCURRENCES OF kefir_batches_v3 ===");
while ((idx = content.indexOf('kefir_batches_v3', idx + 1)) !== -1) {
  console.log(`\nPosition ${idx}:`);
  console.log(content.substring(Math.max(0, idx - 300), Math.min(content.length, idx + 400)));
}
