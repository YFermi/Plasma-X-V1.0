
import React, { useMemo } from 'react';
import { Zap, Waves, Thermometer, Focus, Activity, Clock, CheckCircle2, Shield, Share2 } from 'lucide-react';
import { ProjectState, PlasmaParameters } from '../types';

interface DashboardProps {
  project: ProjectState;
}

const Dashboard: React.FC<DashboardProps> = ({ project }) => {
  // Aggregate results across all files to find the latest valid global state
  const globalResults = useMemo(() => {
    const res: Partial<PlasmaParameters> = {};
    // Fix: Explicitly cast Object.values results to PlasmaParameters[] to avoid unknown type errors
    (Object.values(project.results) as PlasmaParameters[]).forEach(r => {
      if (r.gasTemperature) res.gasTemperature = r.gasTemperature;
      if (r.electronDensity) res.electronDensity = r.electronDensity;
      if (r.electronTemperature) res.electronTemperature = r.electronTemperature;
      if (r.debyeLength) res.debyeLength = r.debyeLength;
      if (r.fitQuality) res.fitQuality = r.fitQuality;
    });
    return res;
  }, [project.results]);

  const diagnostics = [
    { 
      label: "Gas Temp (Tg)", 
      value: globalResults.gasTemperature ? globalResults.gasTemperature.toFixed(0) : "--", 
      unit: "K", 
      status: globalResults.gasTemperature ? 'Live' : 'Waiting',
      icon: <Thermometer className="text-cyan-400" />
    },
    { 
      label: "Electron Density (ne)", 
      value: globalResults.electronDensity ? globalResults.electronDensity.toExponential(2) : "--", 
      unit: "cm⁻³", 
      status: globalResults.electronDensity ? 'Live' : 'Waiting',
      icon: <Zap className="text-rose-400" />
    },
    { 
      label: "Debye Shielding", 
      value: globalResults.debyeLength ? (globalResults.debyeLength * 1e6).toFixed(2) : "--", 
      unit: "μm", 
      status: globalResults.debyeLength ? 'Derived' : 'Waiting',
      icon: <Shield className="text-emerald-400" />
    },
    { 
      label: "Analysis Quality", 
      value: globalResults.fitQuality ? (globalResults.fitQuality * 100).toFixed(1) : "--", 
      unit: "%", 
      status: globalResults.fitQuality ? 'Calculated' : 'Idle',
      icon: <Activity className="text-indigo-400" />
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-white">Project Intelligence Center</h2>
        <p className="text-slate-400 text-lg italic">Unified diagnostic chain: T<sub>g</sub> → n<sub>e</sub> → Electromagnetic State</p>
      </div>

      <div className="grid grid-cols-4 gap-8">
        {diagnostics.map((stat, i) => (
          <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 relative overflow-hidden group shadow-xl">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
              {React.cloneElement(stat.icon as React.ReactElement, { size: 70 } as any)}
            </div>
            <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-3">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white font-mono tracking-tighter">{stat.value}</span>
              <span className="text-sm text-slate-500 font-bold uppercase">{stat.unit}</span>
            </div>
            <div className="mt-6 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${stat.status === 'Live' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-700'}`} />
              <span className={`text-[11px] font-bold uppercase ${stat.status === 'Live' ? 'text-emerald-400' : 'text-slate-500'}`}>
                {stat.status} Buffer
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8 bg-slate-900/40 border border-slate-800 rounded-3xl p-10 flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-lg font-bold text-slate-200 flex items-center gap-3 uppercase tracking-widest">
                <Share2 size={24} className="text-cyan-400" /> Diagnostic Correlation Matrix
             </h3>
             <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-[10px] text-cyan-400 font-bold">INTERCONNECTED: ON</span>
          </div>
          
          <div className="grid grid-cols-2 gap-8">
             <div className="p-6 bg-slate-950/40 rounded-2xl border border-slate-800 flex flex-col gap-4">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Wavelength Routing</p>
                <div className="space-y-3">
                   <div className="flex justify-between text-sm"><span className="text-slate-400">300-400nm</span><span className="text-cyan-400 font-bold">N2 SPS (Tg)</span></div>
                   <div className="flex justify-between text-sm"><span className="text-slate-400">480-660nm</span><span className="text-rose-400 font-bold">H Stark (ne)</span></div>
                </div>
             </div>
             <div className="p-6 bg-slate-950/40 rounded-2xl border border-slate-800 flex flex-col gap-4">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Dependency Check</p>
                <div className="space-y-3">
                   <div className="flex justify-between text-sm"><span className="text-slate-400">Tg → Doppler</span><span className={globalResults.gasTemperature ? 'text-emerald-400' : 'text-slate-600'}>{globalResults.gasTemperature ? 'SYNCED' : 'AWAITING'}</span></div>
                   <div className="flex justify-between text-sm"><span className="text-slate-400">ne → ε</span><span className={globalResults.electronDensity ? 'text-emerald-400' : 'text-slate-600'}>{globalResults.electronDensity ? 'READY' : 'AWAITING'}</span></div>
                </div>
             </div>
          </div>
        </div>

        <div className="col-span-4 bg-slate-900/40 border border-slate-800 rounded-3xl p-10 flex flex-col">
          <h3 className="text-lg font-bold text-slate-200 mb-8 flex items-center gap-3 uppercase tracking-widest">
            <Clock size={24} className="text-indigo-400" /> Global State Trace
          </h3>
          <div className="flex-1 space-y-6 font-mono text-[13px]">
            <StateItem label="Active Buffers" value={project.spectra.length.toString()} active={project.spectra.length > 0} />
            <StateItem label="Env Pressure" value={(project.globalEnv.pressure / 101325).toFixed(2) + ' atm'} active />
            <StateItem label="Last Fit R²" value={globalResults.fitQuality ? globalResults.fitQuality.toFixed(5) : '0.0000'} active={!!globalResults.fitQuality} />
          </div>
        </div>
      </div>
    </div>
  );
};

const StateItem = ({ label, value, active }: any) => (
  <div className="flex justify-between items-center p-5 bg-slate-950/40 border border-slate-800/50 rounded-2xl transition-all hover:border-indigo-500/30">
    <span className="text-slate-500 font-bold uppercase">{label}</span>
    <span className={active ? 'text-emerald-400 font-bold' : 'text-slate-700'}>{value}</span>
  </div>
);

export default Dashboard;
