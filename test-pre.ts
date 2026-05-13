import * as fs from 'fs';
const html = fs.readFileSync('nist-out1.html', 'utf-8');
const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/i);
if (preMatch) {
  console.log("PRE block:");
  console.log(preMatch[1].substring(0, 500));
} else {
  console.log("No pre block.");
}
