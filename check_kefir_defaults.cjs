const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

function findDefaultDefinition(varName) {
  console.log(`\n=== DEFINITION OF ${varName} ===`);
  const idx = content.indexOf(`const ${varName}=`);
  if (idx !== -1) {
    console.log(content.substring(idx, idx + 1500));
  } else {
    const idx2 = content.indexOf(`${varName}=`);
    if (idx2 !== -1) {
      console.log(content.substring(idx2 - 100, idx2 + 1000));
    } else {
      console.log(`Could not find ${varName} in bundle.`);
    }
  }
}

findDefaultDefinition('xQe');
findDefaultDefinition('yQe');
findDefaultDefinition('bQe');
findDefaultDefinition('vQe');
