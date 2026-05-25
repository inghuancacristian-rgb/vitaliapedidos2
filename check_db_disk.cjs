const fs = require('fs');
const content = fs.readFileSync('server/db.ts', 'utf8');

const target = 'Data loaded from disk';
const idx = content.indexOf(target);
if (idx !== -1) {
  console.log("Found context! Showing segment:\n");
  console.log(content.substring(idx - 500, idx + 1000));
} else {
  console.log("Could not find the target text in server/db.ts");
}
