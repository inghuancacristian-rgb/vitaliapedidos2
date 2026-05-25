const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

// y5 is the setter function
const regex = /y5\(['"]kefir_inventory_v3['"],.*?\)/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(match[0]);
}
