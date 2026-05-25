const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

const regex = /.{0,50}localStorage.{0,50}/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(match[0]);
}
