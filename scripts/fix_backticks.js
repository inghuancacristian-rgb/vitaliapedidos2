const fs = require('fs');
const path = require('path');

const filesToFix = [
  'client/src/components/TransferToProductionDialog.tsx',
  'client/src/pages/Production.tsx',
  'client/src/components/InventoryTransfersDialog.tsx',
  'server/routers/inventory.ts'
];

for (const file of filesToFix) {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    // We are looking for \` and we want to replace it with `
    // but only where it breaks syntax. Let's just replace all \` with `
    content = content.replace(/\\`/g, '`');
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Fixed', file);
  } else {
    console.log('Not found', file);
  }
}
