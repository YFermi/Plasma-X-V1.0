
import React, { useState, useMemo, useCallback } from 'react';
import { 
  Zap, LineChart, Play, Sliders, Waves, Target, RefreshCw, Cpu, Globe, Activity, Thermometer, Settings, Info, AlertCircle
} from 'lucide-react';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';
import { ProjectState, PlasmaParameters } from '../../types';
import { STARK_SYSTEMS } from '../../constants';

/**
 * PIXMAP 4.0 COMPLIANT AREA-NORMALIZED PSEUDO-VOIGT
 */
function pixMapVoigt(x: number, x0: number, wG: number, wL: number, area: number, bg: number) {
  const wV = 0.5346 * wL + Math.sqrt(0.2166 * wL * wL + wG * wG);
  const peak = area / (wV * 1.065);
  const eta = Math.max(0, Math.min(1, wL / (wV || 1)));

  const dx = x - x0;
  const g = Math.exp(-2.7725887 * (dx * dx) / (wV * wV || 1));
  const l = 1 / (1 + 4 * (dx * dx) / (wV * wV || 1));
  
  return bg + peak * ((1 - eta) * g + eta * l);
}

/**
 * Argon 603 nm Stark Broadening Equation
 */
function calculateAr603StarkWidth(teK: number, neCm3: number): number {
  const TE_L = teK; 
  const NE_L = neCm3;
  const A = 0.2 * (0.2206 + 1.77e-4 * TE_L - 1.072e-8 * Math.pow(TE_L, 2) + 2.408e-13 * Math.pow(TE_L, 3));
  const part1 = 1.75e-4 * Math.pow(NE_L, 0.25);
  const part2 = 0.0628 + 0.1042 * Math.exp(-TE_L / 4216.168);
  const part3 = 1 - 0.068 * Math.pow(NE_L, 1/6) * Math.pow(TE_L, -0.5);
  return (1000 * A * (1 + part1 * part2 * part3) * 1e-16 * NE_L) / 1000;
}

function solveForNe(teK: number, targetWidthNm: number): number {
  let low = 1e12, high = 1e18;
  for (let i = 0; i < 60; i++) {
    let mid = (low + high) / 2;
    if (calculateAr603StarkWidth(teK, mid) < targetWidthNm) low = mid;
    else high = mid;
  }
  return low;
}

function solveForTe(neCm3: number, targetWidthNm: number): number {
  let low = 500, high = 100000;
  for (let i = 0; i < 60; i++) {
    let mid = (low + high) / 2;
    if (calculateAr603StarkWidth(mid, neCm3) < targetWidthNm) low = mid;
    else high = mid;
  }
  return low;
}

const ArStarkEngine: React.FC<{
  project: ProjectState;
  onUpdateResults: (id: string, p: Partial<PlasmaParameters>) => void;
}> = ({ project, onUpdateResults }) => {
  const [solveTarget, setSolveTarget] = useState<'ne' | 'te'>('ne');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [fitParams, setFitParams] = useState({ x0: 603.21, wG: 0.045, wL: 0.015, area: 10, bg: 0 });
  const [rSquared, setRSquared] = useState(0);

  const selectedSpectrum = useMemo(() => project.spectra.find(s => s.id === project.selectedSpectrumId), [project.spectra, project.selectedSpectrumId]);
  const activeSystem = STARK_SYSTEMS.find(s => s.id === 'ar_603')!;

  const targetData = useMemo(() => {
    if (!selectedSpectrum) return [];
    const lambda = activeSystem.transitions['Ar 603.2'].lambda;
    return selectedSpectrum.points.filter(p => p.wavelength >= lambda - 0.5 && p.wavelength <= lambda + 0.5);
  }, [selectedSpectrum]);

  const isCompatible = useMemo(() => {
    if (!selectedSpectrum) return false;
    const lambda = activeSystem.transitions['Ar 603.2'].lambda;
    const wls = selectedSpectrum.points.map(p => p.wavelength);
    return (lambda >= Math.min(...wls) && lambda <= Math.max(...wls));
  }, [selectedSpectrum]);

  const externalNe = useMemo(() => {
    let latestNe = 3e14;
    (Object.values(project.results) as PlasmaParameters[]).forEach(r => { if (r.electronDensity) latestNe = r.electronDensity; });
    return latestNe;
  }, [project.results]);

  const externalTe = useMemo(() => {
    let latestTe = 12000;
    (Object.values(project.results) as PlasmaParameters[]).forEach(r => { if (r.electronTemperature) latestTe = r.electronTemperature; });
    return latestTe;
  }, [project.results]);

  const runOptimizer = useCallback(async () => {
    if (targetData.length < 8 || !isCompatible) return;
    setIsOptimizing(true);

    const xExp = targetData.map(d => d.wavelength);
    const yExp = targetData.map(d => d.intensity);
    const yMax = Math.max(...yExp);
    const yMin = Math.min(...yExp);

    const cost = (p: number[]) => {
      const [x0, wG, wL, area, bg] = p;
      if (wL < 0.001 || wG < 0.001 || area < 0) return 1e30;
      let ssr = 0;
      for (let i = 0; i < xExp.length; i++) {
        const fit = pixMapVoigt(xExp[i], x0, wG, wL, area, bg);
        ssr += Math.pow(yExp[i] - fit, 2);
      }
      return ssr;
    };

    const n = 5;
    let start = [603.21, 0.045, 0.015, (yMax - yMin) * 0.05, yMin];
    let simplex = [start];
    const steps = [0.01, 0.005, 0.01, (yMax - yMin) * 0.02, 5.0];
    
    for (let i = 0; i < n; i++) {
      let p = [...start];
      p[i] += steps[i];
      simplex.push(p);
    }

    for (let i = 0; i < 800; i++) {
      simplex.sort((a, b) => cost(a) - cost(b));
      const best = simplex[0];
      const worst = simplex[n];
      const secondWorst = simplex[n - 1];

      const centroid = new Array(n).fill(0);
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < n; k++) centroid[j] += simplex[k][j];
        centroid[j] /= n;
      }

      const reflected = centroid.map((v, idx) => 2 * v - worst[idx]);
      const costR = cost(reflected);

      if (costR < cost(best)) {
        const expanded = centroid.map((v, idx) => 3 * v - 2 * worst[idx]);
        if (cost(expanded) < costR) simplex[n] = expanded;
        else simplex[n] = reflected;
      } else if (costR < cost(secondWorst)) {
        simplex[n] = reflected;
      } else {
        const contracted = centroid.map((v, idx) => 0.5 * v + 0.5 * (costR < cost(worst) ? reflected[idx] : worst[idx]));
        if (cost(contracted) < Math.min(costR, cost(worst))) simplex[n] = contracted;
        else {
          for (let j = 1; j <= n; j++) {
            simplex[j] = simplex[j].map((v, idx) => 0.5 * best[idx] + 0.5 * v);
          }
        }
      }

      if (i % 100 === 0) {
        const [x0, wG, wL, area, bg] = simplex[0];
        setFitParams({ x0, wG, wL, area, bg });
        await new Promise(r => setTimeout(r, 0));
      }
    }

    const [x0, wG, wL, area, bg] = simplex[0];
    const yMean = yExp.reduce((a, b) => a + b, 0) / yExp.length;
    const ssTot = yExp.reduce((s, y) => s + Math.pow(y - yMean, 2), 0);
    const ssRes = yExp.reduce((s, y, idx) => s + Math.pow(y - pixMapVoigt(xExp[idx], x0, wG, wL, area, bg), 2), 0);
    setRSquared(1 - (ssRes / (ssTot || 1)));
    setFitParams({ x0, wG, wL, area, bg });
    
    if (selectedSpectrum) {
      if (solveTarget === 'ne') {
        const ne = solveForNe(externalTe, wL);
        onUpdateResults(selectedSpectrum.id, { electronDensity: ne });
      } else {
        const te = solveForTe(externalNe, wL);
        onUpdateResults(selectedSpectrum.id, { electronTemperature: te });
      }
    }
    setIsOptimizing(false);
  }, [targetData, isCompatible, solveTarget, externalTe, externalNe, selectedSpectrum, onUpdateResults]);

  if (!isCompatible && selectedSpectrum) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-6 min-h-[500px]">
        <div className="p-6 bg-emerald-500/10 rounded-full text-emerald-500 border border-emerald-500/20 shadow-xl">
          <AlertCircle size={64} />
        </div>
        <h3 className="text-2xl font-bold text-white uppercase tracking-widest">Spectral Range Conflict</h3>
        <p className="text-slate-400 max-w-md italic">The selected spectrum does not cover the Argon 603.2 nm line.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/40 p-8 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-inner">
            <Zap className={`w-10 h-10 ${isOptimizing ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight uppercase">Stark Ar Engine</h3>
            <p className="text-[12px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
              <Globe size={14} className="text-emerald-500" /> Advanced Argon I Suite
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-inner">
             <button onClick={() => setSolveTarget('ne')} className={`px-4 py-2 text-[11px] font-bold uppercase rounded-lg transition-all ${solveTarget === 'ne' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Solve Density</button>
             <button onClick={() => setSolveTarget('te')} className={`px-4 py-2 text-[11px] font-bold uppercase rounded-lg transition-all ${solveTarget === 'te' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Solve Temp</button>
          </div>
          <button onClick={runOptimizer} disabled={isOptimizing || !selectedSpectrum} className="group flex items-center gap-3 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:bg-slate-800 disabled:text-slate-600 text-[14px]">
            {isOptimizing ? <RefreshCw size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />} Run Optimization
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
          <div className="p-8 bg-slate-950/50 rounded-3xl border border-slate-800 shadow-2xl space-y-8">
             <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Settings size={16} className="text-emerald-500" /> Fixed Reference</h4>
             <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Fixed Param</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">{solveTarget === 'ne' ? 'External Te' : 'External ne'}</span>
                </div>
                <div className="flex justify-between items-baseline">
                   <span className="text-3xl font-mono font-bold text-white">
                    {solveTarget === 'ne' ? externalTe.toFixed(0) : externalNe.toExponential(2)}
                   </span>
                   <span className="text-xs font-bold text-slate-600 uppercase">{solveTarget === 'ne' ? 'K' : 'cm⁻³'}</span>
                </div>
             </div>
             <ParamRow label="Gaussian wG" value={fitParams.wG} unit="nm" />
             <ParamRow label="Lorentzian wL" value={fitParams.wL} unit="nm" highlight />
             
             <div className="bg-emerald-500/5 rounded-2xl border border-emerald-500/20 p-8 shadow-inner text-center group transition-all hover:bg-emerald-500/10">
                <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-3 italic">Output {solveTarget === 'ne' ? 'Density' : 'Temp'}</p>
                <div className="flex flex-col items-center">
                   <span className="text-5xl font-mono font-bold text-white tracking-tighter group-hover:text-emerald-400 transition-colors">
                    {solveTarget === 'ne' 
                      ? solveForNe(externalTe, fitParams.wL).toExponential(2)
                      : solveForTe(externalNe, fitParams.wL).toFixed(0)}
                   </span>
                   <span className="text-[14px] text-slate-500 font-bold uppercase mt-2">{solveTarget === 'ne' ? 'cm⁻³' : 'K'}</span>
                </div>
             </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 bg-slate-950/80 rounded-3xl border border-slate-800 p-10 h-[650px] relative overflow-hidden shadow-2xl flex flex-col">
           <div className="absolute top-10 right-10 flex flex-col items-end gap-3 z-10 bg-slate-950/60 p-5 rounded-2xl backdrop-blur-md border border-slate-800 shadow-2xl">
              <span className="flex items-center gap-3 text-[12px] font-bold text-rose-500 uppercase tracking-widest">
                <div className="w-5 h-0.5 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"/> Experimental
              </span>
              <span className="flex items-center gap-3 text-[12px] font-bold text-emerald-400 uppercase tracking-widest">
                <div className="w-5 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]"/> Model Fit
              </span>
           </div>
           <h4 className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-12 flex items-center gap-2">
              <LineChart size={20} className="text-emerald-500" /> Stark-Voigt Synthesis Overlay
           </h4>
           <div className="flex-1">
             <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={useMemo(() => targetData.map(p => ({ 
                  wavelength: p.wavelength, 
                  exp: p.intensity, 
                  fit: pixMapVoigt(p.wavelength, fitParams.x0, fitParams.wG, fitParams.wL, fitParams.area, fitParams.bg)
                })), [targetData, fitParams])}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.2} />
                  <XAxis dataKey="wavelength" type="number" domain={['auto', 'auto']} stroke="#475569" fontSize={14} tickFormatter={v => v.toFixed(2)} tick={{ fill: '#64748b' }} />
                  <YAxis stroke="#475569" fontSize={14} hide />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px', fontSize: '14px', color: '#fff' }} />
                  <Line dataKey="exp" stroke="#f43f5e" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line dataKey="fit" stroke="#10b981" strokeWidth={5} dot={false} isAnimationActive={false} strokeLinecap="round" />
                </ComposedChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
};

const ParamRow = ({ label, value, unit, highlight }: any) => (
  <div className="flex justify-between items-center px-1 border-b border-slate-900 pb-4">
    <span className={`text-[12px] font-bold uppercase tracking-widest ${highlight ? 'text-white' : 'text-slate-500'}`}>{label}</span>
    <span className={`text-[13px] font-mono font-bold ${highlight ? 'text-emerald-400' : 'text-slate-300'}`}>{value.toFixed(4)} {unit}</span>
  </div>
);

export default ArStarkEngine;
