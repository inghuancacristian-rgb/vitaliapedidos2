const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

const keys = new Set();
const regex = /[`'"]kefir_[a-zA-Z0-9_]+[`'"]/g;
let match;
while ((match = regex.exec(content)) !== null) {
  keys.add(match[0]);
}

console.log('Keys matching kefir_*: ', Array.from(keys));
