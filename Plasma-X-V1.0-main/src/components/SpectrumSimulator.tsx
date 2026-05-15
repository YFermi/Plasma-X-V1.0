import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Settings2, 
  Activity, 
  Layers, 
  Upload, 
  Download, 
  Eye, 
  EyeOff,
  RefreshCw,
  Info,
  Maximize2,
  ChevronRight
} from 'lucide-react';
import Plot from 'react-plotly.js';
import { SAMPLE_DATA, ELEMENTS, SpectralLine } from '../data/nist_samples';
import { cn } from '../lib/utils';

const KB = 8.617333262e-5; // eV/K

interface ExperimentalPoint {
  wl: number;
  intensity: number;
}

import { SkeletonLoader } from './LoadingSkeleton';

export function SpectrumSimulator() {
  const [loading, setLoading] = useState(true);
  // Simulator State
  const [te, setTe] = useState(15000); // K (Electron Temperature)

  const [ne, setNe] = useState(1e16); // cm^-3 (Electron Density)
  const [tg, setTg] = useState(3000); // K (Gas Temperature for Doppler)
  const [fwhm, setFwhm] = useState(0.2); // nm (Instrumental)
  const [range, setRange] = useState({ min: 300, max: 900 });
  const [resolution, setResolution] = useState(0.2); // nm per point
  const [activeSpecies, setActiveSpecies] = useState<string[]>(['Ar', 'H', 'He']);
  
  // Experimental Data
  const [expData, setExpData] = useState<ExperimentalPoint[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Interaction State
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Synthetic Spectrum Generation
  const spectrumData = useMemo(() => {
    const points = [];
    const step = resolution;
    const lines = SAMPLE_DATA.filter(l => 
      activeSpecies.includes(l.element) && 
      l.wavelength >= range.min - 2 && 
      l.wavelength <= range.max + 2
    );

    // Instrument sigma
    const sigmaInstr = fwhm / 2.355;

    for (let wl = range.min; wl <= range.max; wl += step) {
      let totalIntensity = 0;
      const contributions: Record<string, number> = {};

      lines.forEach(line => {
        // Boltzmann Intensity: I ~ (1/lambda) * Aki * gk * exp(-Ek/kTe)
        const boltzmann = (1 / line.wavelength) * line.aki * line.gk * Math.exp(-line.energyHigh / (KB * te));
        
        // 1. Doppler FWHM (Thermal Broadening)
        const atomicMass = line.element === 'H' ? 1.008 : line.element === 'He' ? 4.002 : line.element === 'Ar' ? 39.948 : 20;
        const fwhmDoppler = 7.16e-7 * line.wavelength * Math.sqrt(tg / atomicMass);
        
        // 2. Stark FWHM (Pressure Broadening) - Simplified scaling
        // Typical Stark width W ~ 0.05 nm at 1e17 cm^-3 for many visible lines
        const W = line.element === 'H' ? 0.1 : 0.02; // Hydrogen has much stronger Stark effect
        const fwhmStark = W * (ne / 1e17);

        // 3. Combined Sigma (Voigt Approximation - using sum of squares for performance)
        const combinedSigma = Math.sqrt(
          Math.pow(sigmaInstr, 2) + 
          Math.pow(fwhmDoppler / 2.355, 2) + 
          Math.pow(fwhmStark / 2.355, 2)
        );
        const normalization = 1 / (combinedSigma * Math.sqrt(2 * Math.PI));

        // Gaussian broadening
        const dist = Math.abs(wl - line.wavelength);
        if (dist < combinedSigma * 5) { 
          const intensity = boltzmann * normalization * Math.exp(-(dist * dist) / (2 * combinedSigma * combinedSigma));
          totalIntensity += intensity;
          contributions[line.element] = (contributions[line.element] || 0) + intensity;
        }
      });

      points.push({
        wl: parseFloat(wl.toFixed(2)),
        intensity: totalIntensity,
        ...contributions
      });
    }

    // Normalize max to 100 for display
    const maxVal = Math.max(...points.map(p => p.intensity));
    return points.map(p => {
        const normalized: any = { wl: p.wl, intensity: (p.intensity / maxVal) * 100 };
        activeSpecies.forEach(s => {
            if (p[s]) normalized[s] = (p[s] / maxVal) * 100;
        });
        return normalized;
    });
  }, [te, fwhm, range, resolution, activeSpecies]);

  if (loading) {
    return <div className="space-y-8"><SkeletonLoader type="chart" /></div>;
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n');
      const data: ExperimentalPoint[] = rows
        .map(row => {
          const [wl, val] = row.split(',').map(v => parseFloat(v.trim()));
          return { wl, intensity: val };
        })
        .filter(p => !isNaN(p.wl) && !isNaN(p.intensity));
      
      // Normalize experimental data
      const maxExp = Math.max(...data.map(d => d.intensity));
      setExpData(data.map(d => ({ ...d, intensity: (d.intensity / maxExp) * 100 })));
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-display font-black text-white glow-text-magenta tracking-tight uppercase">Spectrum Synthesis</h2>
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mt-1">Real-time LTE Plasma Radiative Modeling</p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-4 py-2 rounded-xl glass-panel border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-slate-400 cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> 
            {expData ? 'Replace Experimental CSV' : 'Overlay CSV Data'}
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Controls Panel */}
        <div className="xl:col-span-3 space-y-6">
          <div className="glass-panel p-6 border-white/5 space-y-8">
            <div className="flex items-center gap-3">
              <Settings2 className="w-4 h-4 text-plasma-cyan" />
              <h3 className="text-xs font-display text-white tracking-widest uppercase">Plasma Parameters</h3>
            </div>

            {/* Electron Temp Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-tight">Electron Temp (Tₑ)</label>
                <span className="text-xs font-mono text-plasma-cyan font-bold">{te.toLocaleString()} K</span>
              </div>
              <input 
                type="range" min="2000" max="50000" step="500"
                value={te} onChange={e => setTe(parseInt(e.target.value))}
                className="w-full accent-plasma-cyan"
              />
            </div>

            {/* Electron Density Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-tight">Electron Density (nₑ)</label>
                <span className="text-xs font-mono text-plasma-amber font-bold">10<sup>{Math.log10(ne).toFixed(1)}</sup> cm⁻³</span>
              </div>
              <input 
                type="range" min="14" max="18" step="0.1"
                value={Math.log10(ne)} onChange={e => setNe(Math.pow(10, parseFloat(e.target.value)))}
                className="w-full accent-plasma-amber"
              />
            </div>

            {/* Gas Temp Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-tight">Gas Temp (T_gas)</label>
                <span className="text-xs font-mono text-white font-bold">{tg.toLocaleString()} K</span>
              </div>
              <input 
                type="range" min="300" max="10000" step="100"
                value={tg} onChange={e => setTg(parseInt(e.target.value))}
                className="w-full accent-white"
              />
            </div>

            {/* Broadening Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Inst. FWHM</label>
                <span className="text-xs font-mono text-plasma-magenta font-bold">{fwhm} nm</span>
              </div>
              <input 
                type="range" min="0.01" max="1.0" step="0.01"
                value={fwhm} onChange={e => setFwhm(parseFloat(e.target.value))}
                className="w-full accent-plasma-magenta"
              />
            </div>

             {/* Resolution Control */}
             <div className="space-y-4 pt-4 border-t border-white/5">
              <label className="text-[10px] font-mono text-slate-500 uppercase">Wavelength Range</label>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" value={range.min} 
                  onChange={e => setRange(r => ({ ...r, min: parseInt(e.target.value) }))}
                  className="bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] font-mono text-white outline-none"
                />
                <input 
                  type="number" value={range.max}
                  onChange={e => setRange(r => ({ ...r, max: parseInt(e.target.value) }))}
                  className="bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] font-mono text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Species Toggle Panel */}
          <div className="glass-panel p-6 border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <Layers className="w-4 h-4 text-plasma-amber" />
              <h3 className="text-xs font-display text-white tracking-widest uppercase">Visible Species</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {['H', 'He', 'Ar', 'Ne', 'Kr', 'Xe', 'N', 'O', 'Fe', 'C'].map(symbol => (
                <button
                  key={symbol}
                  onClick={() => setActiveSpecies(prev => 
                    prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
                  )}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-widest",
                    activeSpecies.includes(symbol)
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-black/20 border-white/5 text-slate-600"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {activeSpecies.includes(symbol) ? <Eye className="w-3 h-3 text-plasma-cyan" /> : <EyeOff className="w-3 h-3" />}
                    {symbol}
                  </span>
                  <span className="text-[8px] font-mono opacity-50">{SAMPLE_DATA.filter(l => l.element === symbol).length} lines</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Spectrum Visualization */}
        <div className="xl:col-span-9 space-y-6">
          <div className="glass-panel p-8 border-white/5 min-h-[600px] flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <Activity className="w-5 h-5 text-plasma-magenta" />
                <h3 className="text-sm font-display text-white tracking-widest uppercase">Synthetic Radiative Flux</h3>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 bg-plasma-cyan rounded-full" />
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Model</span>
                </div>
                {expData && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-1 bg-plasma-magenta rounded-full" />
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Experimental</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-[500px] bg-black/20 rounded-xl overflow-hidden border border-white/5">
              <Plot
                data={[
                  {
                    x: spectrumData.map(d => d.wl),
                    y: spectrumData.map(d => d.intensity),
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Synthetic Model',
                    line: { color: '#00f0ff', width: 2 },
                    fill: 'tozeroy',
                    fillcolor: 'rgba(0, 240, 255, 0.1)',
                  },
                  ...(expData ? [{
                    x: expData.map(d => d.wl),
                    y: expData.map(d => d.intensity),
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Experimental Overlay',
                    line: { color: '#ff00f0', width: 1, dash: 'dot' },
                  }] : []),
                  ...activeSpecies.map((s, i) => ({
                    x: spectrumData.map(d => d.wl),
                    y: spectrumData.map(d => d[s] || 0),
                    type: 'scatter',
                    mode: 'lines',
                    name: `${s} Contribution`,
                    line: { width: 1, color: ['#FF3366', '#33FF66', '#3366FF', '#FFBB33'][i % 4] },
                    visible: 'legendonly' as any
                  }))
                ]}
                layout={{
                  autosize: true,
                  height: 500,
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  margin: { t: 10, r: 10, b: 40, l: 40 },
                  showlegend: true,
                  legend: { font: { color: '#888', size: 10 }, bgcolor: 'transparent' },
                  xaxis: {
                    title: { text: 'Wavelength (nm)', font: { color: '#444', size: 10, family: 'JetBrains Mono' } },
                    gridcolor: '#222',
                    tickfont: { color: '#666', size: 10, family: 'JetBrains Mono' },
                    range: [range.min, range.max],
                    zeroline: false
                  },
                  yaxis: {
                    title: { text: 'Relative Intensity (%)', font: { color: '#444', size: 10, family: 'JetBrains Mono' } },
                    gridcolor: '#222',
                    tickfont: { color: '#666', size: 10, family: 'JetBrains Mono' },
                    range: [0, 110],
                    zeroline: false
                  },
                  hovermode: 'closest',
                  dragmode: 'zoom',
                }}
                config={{
                  responsive: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ['select2d', 'lasso2d'],
                }}
                className="w-full h-full"
                useResizeHandler={true}
              />
            </div>

            {/* Aesthetic Grid Mask */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
          </div>

          {/* Line Legend */}
          <div className="glass-panel p-6 border-white/5">
             <div className="flex items-center gap-3 mb-4">
              <Info className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-display text-white tracking-widest uppercase">Visible Transitions in View</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_DATA
                .filter(l => activeSpecies.includes(l.element) && l.wavelength >= range.min && l.wavelength <= range.max)
                .sort((a,b) => a.wavelength - b.wavelength)
                .slice(0, 50)
                .map(l => (
                  <div key={`${l.element}-${l.wavelength}`} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-mono text-slate-400 group hover:border-plasma-cyan/40 transition-all cursor-default">
                    <span className="text-plasma-cyan font-bold">{l.wavelength.toFixed(3)}</span> {l.element} {l.ion}
                  </div>
                ))}
            </div>
            {SAMPLE_DATA.filter(l => activeSpecies.includes(l.element) && l.wavelength >= range.min && l.wavelength <= range.max).length > 50 && (
              <p className="text-[8px] font-mono text-slate-600 mt-4 italic uppercase">Showing first 50 lines only. Zoom in to see more detail.</p>
            )}
          </div>

          <div className="glass-panel p-6 border-white/5 bg-slate-900/40">
             <div className="flex items-center gap-3 mb-6">
              <RefreshCw className="w-4 h-4 text-plasma-cyan" />
              <h3 className="text-xs font-display text-white tracking-widest uppercase">Model Physics</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[10px] font-mono">
              <div className="space-y-2">
                <p className="text-plasma-cyan uppercase tracking-tighter">1. Population</p>
                <p className="text-slate-400">Boltzmann distribution assumes Local Thermodynamic Equilibrium (LTE):</p>
                <div className="p-2 bg-black/40 rounded border border-white/5 text-[9px]">
                  n_k ∝ g_k exp(-E_k / k T_e)
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-plasma-magenta uppercase tracking-tighter">2. Emission</p>
                <p className="text-slate-400">Radiative flux intensity from transition k → i:</p>
                <div className="p-2 bg-black/40 rounded border border-white/5 text-[9px]">
                  I_ki ∝ n_k A_ki h ν
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-plasma-amber uppercase tracking-tighter">3. Broadening</p>
                <p className="text-slate-400">Convolution of Instrumental, Doppler, and Stark profiles:</p>
                <div className="p-2 bg-black/40 rounded border border-white/5 text-[9px]">
                  σ_total = √(σ_inst² + σ_dop² + σ_stark²)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
