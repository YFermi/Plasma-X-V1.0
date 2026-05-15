import * as fs from 'fs';
const html = fs.readFileSync('nist-out-full.html', 'utf-8');
const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/i);
if (preMatch) {
  console.log("PRE block:");
  console.log(preMatch[1].substring(0, 1000));
} else {
  console.log("No pre block.");
}
