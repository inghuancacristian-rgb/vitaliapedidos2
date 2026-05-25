const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

const regex = /localStorage\.setItem\([`'"]([^`'"]+)[`'"]/g;
let match;
const keys = new Set();
while ((match = regex.exec(content)) !== null) {
  keys.add(match[1]);
}
console.log('Keys written directly:', Array.from(keys));
