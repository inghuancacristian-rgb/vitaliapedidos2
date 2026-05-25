const fs = require('fs');
const content = fs.readFileSync('kefir_control_segment.js', 'utf8');

function searchMatches(query, contextLength = 200) {
  let idx = -1;
  let count = 0;
  console.log(`\n=== SEARCHING FOR "${query}" ===`);
  while ((idx = content.indexOf(query, idx + 1)) !== -1) {
    count++;
    console.log(`Match ${count} at position ${idx}:`);
    console.log(content.substring(Math.max(0, idx - 150), Math.min(content.length, idx + contextLength)));
    if (count >= 10) break;
  }
}

searchMatches('leche');
searchMatches('materia');
searchMatches('deduction');
