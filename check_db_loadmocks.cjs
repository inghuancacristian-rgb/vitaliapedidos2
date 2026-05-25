const fs = require('fs');
const content = fs.readFileSync('server/db.ts', 'utf8');

const target = 'function loadMocks';
const idx = content.indexOf(target);
if (idx !== -1) {
  console.log("Found function loadMocks! Showing segment:\n");
  console.log(content.substring(idx - 100, idx + 1000));
} else {
  console.log("Could not find 'function loadMocks' in server/db.ts");
}
