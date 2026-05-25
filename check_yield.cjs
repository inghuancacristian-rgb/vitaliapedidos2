const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

// Find default value of kefir_yield_records_v3
const regex = /\[([^\]]*)\],\[y,b\]=\(0,v\.useState\)\(\(\)=>v5\([`'"]kefir_yield_records_v3[`'"],/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(match[0]);
}

const findKeyUsage = (key) => {
  const matches = content.match(new RegExp(`.{0,50}${key}.{0,50}`, 'g')) || [];
  matches.forEach(m => console.log(m));
};
findKeyUsage('kefir_yield_records_v3');
