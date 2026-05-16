const points = [
  {J: 1, E_cm1: 48.60, S_J: 4.5, I: 4396},
  {J: 2, E_cm1: 169.59, S_J: 2.5, I: 2305},
  {J: 4, E_cm1: 585.01, S_J: 4.5, I: 3401},
  {J: 6, E_cm1: 1231.74, S_J: 6.5, I: 3599}
];
const pts = points.map(l => ({ x: l.E_cm1, y: Math.log(l.I / l.S_J) }));
const n = pts.length; 
const sumX = pts.reduce((s, p) => s + p.x, 0); 
const sumY = pts.reduce((s, p) => s + p.y, 0); 
const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0); 
const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0);
const denominator = n * sumX2 - sumX * sumX; 
const slope = (n * sumXY - sumX * sumY) / denominator; 
const intercept = (sumY * sumX2 - sumX * sumXY) / denominator;
const yMean = sumY / n; 
const ssRes = pts.reduce((s, p) => s + Math.pow(p.y - (slope * p.x + intercept), 2), 0); 
const ssTot = pts.reduce((s, p) => s + Math.pow(p.y - yMean, 2), 0); 
const R2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot; 
const k_B = 0.695039;
const T_gas = -1 / (slope * k_B); 
console.log(`T_gas=${T_gas.toFixed(0)}, R2=${R2.toFixed(3)}`);
