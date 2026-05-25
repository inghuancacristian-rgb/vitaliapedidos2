const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

const regex = /y5\(([^,]+),/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(match[0], match[1]);
}
