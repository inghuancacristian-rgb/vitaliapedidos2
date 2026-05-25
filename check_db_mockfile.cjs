const fs = require('fs');
const content = fs.readFileSync('server/db.ts', 'utf8');

const target = 'MOCK_DATA_FILE';
const idx = content.indexOf(target);
if (idx !== -1) {
  console.log("Found context! Showing segment:\n");
  console.log(content.substring(idx - 100, idx + 200));
} else {
  console.log("Could not find MOCK_DATA_FILE in server/db.ts");
}
