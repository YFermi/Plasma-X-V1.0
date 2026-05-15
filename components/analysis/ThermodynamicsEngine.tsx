
import React, { useMemo } from 'react';
import { Shield, Zap, Wind, Thermometer, Activity, Binary, Terminal, BarChart2, Info } from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts';
import { ProjectState, PlasmaParameters } from '../../types';
import { calculateDebyeRadius, calculateIonizationLowering } from '../../utils/physics';

interface ThermodynamicsEngineProps {
  project: ProjectState;
  onUpdateResults: (id: string, p: Partial<PlasmaParameters>) => void;
}

const ThermodynamicsEngine: React.FC<ThermodynamicsEngineProps> = ({ project, onUpdateResults }) => {
  const selectedSpectrum = useMemo(() => 
    project.spectra.find(s => s.id === project.selectedSpectrumId),
    [project.spectra, project.selectedSpectrumId]
  );

  const results = useMemo(() => project.selectedSpectrumId ? project.results[project.selectedSpectrumId] : null, [project]);

  const physics = useMemo(() => {
    const ne = results?.electronDensity || 1e15;
    const te = results?.electronTemperature || 12000;
    const tg = results?.gasTemperature || 1500;
    
    const debye = calculateDebyeRadius(ne, te, ne, tg); 
    const lowering = calculateIonizationLowering(debye, 0); 
    const lambda = (4 / 3) * Math.PI * ne * Math.pow(debye, 3);

    return { debye, lowering, lambda, ne, te, tg };
  }, [results]);

  const sensitivityCurve = useMemo(() => {
    const curve = [];
    for (let t = 1000; t <= 30000; t += 1000) {
      const db = calculateDebyeRadius(physics.ne, t, physics.ne, physics.tg);
      curve.push({
        te: t,
        debye: db * 1e6,
        lowering: calculateIonizationLowering(db, 0)
      });
    }
    return curve;
  }, [physics.ne, physics.tg]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Debye-Hückel Analytics</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Binary size={12} className="text-amber-500" /> Ionization Lowering (ROUTINE_API)
            </p>
          </div>
        </div>
        <button 
           onClick={() => project.selectedSpectrumId && onUpdateResults(project.selectedSpectrumId, { 
             debyeLength: physics.debye, 
             ionizationLowering: physics.lowering, 
             plasmaParameter: physics.lambda 
           })}
           className="flex items-center gap-2 px-8 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/10 active:scale-95"
        >
          Sync State to Buffer
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <MetricCard label="Debye Length" value={(physics.debye * 1e6).toFixed(2)} unit="μm" icon={<Wind size={14}/>} />
        <MetricCard label="IP Lowering (Δχ)" value={physics.lowering.toFixed(4)} unit="eV" icon={<Zap size={14}/>} />
        <MetricCard label="Plasma Parameter (Λ)" value={physics.lambda.toExponential(2)} unit="" icon={<Activity size={14}/>} />
        <MetricCard label="Regime" value={physics.lambda > 1 ? "KINETIC" : "COLLISIONAL"} unit="" icon={<Shield size={14}/>} />
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 bg-slate-950/80 rounded-3xl border border-slate-800 p-8 shadow-2xl h-[450px]">
           <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <BarChart2 size={12} className="text-amber-500" /> Screening Sensitivity Curve
           </h4>
           <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sensitivityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.3} />
                <XAxis dataKey="te" stroke="#475569" fontSize={10} tick={{ fill: '#64748b' }} label={{ value: 'Te (K)', position: 'insideBottom', offset: -5, fill: '#475569', fontSize: 10 }} />
                <YAxis stroke="#475569" fontSize={10} tick={{ fill: '#64748b' }} label={{ value: 'R_D (μm)', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '10px' }} />
                <Area type="monotone" dataKey="debye" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} isAnimationActive={false} />
              </AreaChart>
           </ResponsiveContainer>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
           <div className="bg-slate-900/40 rounded-3xl border border-slate-800 p-6 flex flex-col gap-6">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <Terminal size={12} className="text-indigo-400" /> DH_ROUTINE_API Traces
              </h4>
              <div className="font-mono text-[10px] space-y-3 text-amber-500/70 overflow-y-auto max-h-[160px] custom-scrollbar">
                 <p className="flex justify-between"><span>ELECTRON_CHARGE:</span> <span className="text-slate-500">1.60e-19 C</span></p>
                 <p className="flex justify-between"><span>EPSILON_0:</span> <span className="text-slate-500">8.85e-12 F/m</span></p>
                 <p className="border-t border-slate-800 pt-2 text-slate-400 italic">
                   "Delta_G_DH: {physics.lowering.toFixed(4)} eV. Effective IP for Ar I = {(15.76 - physics.lowering).toFixed(3)} eV."
                 </p>
              </div>
           </div>

           <div className="p-6 bg-slate-900/20 border border-slate-800 rounded-3xl space-y-4">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <Info size={12} className="text-amber-500" /> Partition Limiters
              </h4>
              <div className="space-y-3">
                 <LimitRow label="Atomic Cutoff (n_lim)" value={Math.sqrt(13.6 / (15.7 - physics.lowering)).toFixed(1)} />
                 <LimitRow label="Molar Dissociation" value="De2 (y00 ref)" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const LimitRow = ({ label, value }: any) => (
  <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50">
    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{label}</span>
    <span className="text-[10px] font-mono text-amber-400 font-bold">{value}</span>
  </div>
);

const MetricCard = ({ label, value, unit, icon }: any) => (
  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 group hover:border-amber-500/30 transition-all duration-300">
    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">{icon} {label}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-bold text-white mono tracking-tighter">{value}</span>
      <span className="text-[10px] text-slate-500 font-bold uppercase">{unit}</span>
    </div>
  </div>
);

export default ThermodynamicsEngine;
