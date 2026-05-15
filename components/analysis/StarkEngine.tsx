
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Zap, LineChart, Play, Sliders, RefreshCw, Globe, Activity, AlertCircle
} from 'lucide-react';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';
import { ProjectState, PlasmaParameters } from '../../types';
import { STARK_SYSTEMS } from '../../constants';
import { useStarkSolver, pixMapVoigt } from './stark/StarkSolver';

const StarkEngine: React.FC<{
  project: ProjectState;
  selectedModuleId: string;
  onUpdateResults: (id: string, p: Partial<PlasmaParameters>) => void;
}> = ({ project, onUpdateResults }) => {
  const [activeId, setActiveId] = useState<'h_alpha' | 'h_beta'>('h_alpha');
  const isHBeta = activeId === 'h_beta';
  
  const { isOptimizing, fitParams, rSquared, runOptimizer } = useStarkSolver(isHBeta);

  const activeSystem = useMemo(() => STARK_SYSTEMS.find(s => s.id === activeId)!, [activeId]);
  const selectedSpectrum = useMemo(() => project.spectra.find(s => s.id === project.selectedSpectrumId), [project.spectra, project.selectedSpectrumId]);

  const targetData = useMemo(() => {
    if (!selectedSpectrum) return [];
    const lambda = activeSystem.transitions[isHBeta ? 'H-beta' : 'H-alpha'].lambda;
    const window = isHBeta ? 12.0 : 8.0; 
    return selectedSpectrum.points.filter(p => p.wavelength >= lambda - window && p.wavelength <= lambda + window);
  }, [selectedSpectrum, activeSystem, isHBeta]);

  const isCompatible = useMemo(() => {
    if (!selectedSpectrum) return false;
    const lambda = activeSystem.transitions[isHBeta ? 'H-beta' : 'H-alpha'].lambda;
    const wls = selectedSpectrum.points.map(p => p.wavelength);
    return (lambda >= Math.min(...wls) && lambda <= Math.max(...wls));
  }, [selectedSpectrum, isHBeta, activeSystem]);

  const currentNe = useMemo(() => {
    const { wL } = fitParams;
    if (wL <= 0) return 0;
    return activeId === 'h_alpha' 
      ? 1e17 * Math.pow(Math.max(0.001, wL - 0.015) / 1.098, 1.60)
      : 1e17 * Math.pow(wL / 4.74, 1.49);
  }, [activeId, fitParams.wL]);

  const handleRun = useCallback(async () => {
    const result = await runOptimizer(targetData);
    if (result && selectedSpectrum) {
      onUpdateResults(selectedSpectrum.id, { electronDensity: currentNe });
    }
  }, [runOptimizer, targetData, selectedSpectrum, currentNe, onUpdateResults]);

  useEffect(() => {
    if (selectedSpectrum && targetData.length > 15 && isCompatible && !isOptimizing) {
      handleRun();
    }
  }, [selectedSpectrum?.id, activeId]);

  if (!isCompatible && selectedSpectrum) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-6 min-h-[500px]">
        <div className="p-6 bg-rose-500/10 rounded-full text-rose-500 border border-rose-500/20 shadow-xl"><AlertCircle size={64} /></div>
        <h3 className="text-2xl font-bold text-white uppercase tracking-widest">Wavelength Range Discontinuity</h3>
        <p className="text-slate-400 max-w-md italic">Hydrogen emission lines not detected in selected buffer range.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/40 p-8 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-inner">
            <Zap className={`w-10 h-10 ${isOptimizing ? 'animate-pulse text-emerald-300' : ''}`} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight uppercase">Stark H Engine</h3>
            <p className="text-[12px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
              <Globe size={14} className="text-emerald-500" /> PixMap 4.0 Standard Optimized
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
             <button onClick={() => setActiveId('h_alpha')} className={`px-6 py-2.5 text-[11px] font-bold uppercase rounded-lg transition-all ${activeId === 'h_alpha' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>H-Alpha</button>
             <button onClick={() => setActiveId('h_beta')} className={`px-6 py-2.5 text-[11px] font-bold uppercase rounded-lg transition-all ${activeId === 'h_beta' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>H-Beta</button>
          </div>
          <button onClick={handleRun} disabled={isOptimizing || !selectedSpectrum} className="group flex items-center gap-3 px-10 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:bg-slate-800 disabled:text-slate-600 text-[15px]">
            {isOptimizing ? <RefreshCw size={22} className="animate-spin" /> : <Play size={22} fill="currentColor" />} {isOptimizing ? 'Optimizing...' : 'Manual Run'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
          <div className="p-8 bg-slate-950/50 rounded-3xl border border-slate-800 shadow-2xl space-y-9">
             <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Sliders size={20} className="text-emerald-500" /> Solver Matrix</h4>
             <ParamRow label="Gaussian wG" value={fitParams.wG} unit="nm" />
             <ParamRow label="Lorentzian wL" value={fitParams.wL} unit="nm" highlight />
             {isHBeta && <ParamRow label="Splitting (δ)" value={fitParams.splt} unit="nm" />}
             
             <div className="bg-emerald-500/5 rounded-2xl border border-emerald-500/20 p-8 shadow-inner group transition-all hover:bg-emerald-500/10 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={40} className="text-emerald-500" /></div>
                <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-3 italic">Calculated ne</p>
                <div className="flex flex-col items-center">
                  <span className="text-5xl font-mono font-bold text-white tracking-tighter group-hover:text-emerald-400 transition-colors">
                    {currentNe > 0 ? currentNe.toExponential(2) : "0.00e+0"}
                  </span>
                  <span className="text-[14px] text-slate-500 font-bold uppercase mt-2">cm⁻³</span>
                </div>
             </div>
             <div className="flex justify-between items-center px-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Fit Stability (R²)</span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">{rSquared.toFixed(6)}</span>
             </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 bg-slate-950/80 rounded-3xl border border-slate-800 p-10 h-[650px] relative overflow-hidden shadow-2xl flex flex-col">
           <div className="absolute top-10 right-10 flex flex-col items-end gap-3 z-10 bg-slate-950/60 p-5 rounded-2xl backdrop-blur-md border border-slate-800 shadow-2xl">
              <span className="flex items-center gap-3 text-[12px] font-bold text-rose-500 uppercase tracking-widest"><div className="w-5 h-0.5 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"/> Experimental</span>
              <span className="flex items-center gap-3 text-[12px] font-bold text-emerald-400 uppercase tracking-widest"><div className="w-5 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]"/> Model Fit</span>
           </div>
           <h4 className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-12 flex items-center gap-2"><LineChart size={20} className="text-emerald-500" /> Stark-Voigt Profile Overlay</h4>
           <div className="flex-1">
             <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={useMemo(() => targetData.map(p => ({ 
                  wavelength: p.wavelength, 
                  exp: p.intensity, 
                  fit: pixMapVoigt(p.wavelength, fitParams, isHBeta)
                })), [targetData, fitParams, isHBeta])}>
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

export default StarkEngine;
