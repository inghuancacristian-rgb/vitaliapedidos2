const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

const regex = /const vQe=\[([\s\S]*?)\];/;
const match = regex.exec(content);
if (match) {
  console.log("Default batches:", match[0].substring(0, 500));
} else {
  console.log("vQe not found");
}

const regex2 = /const yQe=\[([\s\S]*?)\];/;
const match2 = regex2.exec(content);
if (match2) {
  console.log("Default inventory:", match2[0].substring(0, 500));
}
