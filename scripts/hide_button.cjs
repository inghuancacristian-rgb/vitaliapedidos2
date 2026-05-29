const fs = require('fs');
const dir = 'client/public/kefir-control/assets';
const file = fs.readdirSync(dir).find(f => f.startsWith('index-') && f.endsWith('.js'));
const path = dir + '/' + file;
let txt = fs.readFileSync(path, 'utf8');

const target = 'onClick:()=>n(!0),children:[(0,J.jsx)(S8,{size:18}),`Nuevo Ítem`]}';
const replacement = 'style:{display:"none"},onClick:()=>n(!0),children:[(0,J.jsx)(S8,{size:18}),`Nuevo Ítem`]}';

if (txt.includes(target)) {
  txt = txt.replace(target, replacement);
  fs.writeFileSync(path, txt, 'utf8');
  console.log('Successfully hid the Nuevo Ítem button.');
} else {
  console.log('Target not found.');
}
