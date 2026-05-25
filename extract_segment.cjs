const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

const startIdx = 3213000;
const length = 40000;
const segment = content.substring(startIdx, startIdx + length);

fs.writeFileSync('kefir_control_segment.js', segment, 'utf8');
console.log(`Extracted ${length} characters starting from ${startIdx} into kefir_control_segment.js`);
