
import { useState, useCallback } from 'react';
import { PeakResult } from '../../../types';
import { PHYSICS } from '../../../constants';

export const useBoltzmannSolver = (activeSystem: any, selectedSpectrum: any) => {
  const [peakResults, setPeakResults] = useState<Record<string, PeakResult>>({});
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const [globalBias, setGlobalBias] = useState<number>(0);
  const [fitResult, setFitResult] = useState<{ x: number, y: number, fit?: number, line: string, iNet: number }[]>([]);
  const [stats, setStats] = useState<{ temp: number, r2: number, slope: number, intercept: number } | null>(null);

  const peakSearch = useCallback(() => {
    if (!selectedSpectrum || !activeSystem) return;
    const searchRadius = 0.15; 
    const nextPeakResults: Record<string, PeakResult> = {};

    Object.entries(activeSystem.transitions).forEach(([key, constants]: [string, any]) => {
      const targetWl = constants.lambda + globalBias + (offsets[key] || 0);
      const windowPoints = selectedSpectrum.points
        .filter((p: any) => Math.abs(p.wavelength - targetWl) <= searchRadius)
        .sort((a: any, b: any) => a.wavelength - b.wavelength);
      
      if (windowPoints.length >= 3) {
        const wingSize = Math.max(1, Math.floor(windowPoints.length * 0.1));
        const avgBg = (windowPoints.slice(0, wingSize).concat(windowPoints.slice(-wingSize)))
          .reduce((sum: number, p: any) => sum + p.intensity, 0) / (wingSize * 2);

        let maxIdx = 0;
        for (let i = 1; i < windowPoints.length; i++) {
          if (windowPoints[i].intensity > windowPoints[maxIdx].intensity) maxIdx = i;
        }

        let fWl = windowPoints[maxIdx].wavelength;
        let fInt = windowPoints[maxIdx].intensity;

        if (maxIdx > 0 && maxIdx < windowPoints.length - 1) {
          const x1 = windowPoints[maxIdx-1].wavelength, y1 = windowPoints[maxIdx-1].intensity;
          const x2 = windowPoints[maxIdx].wavelength, y2 = windowPoints[maxIdx].intensity;
          const x3 = windowPoints[maxIdx+1].wavelength, y3 = windowPoints[maxIdx+1].intensity;
          const denom = (x1 - x2) * (x1 - x3) * (x2 - x3);
          const a = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / denom;
          const b = (x3 * x3 * (y1 - y2) + x2 * x2 * (y3 - y1) + x1 * x1 * (y2 - y3)) / denom;
          if (a < 0) {
            fWl = -b / (2 * a);
            fInt = a * fWl * fWl + b * fWl + (x2 * x3 * (x2 - x3) * y1 + x3 * x1 * (x3 - x1) * y2 + x1 * x2 * (x1 - x2) * y3) / denom;
          }
        }
        nextPeakResults[key] = { intensity: fInt, background: avgBg, detectedWavelength: fWl };
      } else {
        nextPeakResults[key] = { intensity: 0, background: 0, detectedWavelength: constants.lambda };
      }
    });
    setPeakResults(nextPeakResults);
  }, [selectedSpectrum, offsets, globalBias, activeSystem]);

  const calculateBoltzmann = useCallback(() => {
    if (!activeSystem) return null;
    const X: number[] = [], Y: number[] = [], points: any[] = [];
    
    (Object.entries(peakResults) as [string, PeakResult][]).forEach(([line, data]) => {
      const constants = activeSystem.transitions[line];
      const netInt = data.intensity - data.background;
      if (constants && netInt > 0) { 
        const yVal = Math.log((netInt * Math.pow(data.detectedWavelength, 4)) / constants.factor);
        X.push(constants.energy); 
        Y.push(yVal); 
        points.push({ x: constants.energy, y: yVal, line, iNet: netInt });
      }
    });

    if (X.length < 2) return null;
    const n = X.length, sumX = X.reduce((a, b) => a + b, 0), sumY = Y.reduce((a, b) => a + b, 0);
    const sumXY = X.reduce((a, b, i) => a + b * Y[i], 0), sumX2 = X.reduce((a, b) => a + b * b, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const yMean = sumY / n, ssTot = Y.reduce((a, b) => a + Math.pow(b - yMean, 2), 0);
    const ssRes = Y.reduce((a, b, i) => a + Math.pow(b - (slope * X[i] + intercept), 2), 0);
    const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
    const temp = slope !== 0 ? -PHYSICS.HC_KB / slope : 0;

    setFitResult(points.map(p => ({ ...p, fit: slope * p.x + intercept })));
    setStats({ temp, r2, slope, intercept });
    return { temp, r2, slope, intercept };
  }, [activeSystem, peakResults]);

  return {
    peakResults, setPeakResults, offsets, setOffsets, globalBias, setGlobalBias,
    fitResult, setFitResult, stats, setStats, peakSearch, calculateBoltzmann
  };
};
