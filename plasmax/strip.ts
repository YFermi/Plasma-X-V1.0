import fs from 'fs';
const f = 'plasmax/src/components/H2TemperatureCalculator.tsx';
fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/ \{\/\* NEW \*\/\}/g, ''));
