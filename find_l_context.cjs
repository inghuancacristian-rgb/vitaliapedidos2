const fs = require('fs');
const content = fs.readFileSync('kefir_control_segment.js', 'utf8');

const target = 'l(n);let i=t.packagingLines';
const idx = content.indexOf(target);
if (idx !== -1) {
  console.log("Found context! Showing segment:\n");
  console.log(content.substring(idx - 1500, idx + 1000));
} else {
  console.log("Could not find the target text in kefir_control_segment.js");
}
