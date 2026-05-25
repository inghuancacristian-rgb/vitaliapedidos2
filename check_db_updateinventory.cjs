const fs = require('fs');
const content = fs.readFileSync('server/db.ts', 'utf8');

const target = 'async function updateInventory';
const idx = content.indexOf(target);
if (idx !== -1) {
  console.log("Found function updateInventory! Showing segment:\n");
  console.log(content.substring(idx - 100, idx + 1000));
} else {
  // Try without async
  const target2 = 'function updateInventory';
  const idx2 = content.indexOf(target2);
  if (idx2 !== -1) {
    console.log("Found function updateInventory (without async)! Showing segment:\n");
    console.log(content.substring(idx2 - 100, idx2 + 1000));
  } else {
    // Try just exporting updateInventory
    const target3 = 'export async function updateInventory';
    const idx3 = content.indexOf(target3);
    if (idx3 !== -1) {
      console.log("Found export async function updateInventory! Showing segment:\n");
      console.log(content.substring(idx3 - 100, idx3 + 1000));
    } else {
      console.log("Could not find updateInventory function in server/db.ts");
    }
  }
}
