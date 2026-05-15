
import { useState, useMemo, useCallback } from 'react';
import { DIATOMIC_MODELS } from '../../../constants';
import { generateSyntheticManifold } from '../../../utils/spectroscopy';
import { SpectrumData } from '../../../types';

export const useMoleculeSynth = (
  activeModelId: string, 
  projectSpectra: any[], 
  selectedSpectrumId: string | null
) => {
  const [tRot, setTRot] = useState(2500);
  const [tVib, setTVib] = useState(4500);
  const [fwhmInst, setFwhmInst] = useState(0.045);
  const [wlShift, setWlShift] = useState(0);
  
  const model = useMemo(() => 
    DIATOMIC_MODELS.find(m => m.id === activeModelId) || DIATOMIC_MODELS[0],
    [activeModelId]
  );

  const [rangeMin, setRangeMin] = useState<number>(model.defaultRange[0]);
  const [rangeMax, setRangeMax] = useState<number>(model.defaultRange[1]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const resetToModelRange = useCallback(() => {
    setRangeMin(model.defaultRange[0]);
    setRangeMax(model.defaultRange[1]);
  }, [model]);

  const selectedSpectrum = useMemo(() => 
    projectSpectra.find(s => s.id === selectedSpectrumId), 
    [projectSpectra, selectedSpectrumId]
  );

  const clipBounds = useMemo(() => ({
    low: Math.min(rangeMin, rangeMax),
    high: Math.max(rangeMin, rangeMax)
  }), [rangeMin, rangeMax]);

  const croppedExp = useMemo(() => {
    if (!selectedSpectrum) return [];
    return selectedSpectrum.points.filter((p: any) => p.wavelength >= clipBounds.low && p.wavelength <= clipBounds.high);
  }, [selectedSpectrum, clipBounds]);

  const targetAxis = useMemo(() => {
    if (croppedExp.length > 0) return croppedExp.map((p: any) => p.wavelength);
    const step = 0.02;
    const axis = [];
    for (let w = clipBounds.low; w <= clipBounds.high; w += step) axis.push(w);
    return axis;
  }, [croppedExp, clipBounds]);

  const fitResult = useMemo(() => {
    const raw = generateSyntheticManifold({
      trot: tRot, tvib: tVib, inst: fwhmInst, shift: wlShift, model, targetAxis, clipBounds
    });
    
    let localMaxSim = 1e-15;
    for (let i = 0; i < raw.length; i++) if (raw[i] > localMaxSim) localMaxSim = raw[i];
    
    const simNorm = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i++) simNorm[i] = raw[i] / (localMaxSim || 1);

    if (croppedExp.length === 0) {
      return { 
        data: targetAxis.map((w, i) => ({ wavelength: w, exp: 0, sim: simNorm[i] })), 
        alpha: 1, beta: 0, r: 0 
      };
    }

    const expIntensities = croppedExp.map((p: any) => p.intensity).sort((a: any, b: any) => a - b);
    const baseline = expIntensities[Math.floor(expIntensities.length * 0.1)] || 0;
    const expPeak = expIntensities[Math.floor(expIntensities.length * 0.99)] || 1;
    const simPeak = Math.max(...Array.from(simNorm)) || 1;
    
    const alpha = (expPeak - baseline) / simPeak;
    const beta = baseline;

    let ssRes = 0;
    const n = Math.min(simNorm.length, croppedExp.length);
    for (let i = 0; i < n; i++) {
      const fit = alpha * simNorm[i] + beta;
      ssRes += Math.pow(croppedExp[i].intensity - fit, 2);
    }
    const rVal = n > 0 ? Math.sqrt(ssRes / n) / (expPeak || 1) : 0;

    return {
      data: targetAxis.map((w, i) => ({
        wavelength: w,
        exp: i < croppedExp.length ? croppedExp[i].intensity : 0,
        sim: alpha * simNorm[i] + beta
      })),
      alpha, beta, r: rVal
    };
  }, [croppedExp, targetAxis, model, tRot, tVib, fwhmInst, wlShift, clipBounds]);

  const runOptimizer = useCallback(async () => {
    if (!selectedSpectrum || croppedExp.length === 0) return null;
    setIsOptimizing(true);

    let bestTrot = tRot, bestTvib = tVib, bestShift = wlShift;
    const yExp = croppedExp.map((p: any) => p.intensity);
    const yMax = Math.max(...yExp) || 1;

    const getLoss = (tr: number, tv: number, sh: number) => {
      const s = generateSyntheticManifold({ trot: tr, tvib: tv, inst: fwhmInst, shift: sh, model, targetAxis, clipBounds });
      let mS = 1e-15;
      for (let j = 0; j < s.length; j++) if (s[j] > mS) mS = s[j];
      let loss = 0;
      const limit = Math.min(s.length, yExp.length);
      for (let j = 0; j < limit; j++) loss += Math.pow((yExp[j] / yMax) - (s[j] / mS), 2);
      return loss;
    };

    for (let i = 0; i < 40; i++) {
      const decay = Math.exp(-i / 15);
      const stepT = 500 * decay;
      const stepS = 0.02 * decay;
      const baseLoss = getLoss(bestTrot, bestTvib, bestShift);
      
      if (getLoss(bestTrot, bestTvib, bestShift + stepS) < baseLoss) bestShift += stepS;
      else if (getLoss(bestTrot, bestTvib, bestShift - stepS) < baseLoss) bestShift -= stepS;
      if (getLoss(bestTrot + stepT, bestTvib, bestShift) < baseLoss) bestTrot += stepT;
      else if (getLoss(bestTrot - stepT, bestTvib, bestShift) < baseLoss) bestTrot -= stepT;
      if (getLoss(bestTrot, bestTvib + stepT * 2, bestShift) < baseLoss) bestTvib += stepT * 2;
      else if (getLoss(bestTrot, bestTvib - stepT * 2, bestShift) < baseLoss) bestTvib -= stepT * 2;

      setTRot(bestTrot); setTVib(bestTvib); setWlShift(bestShift);
      if (i % 4 === 0) await new Promise(r => setTimeout(r, 10));
    }
    
    setIsOptimizing(false);
    return { tRot: bestTrot, tVib: bestTvib, r: fitResult.r };
  }, [selectedSpectrum, croppedExp, fwhmInst, model, targetAxis, clipBounds, tRot, tVib, wlShift, fitResult.r]);

  return {
    tRot, setTRot, tVib, setTVib, fwhmInst, setFwhmInst, wlShift, setWlShift,
    rangeMin, setRangeMin, rangeMax, setRangeMax, isOptimizing, resetToModelRange,
    fitResult, runOptimizer, model, croppedExp
  };
};
