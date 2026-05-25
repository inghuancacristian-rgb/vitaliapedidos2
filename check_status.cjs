const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

const regex = /.{0,100}Finalizado.{0,100}/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(match[0]);
}

const regex2 = /.{0,100}completed.{0,100}/g;
while ((match = regex2.exec(content)) !== null) {
  console.log(match[0]);
}
