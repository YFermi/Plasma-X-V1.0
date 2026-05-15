import * as fs from 'fs';
const rawText = fs.readFileSync('nist-out1.html', 'utf8');
console.log(rawText.substring(0, 1000));
