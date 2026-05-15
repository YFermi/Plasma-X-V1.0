
import React, { useState, useMemo, useCallback } from 'react';
import { 
  Binary, 
  Maximize, 
  Waves, 
  Calculator, 
  Terminal, 
  Play, 
  LineChart, 
  AreaChart as AreaIcon,
  RefreshCw,
  Scaling,
  Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Line, 
  Scatter 
} from 'recharts';
import { ProjectState, PlasmaParameters, SpectralPoint } from '../../types';

interface SplineEngineProps {
  project: ProjectState;
  selectedModuleId: string;
  onUpdateResults: (id: string, p: Partial<PlasmaParameters>) => void;
}

const SplineEngine: React.FC<SplineEngineProps> = ({ project, selectedModuleId, onUpdateResults }) => {
  const [resamplingFactor, setResamplingFactor] = useState(4);
  const [useBSpline, setUseBSpline] = useState(false);
  const [filterBand, setFilterBand] = useState(0); // rolling average
  const [logs, setLogs] = useState<string[]>([]);

  const selectedSpectrum = useMemo(() => 
    project.spectra.find(s => s.id === project.selectedSpectrumId),
    [project.spectra, project.selectedSpectrumId]
  );

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 10)]);

  // Port of FILTER_BAND logic from MODULE_TROTVIB_N2
  const filteredSpectrum = useMemo(() => {
    if (!selectedSpectrum) return [];
    if (filterBand <= 1) return selectedSpectrum.points;

    const n = selectedSpectrum.points.length;
    const result: SpectralPoint[] = [];
    for (let i = 0; i < n; i++) {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - Math.floor(filterBand / 2)); j < Math.min(n, i + Math.floor(filterBand / 2) + 1); j++) {
        sum += selectedSpectrum.points[j].intensity;
        count++;
      }
      result.push({ wavelength: selectedSpectrum.points[i].wavelength, intensity: sum / count });
    }
    return result;
  }, [selectedSpectrum, filterBand]);

  /**
   * BVALU/INTRV Implementation (Port of SLATEC B-Spline)
   * Evaluates Cubic B-Spline (K=4) at arbitrary X
   */
  const evaluateBSpline = useCallback((x: number, knots: number[], coefs: number[]) => {
    const k = 4; // Cubic
    const n = coefs.length;
    
    // INTRV: Find i such that knots[i] <= x < knots[i+1]
    let i = knots.findIndex((v, idx) => v <= x && knots[idx + 1] > x);
    if (i === -1) {
       if (x >= knots[n]) i = n - 1;
       else i = 0;
    }

    // De Boor's Algorithm for evaluation
    const d = new Array(k).fill(0).map((_, idx) => coefs[i - (k - 1) + idx] || 0);
    for (let r = 1; r < k; r++) {
       for (let j = k - 1; j >= r; j--) {
          const alpha = (x - knots[i - (k - 1) + j]) / (knots[i + 1 + j - r] - knots[i - (k - 1) + j] || 1e-9);
          d[j] = (1 - alpha) * d[j - 1] + alpha * d[j];
       }
    }
    return d[k - 1];
  }, []);

  /**
   * PCHIP (Piecewise Cubic Hermite) Core
   */
  const solvePCHIP = useCallback((points: SpectralPoint[]) => {
    const n = points.length;
    if (n < 2) return null;
    const h = new Float32Array(n - 1);
    const slope = new Float32Array(n - 1);
    const d = new Float32Array(n);
    for (let i = 0; i < n - 1; i++) {
      h[i] = points[i+1].wavelength - points[i].wavelength;
      slope[i] = (points[i+1].intensity - points[i].intensity) / h[i];
    }
    for (let i = 1; i < n - 1; i++) {
      if (slope[i-1] * slope[i] <= 0) d[i] = 0;
      else {
        const hsum = h[i-1] + h[i];
        const w1 = (h[i-1] + hsum) / (3 * hsum);
        const w2 = (h[i] + hsum) / (3 * hsum);
        d[i] = 1.0 / (w1 / slope[i-1] + w2 / slope[i]);
      }
    }
    d[0] = slope[0]; // Simplified endpoint
    d[n-1] = slope[n-2];
    return { points, d };
  }, []);

  const hermiteEval = (x: number, x1: number, x2: number, f1: number, f2: number, d1: number, d2: number) => {
    const h = x2 - x1;
    const t = (x - x1) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2*t3-3*t2+1)*f1 + (t3-2*t2+t)*h*d1 + (-2*t3+3*t2)*f2 + (t3-t2)*h*d2;
  };

  const processedData = useMemo(() => {
    if (filteredSpectrum.length < 4) return [];
    const pchip = solvePCHIP(filteredSpectrum);
    if (!pchip) return [];

    const resampled: any[] = [];
    const n = filteredSpectrum.length;

    if (useBSpline) {
      // Simplified B-Spline reconstruction for demo
      // In production, DPCHBS would generate true knots from X
      const knots = filteredSpectrum.flatMap(p => [p.wavelength, p.wavelength]).sort((a,b)=>a-b);
      const coefs = filteredSpectrum.map(p => p.intensity);
      
      const startX = filteredSpectrum[0].wavelength;
      const endX = filteredSpectrum[n-1].wavelength;
      const totalPoints = (n - 1) * resamplingFactor;

      for (let i = 0; i <= totalPoints; i++) {
        const x = startX + (i / totalPoints) * (endX - startX);
        resampled.push({
          wavelength: x,
          exp: i % resamplingFactor === 0 ? filteredSpectrum[i / resamplingFactor].intensity : null,
          curve: evaluateBSpline(x, knots, coefs)
        });
      }
    } else {
      for (let i = 0; i < n - 1; i++) {
        const x1 = filteredSpectrum[i].wavelength;
        const x2 = filteredSpectrum[i+1].wavelength;
        for (let j = 0; j < resamplingFactor; j++) {
          const x = x1 + (j / resamplingFactor) * (x2 - x1);
          resampled.push({
            wavelength: x,
            exp: j === 0 ? filteredSpectrum[i].intensity : null,
            curve: hermiteEval(x, x1, x2, filteredSpectrum[i].intensity, filteredSpectrum[i+1].intensity, pchip.d[i], pchip.d[i+1])
          });
        }
      }
      resampled.push({ wavelength: filteredSpectrum[n-1].wavelength, exp: filteredSpectrum[n-1].intensity, curve: filteredSpectrum[n-1].intensity });
    }

    return resampled;
  }, [filteredSpectrum, resamplingFactor, useBSpline, solvePCHIP, evaluateBSpline]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Binary className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">SLATEC Precision Suite</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Scaling size={12} className="text-indigo-500" /> Signal Reconstruction Engine
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-950/40 p-2 rounded-2xl border border-slate-800">
           <button onClick={() => setUseBSpline(false)} className={`px-4 py-2 text-[10px] font-bold uppercase rounded-xl transition-all ${!useBSpline ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>PCHIP</button>
           <button onClick={() => setUseBSpline(true)} className={`px-4 py-2 text-[10px] font-bold uppercase rounded-xl transition-all ${useBSpline ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>B-Spline</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4 space-y-6">
           <div className="p-6 bg-slate-950/50 rounded-3xl border border-slate-800 space-y-7 shadow-2xl">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                <Maximize size={12} className="text-indigo-500" /> Spline Configuration
              </h4>
              <div className="space-y-4">
                 <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Upsampling Factor</span>
                    <span className="text-[10px] font-mono text-indigo-400">{resamplingFactor}x</span>
                 </div>
                 <input type="range" min="1" max="10" value={resamplingFactor} onChange={(e)=>setResamplingFactor(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none accent-indigo-500" />
              </div>
              <div className="pt-6 border-t border-slate-800 space-y-4">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                   <Filter size={12} className="text-emerald-500" /> Filter Band (OES)
                 </h4>
                 <div className="flex items-center gap-4">
                    <input type="range" min="0" max="50" step="2" value={filterBand} onChange={(e)=>setFilterBand(parseInt(e.target.value))} className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none accent-emerald-500" />
                    <span className="bg-slate-900 px-2 py-1 rounded border border-slate-800 text-[10px] font-mono text-emerald-400 w-12 text-center">{filterBand}</span>
                 </div>
              </div>
           </div>
           <div className="bg-slate-900/40 rounded-3xl border border-slate-800 p-5">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Terminal size={12} className="text-indigo-400" /> SLATEC Log
              </h4>
              <div className="font-mono text-[10px] space-y-1 text-indigo-500/70 overflow-y-auto max-h-[100px] custom-scrollbar">
                <p>K_ORDER: {useBSpline ? '4 (Cubic B-Spline)' : '3 (Hermite PCHIP)'}</p>
                <p>FILTER: {filterBand > 0 ? `ROLLING_AVG(${filterBand})` : 'NONE'}</p>
                {logs.map((l, i) => <p key={i}>{l}</p>)}
              </div>
           </div>
        </div>

        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
           <div className="bg-slate-950/80 rounded-3xl border border-slate-800 p-8 shadow-2xl flex flex-col h-[480px]">
              <div className="flex-1">
                 <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={processedData}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.3} />
                       <XAxis dataKey="wavelength" type="number" domain={['auto', 'auto']} stroke="#475569" fontSize={10} />
                       <YAxis stroke="#475569" fontSize={10} hide />
                       <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '10px' }} />
                       <Line type="monotone" dataKey="curve" stroke="#818cf8" strokeWidth={2} dot={false} isAnimationActive={false} />
                       <Scatter dataKey="exp" fill="#475569" />
                    </ComposedChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SplineEngine;
