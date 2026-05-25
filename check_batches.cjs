const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

const regex = /vQe=\[([\s\S]*?)\];/;
const match = regex.exec(content);
if (match) {
  console.log("vQe matches:", match[1].substring(0, 500));
}

const findVar = /const ([a-zA-Z0-9_]+)=\[\{id:"KF-2024-001"/;
const m = findVar.exec(content);
if(m) console.log("Found var:", m[1]);
