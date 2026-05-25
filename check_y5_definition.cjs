const fs = require('fs');
const content = fs.readFileSync('client/public/kefir-control/assets/index-8XlJpsEw.js', 'utf8');

// y5 is used to save, let's search for function y5 or similar
// Let's search for "y5=" or "y5 " or "function y5"
const regex1 = /function y5\s*\([^)]*\)\s*\{[^}]*\}/g;
let match = regex1.exec(content);
if (match) {
  console.log("Found function y5:", match[0]);
} else {
  console.log("Did not find function y5. Let's search for y5 in general.");
  // Let's print out the definition of v5 and y5 (which are probably in the same area)
  // Let's search for "function v5"
  const regex2 = /function v5\s*\([^)]*\)\s*\{[^}]*\}/g;
  match = regex2.exec(content);
  if (match) {
    console.log("Found function v5:", match[0]);
  }
  
  // Let's search for where v5 and y5 are defined by finding the text "kefir_" and looking slightly upstream.
  const idx = content.indexOf('kefir_strains_v3');
  if (idx !== -1) {
    const upstream = content.substring(idx - 1500, idx);
    console.log("Upstream of kefir_strains_v3:\n", upstream);
  }
}
