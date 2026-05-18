import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart as LineChartIcon, 
  Trash2, 
  Plus, 
  Download, 
  Calculator, 
  Info,
  Maximize2,
  ChevronDown,
  AlertCircle,
  BarChart2,
  FileText,
  Activity
} from 'lucide-react';
import { SAMPLE_DATA, SpectralLine } from '../data/nist_samples';
import { cn } from '../lib/utils';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Cell,
  ReferenceLine
} from 'recharts';

// Boltzmann Constant in eV/K
const KB = 8.617333262e-5;

interface Point {
  id: string;
  wavelength: number;
  intensity: number;
  line: SpectralLine;
  x: number; // energyHigh (eV)
  y: number; // ln(I * lambda / (gk * Aki))
  excluded: boolean;
}

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import { useProject } from '../context/ProjectContext';
import { SkeletonLoader } from './LoadingSkeleton';

export function BoltzmannTool({ externalLines = [], onClearExternal }: { externalLines?: any[], onClearExternal?: () => void }) {
  const { saveBoltzmannResult } = useProject();
  const [loading, setLoading] = useState(true);
  const [inputWavelength, setInputWavelength] = useState('');

  const [inputIntensity, setInputIntensity] = useState('');
  const [points, setPoints] = useState<Point[]>([]);
  const [showCalculations, setShowCalculations] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'success' | 'warn', msg: string} | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  // Initialize from external lines if any
  React.useEffect(() => {
    if (externalLines.length > 0) {
      const newPoints = externalLines.map(extLine => {
        const line = extLine.line || extLine; // Handle both {line, intensity} and SpectralLine formats
        const intensity = extLine.intensity || 10000;
        const x = line.energyHigh;
        const y = Math.log((intensity * line.wavelength) / (line.gk * line.aki));
        
        return {
          id: Math.random().toString(36).substr(2, 9),
          wavelength: line.wavelength,
          intensity,
          line,
          x,
          y,
          excluded: false
        };
      });
      setPoints(prev => {
        // Avoid duplicates
        const existingWls = prev.map(p => p.wavelength);
        const filtered = newPoints.filter(np => !existingWls.includes(np.wavelength));
        return [...prev, ...filtered];
      });
      onClearExternal?.();
    }
  }, [externalLines, onClearExternal]);

  const validateLine = (line: any): { // RESTORED
    valid: boolean;
    reason: string;
  } => {
    if (!line.aki || line.aki <= 0)
      return { valid: false, reason: "Missing Aₖᵢ value" };
    if (!line.gk || line.gk <= 0)
      return { valid: false, reason: "Missing gₖ weight" };
    if (!line.energyHigh || line.energyHigh <= 0)
      return { valid: false, reason: "Missing upper energy" };
    if (line.energyHigh <= line.energyLow)
      return { valid: false, reason: "Invalid energy levels" };
    return { valid: true, reason: "" };
  };

  const setError = (msg: string) => setTimeout(() => setStatusMsg({ type: 'warn', msg }), 0);

  // Linear Regression Logic
  const stats = useMemo(() => {
    if (!hasCalculated) return null;
    // RESTORED
    const safePoints = points.filter(p => {
      if (p.excluded) return false;
      const check = validateLine(p.line || p);
      if (!check.valid) return false;
      const val = Math.log(
        (p.intensity * (p.line?.wavelength || p.wavelength)) /
        ((p.line?.gk || p.gk) * (p.line?.aki || p.aki))
      );
      return isFinite(val) && !isNaN(val);
    });

    if (safePoints.length < 3) {
      setError(
        "Need at least 3 valid lines. " +
        "Check lines have complete Aₖᵢ, gₖ, and energy data."
      );
      return null; // returning null instead of void to satisfy useMemo
    }
    const activePoints = safePoints;

    const n = activePoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    activePoints.forEach(p => {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Electron Temperature calculation: T_e = -1 / (kB * slope)
    const te = -1 / (KB * slope);

    // R-squared calculation
    const yMean = sumY / n;
    let ssRes = 0;
    let ssTot = 0;
    activePoints.forEach(p => {
      const yPred = slope * p.x + intercept;
      ssRes += Math.pow(p.y - yPred, 2);
      ssTot += Math.pow(p.y - yMean, 2);
    });
    const r2 = 1 - (ssRes / ssTot);

    return { slope, intercept, te, r2, n };
  }, [points, hasCalculated]);

  const handleAddLine = () => {
    setStatusMsg(null);
    const wl = parseFloat(inputWavelength);
    const intensity = parseFloat(inputIntensity);
    
    if (isNaN(wl) || isNaN(intensity)) {
      setStatusMsg({type: 'warn', msg: 'Invalid numeric input'});
      return;
    }

    // Find closest line in database within 0.5nm
    const match = SAMPLE_DATA.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev.wavelength - wl);
      const currDiff = Math.abs(curr.wavelength - wl);
      return currDiff < prevDiff ? curr : prev;
    });

    if (Math.abs(match.wavelength - wl) > 0.5) {
      setStatusMsg({type: 'warn', msg: `No matching line within 0.5nm.`});
      return;
    }

    const x = match.energyHigh;
    const y = Math.log((intensity * match.wavelength) / (match.gk * match.aki));

    const newPoint: Point = {
      id: Math.random().toString(36).substr(2, 9),
      wavelength: wl,
      intensity,
      line: match,
      x,
      y,
      excluded: false
    };

    setPoints(prev => [...prev, newPoint]);
    setInputWavelength('');
    setInputIntensity('');
    setStatusMsg({type: 'success', msg: `Added ${match.element} ${match.ion} (${match.wavelength}nm)`});
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const toggleExclude = (id: string) => {
    setPoints(prev => prev.map(p => p.id === id ? { ...p, excluded: !p.excluded } : p));
  };

  const removePoint = (id: string) => {
    setPoints(prev => prev.filter(p => p.id !== id));
  };

  React.useEffect(() => {
    if (hasCalculated && stats && isFinite(stats.te)) {
      saveBoltzmannResult({
        Te_eV: stats.te / 11604,
        R2: stats.r2,
        lines_used: points.filter(p => !p.excluded).map(p => `${p.line?.element} ${p.line?.ion} (${p.wavelength}nm)`),
        timestamp: new Date().toISOString()
      });
    }
  }, [hasCalculated, stats]);

  // Regression line data for chart
  const chartData = useMemo(() => {
    if (!stats || points.length === 0) return points.map(p => ({ ...p, type: 'actual' }));
    
    const minX = Math.min(...points.map(p => p.x)) - 1;
    const maxX = Math.max(...points.map(p => p.x)) + 1;
    
    const regressionPoints = [
      { x: minX, y_reg: stats.slope * minX + stats.intercept },
      { x: maxX, y_reg: stats.slope * maxX + stats.intercept }
    ];

    return [
      ...points.map(p => ({ ...p, type: 'actual' })),
      ...regressionPoints.map(p => ({ ...p, type: 'regression' }))
    ];
  }, [points, stats]);

  if (loading) {
    return <div className="space-y-8"><SkeletonLoader type="table" /></div>;
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-display font-black text-white glow-text-cyan tracking-tight uppercase">Boltzmann Plot Engine</h2>
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mt-1">Multi-Line Excitation Temperature Diagnostics</p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={() => window.print()}
             className="flex items-center gap-2 px-4 py-2 rounded-xl glass-panel border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-slate-400 hover:text-white"
           >
            <Download className="w-3.5 h-3.5" /> Export PDF Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Input & List Panel */}
        <div className="xl:col-span-4 space-y-6">
          <div className="glass-panel p-6 border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <Plus className="w-4 h-4 text-plasma-cyan" />
              <h3 className="text-xs font-display text-white tracking-widest uppercase">Data Entry</h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Wavelength (nm)</label>
                  <input 
                    value={inputWavelength}
                    onChange={e => setInputWavelength(e.target.value)}
                    placeholder="e.g. 480.6"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-mono text-white focus:border-plasma-cyan/50 focus:ring-0 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Rel. Intensity</label>
                  <input 
                    value={inputIntensity}
                    onChange={e => setInputIntensity(e.target.value)}
                    placeholder="e.g. 12500"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-mono text-white focus:border-plasma-cyan/50 focus:ring-0 outline-none"
                  />
                </div>
              </div>
              <button 
                onClick={handleAddLine}
                className="w-full py-3 bg-plasma-cyan/10 border border-plasma-cyan/30 rounded-xl text-[10px] font-bold text-plasma-cyan uppercase tracking-[0.2em] hover:bg-plasma-cyan/20 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Line to Plot
              </button>
              {statusMsg && (
                <div className={cn("p-3 rounded-lg flex items-start gap-2 text-xs font-mono animate-in fade-in zoom-in-95 duration-200", statusMsg.type === 'success' ? "bg-green-500/10 text-green-400 border border-green-500/30" : "bg-orange-500/10 text-orange-400 border border-orange-500/30")}>
                  <span>{statusMsg.type === 'success' ? '✅' : '⚠️'}</span>
                  <span>{statusMsg.msg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Active Points List */}
          <div className="glass-panel p-6 border-white/5 bg-slate-900/20 flex flex-col items-stretch max-h-[600px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <LineChartIcon className="w-4 h-4 text-plasma-magenta" />
                <h3 className="text-xs font-display text-white tracking-widest uppercase">Selected Transitions</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-600">{points.length} Lines</span>
            </div>

            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 flex-1">
              <AnimatePresence>
                {points.map(point => (
                  <motion.div 
                    key={point.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "p-3 rounded-xl border flex items-center justify-between transition-all group",
                      point.excluded 
                        ? "bg-black/20 border-white/5 opacity-40" 
                        : "bg-white/5 border-white/10 hover:border-plasma-cyan/30"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono cursor-pointer" onClick={() => toggleExclude(point.id)}>{point.line.wavelength.toFixed(3)}</span>
                        {(() => { // RESTORED
                          const check = validateLine(point.line || point);
                          return check.valid ? (
                            <span
                              title="Valid for Boltzmann plot"
                              style={{ color: '#00ff88', marginLeft: '4px' }}>
                              ✅
                            </span>
                          ) : (
                            <span
                              title={check.reason}
                              style={{
                                color: '#ffcc00',
                                marginLeft: '4px',
                                cursor: 'help'
                              }}>
                              ⚠️
                            </span>
                          );
                        })()}
                        <span className="text-[9px] text-plasma-cyan font-mono uppercase tracking-widest">{point.line.element} {point.line.ion}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] text-slate-500 uppercase font-mono">Int:</span>
                          <input 
                            type="number"
                            value={point.intensity}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setPoints(prev => prev.map(p => p.id === point.id ? { 
                                ...p, 
                                intensity: val,
                                y: Math.log((val * p.line.wavelength) / (p.line.gk * p.line.aki))
                              } : p));
                              setHasCalculated(false); // Reset calculation on change
                            }}
                            className="w-16 bg-black/40 border border-white/10 rounded px-1 text-[10px] font-mono text-plasma-cyan outline-none focus:border-plasma-cyan/50"
                          />
                        </div>
                        <span className="text-[8px] text-slate-600 font-mono uppercase">E_k: {point.line.energyHigh} eV</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        removePoint(point.id);
                        setHasCalculated(false);
                      }}
                      className="p-2 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-plasma-magenta transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {points.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full border border-dashed border-white/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-slate-700" />
                  </div>
                  <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">No data points added yet</p>
                </div>
              )}
            </div>
            
            {/* Calculate Button */}
            <div className="mt-4 pt-4 border-t border-white/10 flex-shrink-0">
              <button 
                disabled={points.filter(p => !p.excluded).length < 3 || hasCalculated}
                onClick={() => setHasCalculated(true)}
                className="w-full py-3 bg-plasma-magenta/10 disabled:bg-white/5 border border-plasma-magenta/30 disabled:border-white/10 rounded-xl text-[10px] font-bold text-plasma-magenta disabled:text-slate-500 uppercase tracking-[0.2em] hover:bg-plasma-magenta/20 disabled:hover:bg-white/5 transition-all flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4" /> {hasCalculated ? 'Calculated' : 'Calculate Regression'}
              </button>
              {points.filter(p => !p.excluded).length < 3 && !hasCalculated && (
                <p className="text-[8px] font-mono text-slate-500 text-center mt-2 uppercase tracking-wider">Requires at least 3 active lines</p>
              )}
            </div>
          </div>
        </div>

        {/* Diagnostic Results & Plot */}
        <div className="xl:col-span-8 space-y-8">
          {/* Result Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DiagnosticResult 
              label="Electron Temperature" 
              value={stats ? `${stats.te.toLocaleString(undefined, { maximumFractionDigits: 0 })} K` : '---'} 
              subValue={stats ? `${(stats.te / 11604).toFixed(2)} eV` : ''}
              color="text-plasma-cyan"
            />
            <DiagnosticResult 
              label="Slope Confidence (R²)" 
              value={stats ? stats.r2.toFixed(4) : '---'} 
              subValue={stats ? (stats.r2 > 0.9 ? 'High Quality' : 'Low Precision') : ''}
              color="text-plasma-amber"
            />
             <DiagnosticResult 
              label="Boltzmann Equation" 
              value={stats ? `ln(y) = ${stats.slope.toFixed(2)}x + ${stats.intercept.toFixed(2)}` : '---'} 
              subValue="Statistical Identity"
              color="text-plasma-magenta"
            />
          </div>

          {/* Main Visualizer */}
          <div className="glass-panel p-8 border-white/5 relative overflow-hidden bg-slate-900/10 min-h-[500px] flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <Calculator className="w-5 h-5 text-plasma-cyan" />
                <h3 className="text-sm font-display text-white tracking-widest uppercase">Boltzmann Regression Line</h3>
              </div>
              <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest flex gap-4">
                <span>X: E_k (eV)</span>
                <span>Y: ln(Iλ / gk Aki)</span>
              </div>
            </div>

            <div className="flex-1 min-h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Energy" 
                    unit="eV" 
                    stroke="#444" 
                    tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    domain={['auto', 'auto']}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Intensity Metric" 
                    stroke="#444" 
                    tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        if (data.type === 'regression') return null;
                        return (
                          <div className="glass-panel bg-slate-950 border-white/20 p-4 shadow-2xl">
                             <p className="text-xs font-bold text-white mb-2">{data.line.element} {data.line.ion} @ {data.wavelength} nm</p>
                             <div className="space-y-1 text-[10px] font-mono">
                               <p className="flex justify-between gap-8"><span className="text-slate-500">X (Energy):</span> <span className="text-plasma-cyan">{data.x.toFixed(4)} eV</span></p>
                               <p className="flex justify-between gap-8"><span className="text-slate-500">Y (Metric):</span> <span className="text-plasma-magenta">{data.y.toFixed(4)}</span></p>
                             </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  {/* Actual Points */}
                  <Scatter 
                    data={points} 
                    onClick={(data: any) => toggleExclude(data.payload.id)}
                  >
                    {points.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.excluded ? '#333' : '#00f0ff'} 
                        className="cursor-pointer hover:stroke-white transition-all"
                        strokeWidth={2}
                      />
                    ))}
                  </Scatter>

                  {/* Regression Line */}
                  {stats && (
                    <Scatter
                      data={chartData.filter(d => d.type === 'regression')}
                      line={{ stroke: '#b400ff', strokeWidth: 2, strokeDasharray: '5 5' }}
                      shape={() => null}
                    />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Aesthetic Grid Mask */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] scanline" />
          </div>

          {/* Calculation Breakdown */}
          <div className="glass-panel overflow-hidden border-white/5">
            <button 
              onClick={() => setShowCalculations(!showCalculations)}
              className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-display text-white tracking-widest uppercase">Detailed Breakdown</h3>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-slate-600 transition-transform", showCalculations && "rotate-180")} />
            </button>
            <AnimatePresence>
              {showCalculations && (
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="px-6 pb-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[11px] font-mono">
                    <div className="space-y-4">
                      <h4 className="text-plasma-cyan uppercase tracking-widest text-[9px]">The Identity</h4>
                      <div className="text-slate-400 text-[10px] leading-relaxed">
                        <ReactMarkdown 
                          remarkPlugins={[remarkMath]} 
                          rehypePlugins={[rehypeKatex]}
                        >
                          {"$$\\ln\\left(\\frac{I_{ki} \\lambda_{ki}}{g_k A_{ki}}\\right) = -\\frac{E_k}{k_B T_e} + C$$\n\nWhere $I_{ki}$ is relative intensity and $k_B = 8.617 \\times 10^{-5}$ eV K⁻¹."}
                        </ReactMarkdown>
                      </div>
                      <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-2">
                        <div className="flex justify-between text-slate-500"><span>Target Element:</span> <span className="text-white">Argon-II</span></div>
                        <div className="flex justify-between text-slate-500"><span>Equilibrium Mod:</span> <span className="text-white">pLTE</span></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-plasma-magenta uppercase tracking-widest text-[9px]">Transition Residuals</h4>
                      <div className="space-y-2">
                        {points.map(p => (
                          <div key={p.id} className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-500">{p.wavelength.toFixed(2)}nm</span>
                            <span className={p.excluded ? "text-slate-700 italic" : "text-slate-300"}>
                              Δy: {stats ? (p.y - (stats.slope * p.x + stats.intercept)).toFixed(3) : '---'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiagnosticResult({ label, value, subValue, color }: { label: string, value: string, subValue: string, color: string }) {
  return (
    <div className="glass-panel p-6 border-white/5 border-l-2 border-l-plasma-cyan bg-slate-900/20">
      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-2">{label}</div>
      <div className={cn("text-2xl font-display font-black tracking-tight", color)}>{value}</div>
      <div className="text-[10px] font-mono text-slate-600 mt-1 uppercase tracking-widest">{subValue}</div>
    </div>
  );
}

function SidebarItem({ icon, label, active = false, onClick, expanded = true }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, expanded?: boolean }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center rounded-xl cursor-pointer transition-all duration-300 relative group overflow-hidden border whitespace-nowrap",
        active 
          ? "bg-plasma-cyan/10 border-plasma-cyan/30 text-plasma-cyan plasma-glow-cyan" 
          : "text-slate-500 border-transparent hover:bg-white/5 hover:text-white",
        expanded ? "px-4 py-3 gap-4 h-12 w-full" : "w-12 h-12 justify-center p-0 mx-auto"
      )}
    >
      <div className={cn("transition-transform duration-300", active && "scale-110")}>
        {icon}
      </div>
      {expanded && (
        <span className="text-xs font-display font-medium tracking-widest uppercase truncate">{label}</span>
      )}
      {!expanded && active && (
        <div className="absolute right-0 w-1 h-6 bg-plasma-cyan rounded-l-full shadow-[0_0_10px_var(--color-plasma-cyan)]" />
      )}
      {active && (
        <div className="absolute inset-0 shimmer opacity-20 pointer-events-none" />
      )}
    </div>
  );
}
