import * as fs from 'fs';
const html = fs.readFileSync('nist-out-full.html', 'utf-8');
const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/i);
if (preMatch) {
  const lines = preMatch[1].split('\n');
  console.log("Lines:");
  console.log(lines.slice(7, 12).join('\n'));
}
