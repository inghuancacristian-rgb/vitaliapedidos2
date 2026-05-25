const fs = require('fs');
const content = fs.readFileSync('kefir_control_segment.js', 'utf8');

function showAround(query, label) {
  console.log(`\n=== ${label} ("${query}") ===`);
  let idx = -1;
  let count = 0;
  while ((idx = content.indexOf(query, idx + 1)) !== -1) {
    count++;
    if (count > 10) {
      console.log("... too many matches, truncating ...");
      break;
    }
    const start = Math.max(0, idx - 150);
    const end = Math.min(content.length, idx + 250);
    console.log(`Match ${count} at position ${idx}:\n${content.substring(start, end)}\n`);
  }
}

showAround('finalizado', 'FINALIZADO');
showAround('finalizar', 'FINALIZAR');
// Let's also look for updates to inventory "c" or updates to yield records "y"
showAround('b(', 'y-setter calls');
showAround('l(', 'c-setter (inventory) calls');
