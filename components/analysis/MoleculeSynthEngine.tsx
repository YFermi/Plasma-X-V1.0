
import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, LineChart, Thermometer, Terminal, Activity, Sliders, Scale, Cpu, Target, Search, ArrowLeftRight, Undo2, Maximize, Focus } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import { ProjectState, PlasmaParameters } from '../../types';
import { DIATOMIC_MODELS } from '../../constants';
import { useMoleculeSynth } from './molecule/useMoleculeSynth';

const MoleculeSynthEngine: React.FC<{
  project: ProjectState;
  onUpdateResults: (spectrumId: string, params: Partial<PlasmaParameters>) => void;
}> = ({ project, onUpdateResults }) => {
  const [activeModelId, setActiveModelId] = useState(DIATOMIC_MODELS[0].id);
  const [logs, setLogs] = useState<string[]>([]);

  const {
    tRot, setTRot, tVib, setTVib, fwhmInst, setFwhmInst, wlShift, setWlShift,
    rangeMin, setRangeMin, rangeMax, setRangeMax, isOptimizing, resetToModelRange,
    fitResult, runOptimizer, model, croppedExp
  } = useMoleculeSynth(activeModelId, project.spectra, project.selectedSpectrumId);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);

  useEffect(() => {
    resetToModelRange();
    addLog(`ENGINE: Switched model to ${model.name}`);
  }, [model, resetToModelRange]);

  const handleRun = async () => {
    const result = await runOptimizer();
    if (result && project.selectedSpectrumId) {
      onUpdateResults(project.selectedSpectrumId, {
        gasTemperature: result.tRot,
        vibrationalTemperature: result.tVib,
        fitQuality: 1 - result.r
      });
      addLog(`SUCCESS: Alignment complete (R=${result.r.toFixed(4)})`);
    } else {
      addLog("ABORT: Viewport buffer empty.");
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/40 p-7 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-400"><Cpu className="w-7 h-7" /></div>
          <div>
            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Molecular Synthesizer</h3>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Scale size={14} className="text-cyan-500" /> Structural Matching Logic Core v9.9
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <select value={activeModelId} onChange={(e) => setActiveModelId(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-5 py-3 text-[13px] font-bold text-slate-300 outline-none hover:bg-slate-800 min-w-[280px] shadow-lg">
            {DIATOMIC_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button onClick={handleRun} disabled={isOptimizing || !project.selectedSpectrumId} className="flex items-center gap-2 px-10 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:bg-slate-800 disabled:text-slate-500 text-[13px]">
            {isOptimizing ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />} Compute Manifold
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="p-7 bg-slate-950/50 rounded-3xl border border-slate-800 shadow-2xl space-y-8">
             <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Sliders size={14} className="text-cyan-500" /> Matrix States</h4>
             <ManualControl label="Rotational Temp (Tg)" value={tRot} unit="K" min={300} max={15000} step={1} onChange={setTRot} icon={<Thermometer size={16} className="text-cyan-400"/>} />
             <ManualControl label="Vibrational Temp (Tv)" value={tVib} unit="K" min={300} max={30000} step={1} onChange={setTVib} icon={<Activity size={16} className="text-emerald-400"/>} />
             <ManualControl label="Instrument FWHM" value={fwhmInst} unit="nm" min={0.005} max={0.5} step={0.001} onChange={setFwhmInst} icon={<Focus size={16} className="text-slate-500"/>} />
             
             <div className="pt-7 border-t border-slate-800">
                <div className="flex justify-between items-center mb-6">
                   <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Target size={14} className="text-cyan-500" /> Viewport</h4>
                   <button onClick={resetToModelRange} className="text-[10px] font-bold text-slate-600 hover:text-cyan-400 transition-colors flex items-center gap-1"><Undo2 size={12}/> Reset</button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-5">
                   <div className="space-y-1"><label className="text-[10px] font-bold text-slate-600 uppercase">Start (nm)</label>
                      <input type="number" value={rangeMin} step={0.1} onChange={(e) => setRangeMin(parseFloat(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[12px] font-mono text-cyan-400 outline-none" />
                   </div>
                   <div className="space-y-1"><label className="text-[10px] font-bold text-slate-600 uppercase">End (nm)</label>
                      <input type="number" value={rangeMax} step={0.1} onChange={(e) => setRangeMax(parseFloat(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[12px] font-mono text-cyan-400 outline-none" />
                   </div>
                </div>
                <ManualControl label="λ Calibration Shift" value={wlShift} unit="nm" min={-3} max={3} step={0.001} onChange={setWlShift} icon={<ArrowLeftRight size={16} className="text-amber-400" />} />
             </div>
          </div>
          
          <div className="bg-slate-900/40 rounded-3xl border border-slate-800 p-6 min-h-[160px] flex flex-col shadow-inner">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Terminal size={14} className="text-indigo-400" /> Quantum Trace</h4>
            <div className="flex-1 font-mono text-[11px] space-y-1.5 text-cyan-500/70 overflow-y-auto max-h-[160px] custom-scrollbar">
              <p className="text-slate-600">SYST_KIND: {model.name}</p>
              <p className="text-slate-600">STATE: {isOptimizing ? 'LOCKING_PEAKS' : 'IDLE_READY'}</p>
              {logs.map((log, i) => <p key={i}>{log}</p>)}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-950/80 rounded-3xl border border-slate-800 p-9 shadow-2xl flex flex-col h-[520px] relative overflow-hidden">
             <div className="absolute top-8 right-8 flex flex-col items-end gap-2.5 z-10 bg-slate-950/40 p-3 rounded-xl backdrop-blur-md border border-slate-800/50">
               <span className="flex items-center gap-2.5 text-[11px] font-bold text-red-500 uppercase"><div className="w-4 h-0.5 bg-red-500"/> Experimental</span>
               <span className="flex items-center gap-2.5 text-[11px] font-bold text-cyan-400 uppercase"><div className="w-4 h-0.5 bg-cyan-400"/> Simulation</span>
             </div>
             <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-7 flex items-center gap-2"><LineChart size={14} className="text-cyan-500" /> Profile Synthesis Overlay</h4>
             <div className="flex-1">
               <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={fitResult.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.2} />
                    <XAxis dataKey="wavelength" type="number" domain={['auto', 'auto']} stroke="#475569" fontSize={11} tick={{ fill: '#64748b' }} tickFormatter={(v) => v.toFixed(2)} />
                    <YAxis stroke="#475569" fontSize={11} hide />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '11px' }} />
                    <Line dataKey="exp" stroke="#ef4444" strokeWidth={1} dot={false} isAnimationActive={false} />
                    <Line dataKey="sim" stroke="#22d3ee" strokeWidth={3} dot={false} isAnimationActive={false} />
                  </ComposedChart>
               </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-3xl border border-emerald-500/10 p-7 flex flex-col shadow-inner">
             <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-5"><Target size={14} /> Global Analytics Summary</h4>
             <div className="grid grid-cols-5 gap-5">
                <SummaryCard label="Gas Temp (Tg)" value={tRot.toFixed(0)} unit="K" icon={<Thermometer size={16} className="text-cyan-400"/>} highlight />
                <SummaryCard label="Vibrational (Tv)" value={tVib.toFixed(0)} unit="K" icon={<Activity size={16} className="text-emerald-400"/>} />
                <SummaryCard label="RMS Variance" value={fitResult.r.toFixed(5)} unit="" icon={<Search size={16} className="text-rose-400"/>} />
                <SummaryCard label="Signal Scale" value={fitResult.alpha.toExponential(1)} unit="" icon={<Maximize size={16} className="text-indigo-400"/>} />
                <SummaryCard label="Baseline Ref" value={fitResult.beta.toFixed(1)} unit="cnts" icon={<ArrowLeftRight size={16} className="text-amber-400"/>} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, unit, icon, highlight }: any) => (
  <div className={`flex flex-col gap-2.5 p-4 rounded-2xl border transition-all duration-300 ${highlight ? 'bg-emerald-500/5 border-emerald-500/20 shadow-lg' : 'bg-slate-950/40 border-slate-800'}`}>
     <div className="flex items-center gap-2">{icon}<span className="text-[10px] font-bold text-slate-500 uppercase truncate">{label}</span></div>
     <div className="flex items-baseline gap-1.5"><span className={`text-base font-mono font-bold ${highlight ? 'text-emerald-400' : 'text-slate-200'}`}>{value}</span><span className="text-[9px] text-slate-600 font-bold uppercase">{unit}</span></div>
  </div>
);

const ManualControl = ({ label, value, min, max, step=1, unit, onChange, icon }: any) => (
  <div className="space-y-4 group">
    <div className="flex justify-between items-center px-1">
      <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-400 uppercase">
        <span className="text-slate-500 group-hover:text-cyan-400 transition-colors">{icon}</span> {label}
      </div>
      <div className="bg-slate-900 px-2.5 py-1 rounded border border-slate-800 font-mono text-[11px] text-cyan-400">{typeof value === 'number' ? value.toFixed(1) : value} {unit}</div>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 transition-all hover:accent-cyan-400" />
  </div>
);

export default MoleculeSynthEngine;
