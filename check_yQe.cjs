const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

// yQe is likely defined around where xQe is. Let's find "yQe="
const target = 'yQe=';
const idx = content.indexOf(target);
if (idx !== -1) {
  console.log("Found yQe! Segment:\n");
  console.log(content.substring(idx, idx + 2000));
} else {
  // Let's print out what is around "yQe" definition in xQe
  const idx2 = content.indexOf('xQe=[');
  if (idx2 !== -1) {
    console.log("Segment upstream of xQe:\n");
    console.log(content.substring(idx2 - 3000, idx2));
  }
}
