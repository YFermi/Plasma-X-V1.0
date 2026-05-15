
import React, { useState, useMemo, useEffect } from 'react';
import { Waves, Zap, LineChart, Terminal, Play, Settings2, Shield, Table, Gauge, Globe } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, Line, Legend } from 'recharts';
import { ProjectState, PlasmaParameters } from '../../types';
import { PHYSICS } from '../../constants';

const REACTION_DATA: Record<number, number> = {
  0.001: 1.08e-15, 0.0015: 1.47e-15, 0.002: 1.724e-15, 0.005: 1.6e-15, 0.01: 1.8e-15, 
  0.05: 2.5e-15, 0.1: 3.5e-15, 0.2: 4.8e-15, 0.5: 7.0e-15, 0.55: 7.215e-15, 
  1.0: 1.2e-14, 2.0: 2.5e-14, 5.0: 6.0e-14, 10.0: 1.2e-13
};

const TE_KEYS = Object.keys(REACTION_DATA).map(Number).sort((a, b) => a - b);

function interpolateKm(te: number): number {
  if (REACTION_DATA[te]) return REACTION_DATA[te];
  if (te <= TE_KEYS[0]) return REACTION_DATA[TE_KEYS[0]];
  if (te >= TE_KEYS[TE_KEYS.length - 1]) return REACTION_DATA[TE_KEYS[TE_KEYS.length - 1]];
  let i = 0; while (TE_KEYS[i + 1] < te) i++;
  const x0 = TE_KEYS[i], y0 = REACTION_DATA[x0];
  const x1 = TE_KEYS[i + 1], y1 = REACTION_DATA[x1];
  return y0 + (te - x0) * (y1 - y0) / (x1 - x0);
}

const PermittivityEngine: React.FC<{
  project: ProjectState;
  onUpdateResults: (id: string, p: Partial<PlasmaParameters>) => void;
}> = ({ project, onUpdateResults }) => {
  // Aggregate latest global results
  const globalParams = useMemo(() => {
    let tg = 300, ne = 1e12;
    // Fix: Explicitly type iterating over results to avoid unknown property errors
    (Object.values(project.results) as PlasmaParameters[]).forEach(r => {
      if (r.gasTemperature) tg = r.gasTemperature;
      if (r.electronDensity) ne = r.electronDensity;
    });
    return { tg, ne };
  }, [project.results]);

  const [pressureMbar, setPressureMbar] = useState(10);
  const [fGHz, setFGHz] = useState(2.45);
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 8)]);

  const globals = useMemo(() => {
    const pressurePa = pressureMbar * 100;
    const nAr = pressurePa / (PHYSICS.KBOLTZ * globalParams.tg);
    const omega = 2 * Math.PI * fGHz * 1e9;
    const nE_m3 = globalParams.ne; // Assuming results already in m^-3 or handled
    const omegaP = Math.sqrt((nE_m3 * Math.pow(PHYSICS.E_CHARGE, 2)) / (PHYSICS.E_MASS * PHYSICS.EPSILON_0));
    const ratioOpO = omegaP / omega;
    const skinDepth = (PHYSICS.C_LIGHT / (omegaP || 1)) * 1000;
    return { nAr, omega, omegaP, ratioOpO, skinDepth };
  }, [pressureMbar, globalParams, fGHz]);

  const results = useMemo(() => {
    const data: any[] = [];
    const teValues = [0.001, 0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0];
    teValues.forEach(te => {
      const km = interpolateKm(te);
      const nuM = globals.nAr * km;
      const ratioNuO = nuM / globals.omega;
      const denominator = 1 + Math.pow(ratioNuO, 2);
      const epsReal = 1 - (Math.pow(globals.ratioOpO, 2) / denominator);
      const epsImag = (ratioNuO * Math.pow(globals.ratioOpO, 2)) / denominator;
      data.push({ te, km, nuM, ratioNuO, epsReal, epsImag });
    });
    return data;
  }, [globals]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/40 p-8 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-inner">
            <Waves className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight uppercase">Permittivity Analysis Hub</h3>
            <p className="text-[12px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Globe size={14} className="text-indigo-500" /> Automatic Te-Sweep from Global State
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-6 py-3 bg-slate-950/40 border border-slate-800 rounded-2xl">
           <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Input Tg</span>
              <span className="text-sm font-mono text-cyan-400 font-bold">{globalParams.tg.toFixed(0)} K</span>
           </div>
           <div className="w-[1px] h-8 bg-slate-800" />
           <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Input ne</span>
              <span className="text-sm font-mono text-rose-400 font-bold">{globalParams.ne.toExponential(1)}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-8">
        <MetricCard label="Neutral Den." value={globals.nAr.toExponential(2)} unit="m⁻³" icon={<Shield size={16}/>} />
        <MetricCard label="Plasma Freq" value={(globals.omegaP / 1e9).toFixed(2)} unit="GHz" icon={<Zap size={16}/>} />
        <MetricCard label="Interaction" value={globals.ratioOpO.toFixed(3)} unit="ωp/ω" icon={<Gauge size={16}/>} />
        <MetricCard label="Skin Depth" value={globals.skinDepth.toFixed(2)} unit="mm" icon={<Waves size={16}/>} />
      </div>

      <div className="grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-4 space-y-8">
           <div className="p-8 bg-slate-950/50 rounded-3xl border border-slate-800 space-y-8 shadow-2xl">
              <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                <Settings2 size={16} className="text-indigo-500" /> Model Controls
              </h4>
              <SliderControl label="Argon Pressure" value={pressureMbar} unit="mbar" step={1} min={1} max={1000} onChange={setPressureMbar} />
              <SliderControl label="Operating Frequency" value={fGHz} unit="GHz" step={0.01} min={0.1} max={10.0} onChange={setFGHz} />
           </div>

           <div className="bg-slate-900/40 rounded-3xl border border-slate-800 p-8 flex flex-col min-h-[250px] shadow-inner">
              <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Terminal size={16} className="text-emerald-400" /> Dielectric Traces
              </h4>
              <div className="font-mono text-[12px] space-y-2 text-indigo-400/70 overflow-y-auto max-h-[200px] custom-scrollbar">
                <p>STATUS: AUTO_SYNC_TG_NE</p>
                <p>OP_O_RATIO: {globals.ratioOpO.toFixed(4)}</p>
                {logs.map((l, i) => <p key={i}>{l}</p>)}
              </div>
           </div>
        </div>

        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
           <div className="bg-slate-950/80 rounded-3xl border border-slate-800 p-10 shadow-2xl flex flex-col h-[550px] relative overflow-hidden">
              <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-8 flex items-center justify-between">
                <span className="flex items-center gap-2"><LineChart size={16} className="text-indigo-500" /> Complex Dielectric Response Sweep</span>
              </h4>
              <div className="flex-1">
                 <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={results}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.2} />
                       <XAxis dataKey="te" type="number" scale="log" domain={[0.001, 10]} stroke="#475569" fontSize={12} tick={{ fill: '#64748b' }} />
                       <YAxis stroke="#475569" fontSize={12} tick={{ fill: '#64748b' }} />
                       <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px', fontSize: '13px' }} />
                       <Legend verticalAlign="top" height={40}/>
                       <Line name="Real (ε')" type="monotone" dataKey="epsReal" stroke="#10b981" strokeWidth={4} dot={{ r: 5 }} isAnimationActive={false} />
                       <Line name="Loss (ε'')" type="monotone" dataKey="epsImag" stroke="#818cf8" strokeWidth={4} dot={{ r: 5 }} isAnimationActive={false} />
                    </ComposedChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const SliderControl = ({ label, value, unit, step, min, max, onChange }: any) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center px-1">
      <span className="text-[12px] font-bold text-slate-400 uppercase">{label}</span>
      <span className="bg-slate-900 px-3 py-1 rounded text-[12px] font-mono text-indigo-400 border border-slate-800">{value} {unit}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
  </div>
);

const MetricCard = ({ label, value, unit, icon }: any) => (
  <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 group hover:border-indigo-500/30 transition-all duration-300 shadow-xl">
    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">{icon} {label}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-bold text-white font-mono tracking-tighter">{value}</span>
      <span className="text-[11px] text-slate-500 font-bold uppercase">{unit}</span>
    </div>
  </div>
);

export default PermittivityEngine;
