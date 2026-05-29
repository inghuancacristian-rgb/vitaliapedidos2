const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');
const matches = [...content.matchAll(/localStorage\.setItem\(['"]([^'"]+)['"]/g)];
console.log([...new Set(matches.map(m => m[1]))]);
