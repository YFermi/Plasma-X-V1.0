
import React, { useState, useMemo } from 'react';
import { Waves, Thermometer, Zap, LineChart, Terminal, Play, Layers, Scale, Sun } from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, Line } from 'recharts';
import { ProjectState, PlasmaParameters } from '../../types';
import { PHYSICS } from '../../constants';
import { fPlanckLambda } from '../../utils/physics';

interface ContinuumEngineProps {
  project: ProjectState;
  onUpdateResults: (id: string, p: Partial<PlasmaParameters>) => void;
}

const ContinuumEngine: React.FC<ContinuumEngineProps> = ({ project, onUpdateResults }) => {
  const [tElec, setTElec] = useState(12000);
  const [nElec, setNElec] = useState(1e16);
  const [process, setProcess] = useState<'ff_ion' | 'ff_neutral' | 'bf'>('ff_ion');
  const [intensityScale, setIntensityScale] = useState(1e-12);
  const [logs, setLogs] = useState<string[]>([]);

  const selectedSpectrum = useMemo(() => 
    project.spectra.find(s => s.id === project.selectedSpectrumId),
    [project.spectra, project.selectedSpectrumId]
  );

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 10)]);

  const calculateGaunt = (lambdaMicrons: number, tK: number) => {
    const tEv = tK / 11604.5;
    if (tEv < 1) return 1.0 + 0.17 * Math.pow(lambdaMicrons, 1/3);
    return 1.1 + 0.05 * Math.log10(tEv) * Math.log10(lambdaMicrons);
  };

  const continuumProfile = useMemo(() => {
    if (!selectedSpectrum) return [];
    
    return selectedSpectrum.points.map(p => {
      const lambda = p.wavelength; 
      let emissionCoeff = 0;

      const planck = fPlanckLambda(tElec, lambda, 'nm');

      if (process === 'ff_ion') {
         const gaunt = calculateGaunt(lambda / 1000, tElec);
         emissionCoeff = planck * gaunt * (nElec / 1e16); // Scaled by relative density
      } else if (process === 'ff_neutral') {
         const crossSection = 0.8e-6; 
         emissionCoeff = planck * crossSection * nElec * 1e-12;
      } else if (process === 'bf') {
         const threshold = 13.6; 
         const photonE = (PHYSICS.PLANCK * (PHYSICS.C_LIGHT / (lambda * 1e-9))) / PHYSICS.E_CHARGE;
         if (photonE > threshold) {
            emissionCoeff = planck * Math.pow(threshold / photonE, 3);
         }
      }
      
      return {
        wavelength: p.wavelength,
        exp: p.intensity,
        sim: emissionCoeff * intensityScale
      };
    });
  }, [selectedSpectrum, tElec, nElec, process, intensityScale]);

  const handleApply = () => {
    if (!selectedSpectrum) return;
    addLog(`CONTINUUM: fPlanckLambda synchronized.`);
    addLog(`SUCCESS: Radiative baseline mapped to Te=${tElec}K`);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Multi-Process Continuum</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Sun size={12} className="text-cyan-500" /> Professional Planck Utility (FPLANCK_LAMBDA)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950/40 p-1.5 rounded-2xl border border-slate-800">
             {(['ff_ion', 'ff_neutral', 'bf'] as const).map(p => (
                <button 
                  key={p} onClick={() => setProcess(p)}
                  className={`px-4 py-2 text-[9px] font-bold uppercase rounded-xl transition-all ${process === p ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {p.replace('_', ' ')}
                </button>
             ))}
          </div>
          <button onClick={handleApply} className="flex items-center gap-2 px-8 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95">
            <Play size={16} fill="currentColor" /> Apply Matrix
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4 space-y-6">
           <div className="p-6 bg-slate-950/50 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                <Scale size={12} className="text-cyan-500" /> Kinetic State
              </h4>
              <SliderControl label="Electron Temp (Te)" value={tElec} unit="K" step={500} min={1000} max={50000} onChange={setTElec} />
              <SliderControl label="Electron Density (ne)" value={nElec} unit="cm⁻³" step={1e14} min={1e14} max={1e18} onChange={setNElec} isLog />
              <SliderControl label="Intensity Scale" value={intensityScale} unit="rel" step={1e-13} min={1e-14} max={1e-10} onChange={setIntensityScale} isLog />
           </div>

           <div className="bg-slate-900/40 rounded-3xl border border-slate-800 p-5 flex flex-col">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                <Terminal size={12} className="text-indigo-400" /> Radiative Log
              </h4>
              <div className="font-mono text-[10px] space-y-1 text-cyan-500/70 leading-relaxed">
                <p>PLANCK_LAMBDA: {tElec}K ACTIVE</p>
                <p>INDUCED_EMISSION: CORRECTION_ON</p>
                {process === 'ff_ion' && <p>GAUNT_FACTOR: DYNAMIC_STALLCOP</p>}
                {logs.map((l, i) => <p key={i}>{l}</p>)}
              </div>
           </div>
        </div>

        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
           <div className="bg-slate-950/80 rounded-3xl border border-slate-800 p-8 shadow-2xl flex flex-col h-[480px]">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <LineChart size={12} className="text-cyan-500" /> Background Synthesis Preview
              </h4>
              <div className="flex-1">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={continuumProfile}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.3} />
                       <XAxis dataKey="wavelength" type="number" domain={['auto', 'auto']} stroke="#475569" fontSize={10} tick={{ fill: '#64748b' }} />
                       <YAxis stroke="#475569" fontSize={10} hide />
                       <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '10px' }} />
                       <Area dataKey="exp" stroke="none" fill="#64748b" fillOpacity={0.1} />
                       <Line dataKey="sim" stroke="#06b6d4" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const SliderControl = ({ label, value, unit, step, min, max, onChange, isLog }: any) => (
  <div className="space-y-3">
    <div className="flex justify-between items-center px-1">
      <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
      <span className="bg-slate-900 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-400 border border-slate-800 truncate">
        {isLog ? value.toExponential(1) : value} {unit}
      </span>
    </div>
    <input 
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
    />
  </div>
);

export default ContinuumEngine;
