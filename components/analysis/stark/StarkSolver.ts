
import { useState, useCallback } from 'react';

export interface StarkParams {
  x0: number;
  wG: number;
  wL: number;
  area: number;
  bg: number;
  splt: number;
}

export function pixMapVoigt(x: number, p: StarkParams, isHBeta: boolean) {
  const { x0, wG, wL, area, bg, splt } = p;
  const wV = 0.5346 * wL + Math.sqrt(0.2166 * wL * wL + wG * wG);
  const peak = area / (wV * 1.065);
  const eta = Math.max(0, Math.min(1, wL / (wV || 1)));

  const calculateProfile = (pos: number) => {
    const dx = x - pos;
    const g = Math.exp(-2.7725887 * (dx * dx) / (wV * wV || 1));
    const l = 1 / (1 + 4 * (dx * dx) / (wV * wV || 1));
    return peak * ((1 - eta) * g + eta * l);
  };

  return bg + (isHBeta 
    ? 0.5 * (calculateProfile(x0 - splt) + calculateProfile(x0 + splt)) 
    : calculateProfile(x0));
}

export const useStarkSolver = (isHBeta: boolean) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [fitParams, setFitParams] = useState<StarkParams>({ x0: 0, wG: 0.045, wL: 0.2, area: 10, bg: 0, splt: 0.08 });
  const [rSquared, setRSquared] = useState(0);

  const runOptimizer = useCallback(async (data: {wavelength: number, intensity: number}[]) => {
    if (data.length < 15) return;
    setIsOptimizing(true);

    const xExp = data.map(d => d.wavelength);
    const yExp = data.map(d => d.intensity);
    const yMax = Math.max(...yExp);
    const yMin = Math.min(...yExp);

    let peakIdx = 0;
    for (let i = 0; i < yExp.length; i++) if (yExp[i] > yExp[peakIdx]) peakIdx = i;
    
    const initX0 = xExp[peakIdx];
    const initWv = isHBeta ? 3.5 : 1.2;
    const initArea = (yMax - yMin) * initWv;

    const cost = (pArr: number[]) => {
      const p: StarkParams = { x0: pArr[0], wG: pArr[1], wL: pArr[2], area: pArr[3], bg: pArr[4], splt: pArr[5] };
      if (p.wL < 0.001 || p.wG < 0.001 || p.area < 0) return 1e30;
      let ssr = 0;
      for (let i = 0; i < xExp.length; i++) {
        ssr += Math.pow(yExp[i] - pixMapVoigt(xExp[i], p, isHBeta), 2);
      }
      return ssr;
    };

    const n = 6;
    let start = [initX0, 0.045, initWv * 0.5, initArea, yMin, isHBeta ? 0.08 : 0.01];
    let simplex = [start];
    const steps = [0.1, 0.01, 0.2, initArea * 0.1, 10.0, 0.02];
    
    for (let i = 0; i < n; i++) {
      let p = [...start];
      p[i] += steps[i];
      simplex.push(p);
    }

    for (let iter = 0; iter < 800; iter++) {
      simplex.sort((a, b) => cost(a) - cost(b));
      const best = simplex[0];
      const worst = simplex[n];
      const centroid = Array.from({length: n}, (_, i) => simplex.slice(0, n).reduce((s, p) => s + p[i], 0) / n);
      const reflected = centroid.map((v, i) => 2 * v - worst[i]);
      const costR = cost(reflected);

      if (costR < cost(best)) {
        const expanded = centroid.map((v, i) => 3 * v - 2 * worst[i]);
        simplex[n] = cost(expanded) < costR ? expanded : reflected;
      } else {
        const contracted = centroid.map((v, i) => 0.5 * v + 0.5 * (costR < cost(worst) ? reflected[i] : worst[i]));
        if (cost(contracted) < Math.min(costR, cost(worst))) simplex[n] = contracted;
        else for (let j = 1; j <= n; j++) simplex[j] = simplex[j].map((v, i) => 0.5 * best[i] + 0.5 * v);
      }

      if (iter % 200 === 0) {
        setFitParams({ x0: simplex[0][0], wG: simplex[0][1], wL: simplex[0][2], area: simplex[0][3], bg: simplex[0][4], splt: simplex[0][5] });
        await new Promise(r => setTimeout(r, 0));
      }
    }

    const finalP: StarkParams = { x0: simplex[0][0], wG: simplex[0][1], wL: simplex[0][2], area: simplex[0][3], bg: simplex[0][4], splt: simplex[0][5] };
    const yMean = yExp.reduce((a, b) => a + b, 0) / yExp.length;
    const ssTot = yExp.reduce((s, y) => s + Math.pow(y - yMean, 2), 0);
    const ssRes = yExp.reduce((s, y, idx) => s + Math.pow(y - pixMapVoigt(xExp[idx], finalP, isHBeta), 2), 0);
    
    setRSquared(1 - (ssRes / (ssTot || 1)));
    setFitParams(finalP);
    setIsOptimizing(false);
    return finalP;
  }, [isHBeta]);

  return { isOptimizing, fitParams, rSquared, runOptimizer };
};
