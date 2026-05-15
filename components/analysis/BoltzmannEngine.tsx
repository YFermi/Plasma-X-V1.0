
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Play, RefreshCw, LineChart, Thermometer, Zap, Settings2, Scale, Table } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart, Line, Scatter } from 'recharts';
import { ProjectState, PlasmaParameters, PeakResult } from '../../types';
import { SYSTEMS } from '../../constants';
import IntensityRow from './IntensityRow';
import AnalyticFramework from './AnalyticFramework';
import { useBoltzmannSolver } from './boltzmann/useBoltzmannSolver';

const BoltzmannEngine: React.FC<{
  project: ProjectState;
  selectedModuleId: string;
  onUpdateResults: (spectrumId: string, params: Partial<PlasmaParameters>) => void;
}> = ({ project, selectedModuleId, onUpdateResults }) => {
  const availableSystems = useMemo(() => {
    if (selectedModuleId === 'boltzmann-ar') return SYSTEMS.filter(s => s.type === 'atomic' || s.type === 'atomic-ii');
    if (selectedModuleId === 'boltzmann') return SYSTEMS.filter(s => s.type === 'molecular');
    return [];
  }, [selectedModuleId]);

  const [activeSystemId, setActiveSystemId] = useState<string>(availableSystems[0]?.id || SYSTEMS[0].id);
  const [logs, setLogs] = useState<string[]>([]);
  const selectedSpectrum = useMemo(() => project.spectra.find(s => s.id === project.selectedSpectrumId), [project.spectra, project.selectedSpectrumId]);
  const activeSystem = useMemo(() => SYSTEMS.find(s => s.id === activeSystemId) || availableSystems[0] || SYSTEMS[0], [activeSystemId, availableSystems]);

  const {
    peakResults, setPeakResults, offsets, setOffsets, globalBias, setGlobalBias,
    fitResult, setFitResult, stats, setStats, peakSearch, calculateBoltzmann
  } = useBoltzmannSolver(activeSystem, selectedSpectrum);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);

  useEffect(() => {
    if (availableSystems.length > 0 && !availableSystems.find(s => s.id === activeSystemId)) {
      setActiveSystemId(availableSystems[0].id);
    }
  }, [availableSystems, activeSystemId]);

  useEffect(() => {
    if (!activeSystem) return;
    const initialPeaks: Record<string, PeakResult> = {};
    Object.entries(activeSystem.transitions).forEach(([key, val]: [string, any]) => {
      initialPeaks[key] = { intensity: 0, background: 0, detectedWavelength: val.lambda };
    });
    setPeakResults(initialPeaks);
    setFitResult([]);
    setStats(null);
    addLog(`INIT: Protocol Loaded: ${activeSystem.gas}`);
  }, [activeSystemId]);

  useEffect(() => { if (selectedSpectrum) peakSearch(); }, [selectedSpectrum?.id, activeSystemId, peakSearch]);

  const handleRun = () => {
    addLog(`FIT: Linear Regression Solver active.`);
    const res = calculateBoltzmann();
    if (res && project.selectedSpectrumId) {
      addLog(`RESULT: T = ${res.temp.toFixed(2)} K (R²=${res.r2.toFixed(5)})`);
      onUpdateResults(project.selectedSpectrumId, { 
        [activeSystem.type === 'molecular' ? 'gasTemperature' : 'electronTemperature']: res.temp, 
        fitQuality: res.r2, fitSlope: res.slope, fitIntercept: res.intercept
      });
    } else {
      addLog(`ERR: Linearization failure. Check detected lines.`);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl border ${selectedModuleId === 'boltzmann' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
            {selectedModuleId === 'boltzmann' ? <Thermometer className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">{activeSystem.gas} Boltzmann Engine</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2"><Settings2 size={12} /> {activeSystem.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-950/40 p-2 rounded-2xl border border-slate-800/60 shadow-inner">
          <select value={activeSystemId} onChange={(e) => setActiveSystemId(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-300 outline-none hover:bg-slate-800 min-w-[300px]">
            {availableSystems.map(s => <option key={s.id} value={s.id}>{s.gas}: {s.label}</option>)}
          </select>
          <button onClick={handleRun} disabled={!selectedSpectrum} className={`flex items-center gap-2 px-8 py-2.5 font-bold rounded-xl transition-all shadow-lg active:scale-95 ${!selectedSpectrum ? 'bg-slate-800 text-slate-500 border border-slate-700' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'}`}>
            <Play size={16} fill="currentColor" /> Compute State
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-5 shadow-xl relative">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between mb-2">
              <span className="flex items-center gap-2"><Scale size={12} className="text-emerald-500" /> Detection Matrix</span>
              <button onClick={peakSearch} className="hover:text-emerald-400"><RefreshCw size={10} /></button>
            </h4>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Master Bias (nm)</span>
              <input type="number" step="0.01" value={globalBias} onChange={(e) => setGlobalBias(parseFloat(e.target.value) || 0)} className="bg-slate-950 border border-slate-700 rounded-md text-[10px] font-mono text-emerald-400 outline-none w-14 text-center py-1" />
            </div>
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.keys(activeSystem.transitions).map((line) => (
                <IntensityRow key={line} label={line} peakData={peakResults[line] || { intensity: 0, background: 0, detectedWavelength: 0 }} shift={offsets[line] || 0} onShiftChange={(v) => setOffsets(p => ({...p, [line]: v}))} />
              ))}
            </div>
          </div>
          
          {stats && (
            <div className="p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 border-l-4 border-l-emerald-500 shadow-xl space-y-4">
              <div>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Boltzmann Determination</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white font-mono tracking-tighter">{stats.temp.toFixed(1)}</span>
                  <span className="text-xs font-bold text-slate-500 uppercase">K</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-500/10">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-slate-600 uppercase">Slope (m)</span>
                  <span className="text-[10px] font-mono text-emerald-400">{stats.slope.toExponential(4)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-slate-600 uppercase">Regression R²</span>
                  <span className="text-[10px] font-mono text-white font-bold">{stats.r2.toFixed(5)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-8 shadow-2xl flex flex-col min-h-[440px] relative">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center justify-between">
              <span className="flex items-center gap-2"><LineChart size={12} className="text-emerald-500" /> Linearized Distribution</span>
              {stats && <span className="text-[10px] font-mono text-emerald-500/70 italic">Y = {stats.slope.toExponential(4)} * X + {stats.intercept.toFixed(2)}</span>}
            </h4>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={fitResult} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.3} />
                  <XAxis type="number" dataKey="x" stroke="#475569" fontSize={10} domain={['auto', 'auto']} tick={{ fill: '#64748b' }} label={{ value: activeSystem.type === 'molecular' ? "F(J) [cm⁻¹]" : "Eₖ [cm⁻¹]", position: 'insideBottom', offset: -5, fill: '#475569', fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis type="number" stroke="#475569" fontSize={10} domain={['auto', 'auto']} tick={{ fill: '#64748b' }} label={{ value: "ln(I·λ⁴/Sjj)", angle: -90, position: 'insideLeft', offset: 0, fill: '#475569', fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '10px' }} />
                  <Line type="monotone" dataKey="fit" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} isAnimationActive={false} />
                  <Scatter name="Transitions" dataKey="y" fill="#10b981">{fitResult.map((entry, index) => <Cell key={`cell-${index}`} fill="#10b981" stroke="#065f46" strokeWidth={2} />)}</Scatter>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-5 flex flex-col shadow-inner min-h-[220px]">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Table size={12} className="text-indigo-400" /> Analytical Worksheet
              </h4>
              <div className="flex-1 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left font-mono text-[9px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase">
                      <th className="pb-2">Line</th>
                      <th className="pb-2">Energy (X)</th>
                      <th className="pb-2">Term (Y)</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-400">
                    {fitResult.map((r, i) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                        <td className="py-2 text-emerald-400 font-bold">{r.line}</td>
                        <td className="py-2">{r.x.toFixed(2)}</td>
                        <td className="py-2 text-slate-300 font-bold">{r.y.toFixed(5)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <AnalyticFramework type={activeSystem.type} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoltzmannEngine;
