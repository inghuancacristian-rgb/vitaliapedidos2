const fs = require('fs');
const content = fs.readFileSync('server/db.ts', 'utf8');

// Search for Demo Mode or mock or getDb or demo_data
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Demo Mode') || line.includes('demo_data') || line.includes('MOCK_')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
