const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

const keys = new Set();
const regex = /localStorage\.setItem\(['"]([^'"]+)['"]/g;
let match;
while ((match = regex.exec(content)) !== null) {
  keys.add(match[1]);
}

const getRegex = /localStorage\.getItem\(['"]([^'"]+)['"]/g;
while ((match = getRegex.exec(content)) !== null) {
  keys.add(match[1]);
}

console.log('localStorage keys used:', Array.from(keys));

// Also check for postMessage
if (content.includes('postMessage')) {
  console.log('Contains postMessage: YES');
}

// Find event dispatchers or window listeners
if (content.includes('window.parent')) {
  console.log('Contains window.parent: YES');
}
