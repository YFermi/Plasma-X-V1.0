import React, { useState, useMemo, useEffect } from 'react'; // NEW
import { useProject } from '../context/ProjectContext';
import { H2_FULCHER_QBRANCH } from '../data/molecular_constants'; // NEW
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from 'recharts'; // NEW
import { FileText } from 'lucide-react';

interface H2LineData { // NEW
  J: number; // FROM-GLOWLOGIC
  wavelength: number; // FROM-GLOWLOGIC
  E_cm1: number; // FROM-GLOWLOGIC
  S_J: number; // FROM-GLOWLOGIC
  I_measured: number; // NEW
  included: boolean; // NEW
}

function calculateBoltzmannTemp( // FROM-GLOWLOGIC
  lines: {J: number, E_cm1: number, S_J: number, I: number}[] // FROM-GLOWLOGIC
): {T_gas: number, uncertainty: number, R2: number, slope: number, intercept: number, points: any[]} | null { // FROM-GLOWLOGIC
  
  const points = lines // FROM-GLOWLOGIC
    .filter(l => l.I > 0 && l.S_J > 0) // FROM-GLOWLOGIC
    .map(l => ({ 
      x: l.E_cm1,  // keep in cm-1 to match glowlogic exactly
      y: Math.log(l.I / l.S_J), 
      J: l.J 
    })); 
  
  if (points.length < 3) return null; 
  
  // Linear regression: y = mx + b 
  const n = points.length; 
  const sumX = points.reduce((s, p) => s + p.x, 0); 
  const sumY = points.reduce((s, p) => s + p.y, 0); 
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0); 
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0); 
  const sumY2 = points.reduce((s, p) => s + p.y * p.y, 0); 
  
  const denominator = (n * sumX2 - sumX * sumX); 
  if (denominator === 0) return null; 
  const slope = (n * sumXY - sumX * sumY) / denominator; 
  const intercept = (sumY - slope * sumX) / n; 
  
  // R² calculation 
  const yMean = sumY / n; 
  const ssRes = points.reduce((s, p) =>  
    s + Math.pow(p.y - (slope * p.x + intercept), 2), 0); 
  const ssTot = points.reduce((s, p) =>  
    s + Math.pow(p.y - yMean, 2), 0); 
  const R2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot; 
  
  // Temperature from slope 
  // T = -1 / (slope × k_B) where k_B = 0.695039 cm⁻¹/K 
  const k_B = 0.695039;
  const T_gas = -1 / (slope * k_B); 
  
  // Uncertainty from standard error of slope 
  const slopeError = Math.sqrt( 
    ssRes / ((n - 2) * (sumX2 - sumX * sumX / n)) 
  ); 
  const uncertainty = Math.abs(1 / (k_B) * slopeError /  
    (slope * slope)); 
  
  return { 
    T_gas: Math.abs(T_gas), 
    uncertainty: Math.abs(uncertainty), 
    R2: Math.max(0, R2), 
    slope, 
    intercept, 
    points 
  }; 
}

function findPeakNear( // FROM-GLOWLOGIC
  wavelengths: number[],  // FROM-GLOWLOGIC
  intensities: number[],  // FROM-GLOWLOGIC
  target_nm: number,  // FROM-GLOWLOGIC
  tolerance_nm: number // FROM-GLOWLOGIC
): number | null { // FROM-GLOWLOGIC
  let maxIntensity = 0; // FROM-GLOWLOGIC
  let found = false; // FROM-GLOWLOGIC
  
  for (let i = 0; i < wavelengths.length; i++) { // FROM-GLOWLOGIC
    if (Math.abs(wavelengths[i] - target_nm) < tolerance_nm) { // FROM-GLOWLOGIC
      if (intensities[i] > maxIntensity) { // FROM-GLOWLOGIC
        maxIntensity = intensities[i]; // FROM-GLOWLOGIC
        found = true; // FROM-GLOWLOGIC
      } // FROM-GLOWLOGIC
    } // FROM-GLOWLOGIC
  } // FROM-GLOWLOGIC
  
  return found ? maxIntensity : null; // FROM-GLOWLOGIC
}

export default function H2TemperatureCalculator() { // NEW
  const { saveH2Result, addReportItem } = useProject();
  const [selectedLines, setSelectedLines] = useState<H2LineData[]>( // NEW
    H2_FULCHER_QBRANCH.map(l => ({ // NEW
      J: l.J, // NEW
      wavelength: l.wavelength_nm, // NEW
      E_cm1: l.E_upper_cm1, // NEW
      S_J: l.S_J, // NEW
      I_measured: 0, // NEW
      included: true // NEW
    })) // NEW
  ); // NEW

  const [activeTab, setActiveTab] = useState<"manual" | "upload">("manual"); // NEW
  const [isExplanationOpen, setIsExplanationOpen] = useState(false); // NEW
  const [copyFeedback, setCopyFeedback] = useState(false); // NEW
  const [h2AddedToReport, setH2AddedToReport] = useState(false);
  const [h2ReportLabel, setH2ReportLabel] = useState('');

  const handleIntensityChange = (J: number, val: string) => { // NEW
    const num = parseFloat(val); // NEW
    setSelectedLines(prev => prev.map(l =>  // NEW
      l.J === J ? { ...l, I_measured: isNaN(num) ? 0 : num } : l // NEW
    )); // NEW
  }; // NEW

  const toggleLine = (J: number) => { // NEW
    setSelectedLines(prev => prev.map(l => // NEW
      l.J === J ? { ...l, included: !l.included } : l // NEW
    )); // NEW
  }; // NEW

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { // NEW
    const file = e.target.files?.[0]; // NEW
    if (!file) return; // NEW

    const reader = new FileReader(); // NEW
    reader.onload = (event) => { // NEW
      try { // NEW
        const text = event.target?.result as string; // NEW
        const lines = text.split('\n'); // NEW
        const wavelengths: number[] = []; // NEW
        const intensities: number[] = []; // NEW
        
        lines.forEach(line => { // NEW
          const parts = line.trim().split(/[,;\t\s]+/); // NEW
          if (parts.length >= 2) { // NEW
            const w = parseFloat(parts[0]); // NEW
            const i = parseFloat(parts[1]); // NEW
            if (!isNaN(w) && !isNaN(i)) { // NEW
              wavelengths.push(w); // NEW
              intensities.push(i); // NEW
            } // NEW
          } // NEW
        }); // NEW

        if (wavelengths.length > 0) { 
          setSelectedLines(prev => prev.map(l => { 
            const peak = findPeakNear(wavelengths, intensities, l.wavelength, 0.15); 
            return { 
              ...l, 
              I_measured: peak !== null ? peak : 0, 
              included: peak !== null 
            }; 
          })); // NEW
        } // NEW
      } catch (err) { // NEW
        console.error("Error parsing file", err); // NEW
      } // NEW
    }; // NEW
    reader.readAsText(file); // NEW
  }; // NEW

  const result = useMemo(() => { // NEW
    const validLines = selectedLines // NEW
      .filter(l => l.included) // NEW
      .map(l => ({ J: l.J, E_cm1: l.E_cm1, S_J: l.S_J, I: l.I_measured })); // NEW
    return calculateBoltzmannTemp(validLines); // NEW
  }, [selectedLines]); // NEW

  useEffect(() => {
    if (result && result.T_gas && result.R2) {
      saveH2Result({
        Tgas_K: result.T_gas,
        R2: result.R2,
        timestamp: new Date().toISOString()
      });
    }
  }, [result]);

  const getR2Color = (r2: number) => { // NEW
    if (r2 > 0.98) return { border: 'border-green-500/50', bg: 'bg-green-500/10', text: 'text-green-400', label: "✅ Excellent fit quality" }; // NEW
    if (r2 > 0.95) return { border: 'border-yellow-400/50', bg: 'bg-yellow-400/10', text: 'text-yellow-400', label: "🟢 Good fit quality" }; // NEW
    if (r2 > 0.90) return { border: 'border-orange-500/50', bg: 'bg-orange-500/10', text: 'text-orange-400', label: "🟡 Fair fit quality" }; // NEW
    return { border: 'border-red-500/50', bg: 'bg-red-500/10', text: 'text-red-400', label: "🔴 Poor — check data" }; // NEW
  }; // NEW

  const r2Style = result ? getR2Color(result.R2) : null; // NEW

  const chartData = useMemo(() => { // NEW
    if (!result) return { scatter: [], line: [] }; // NEW
    const scatter = result.points.map(p => ({ x: p.x, y: p.y, J: p.J })); // NEW
    const minX = Math.min(...scatter.map(p => p.x)); // NEW
    const maxX = Math.max(...scatter.map(p => p.x)); // NEW
    const padding = (maxX - minX) * 0.1 || 0.1; // NEW
    
    // Evaluate line at min and max // NEW
    const lineX1 = Math.max(0, minX - padding); // NEW
    const lineX2 = maxX + padding; // NEW
    const line = [ // NEW
      { x: lineX1, yLine: result.slope * lineX1 + result.intercept }, // NEW
      { x: lineX2, yLine: result.slope * lineX2 + result.intercept } // NEW
    ]; // NEW
    return { scatter, line }; // NEW
  }, [result]); // NEW

  const handleAddH2ToReport = () => {
    if (!result?.T_gas || !result?.R2) return;

    const label = h2ReportLabel.trim() ||
      `H2 Fulcher - Tgas = ${result.T_gas.toFixed(0)} K`;

    // Build Boltzmann plot data for PDF
    // x = E_cm1 (upper level energy in cm-1)
    // y = ln(I / S_J) (Boltzmann population)
    const pts = (result.points || []).filter(
      p => isFinite(p.x) && isFinite(p.y)
    );

    const xVals = pts.map(p => p.x);
    const xMin  = Math.min(...xVals);
    const xMax  = Math.max(...xVals);

    // Build the regression line as two-point array
    const padding = (xMax - xMin) * 0.05;
    const lineX1  = xMin - padding;
    const lineX2  = xMax + padding;

    // StoredBoltzmann format matches ProjectContext
    const boltzPlot = {
      points: pts.map(p => ({
        x: p.x,
        y: p.y,
        label: `J=${p.J}`
      })),
      slope:     result.slope,
      intercept: result.intercept,
      xMin: lineX1,
      xMax: lineX2
    };

    addReportItem({
      type: 'h2',
      label,
      result: {
        Tgas_K: Math.round(result.T_gas),
        R2: result.R2,
        timestamp: new Date().toISOString()
      },
      spectrum: boltzPlot,
      timestamp: new Date().toISOString()
    });

    setH2AddedToReport(true);
  };

  const copyResult = () => { // NEW
    if (result) { // NEW
      navigator.clipboard.writeText(`T_gas = ${result.T_gas.toFixed(0)} ± ${result.uncertainty.toFixed(0)} K\nMethod: H₂ Fulcher Q-branch\nR² = ${result.R2.toFixed(3)}`); // NEW
      setCopyFeedback(true); // NEW
      setTimeout(() => setCopyFeedback(false), 2000); // NEW
    } // NEW
  }; // NEW

  return ( // NEW
    <div className="w-full h-full p-4 md:p-6 text-gray-200 bg-[#0a0a0f] overflow-y-auto font-sans rounded-xl border border-white/10">
      {/* SECTION 1: HEADER */}
      <header className="mb-8 border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#00f0ff] mb-2 drop-shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            🔥 H₂ GAS TEMPERATURE
          </h1>
          <p className="text-gray-400 text-lg">Fulcher-α Q-branch Boltzmann method</p>
        </div>
        <div className="bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] px-4 py-2 rounded-lg font-mono font-bold tracking-widest text-sm shadow-[0_0_10px_rgba(0,240,255,0.2)]">
          600-610nm
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          {/* SECTION 2: DATA INPUT */}
          <div className="bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm shadow-xl overflow-hidden">
            <div className="flex border-b border-white/10">
              <button 
                className={`flex-1 py-3 text-sm font-bold tracking-widest uppercase transition-colors ${activeTab === 'manual' ? 'bg-[#00f0ff]/10 text-[#00f0ff] border-b-2 border-[#00f0ff]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`} 
                onClick={() => setActiveTab("manual")} 
              >
                Manual Entry
              </button>
              <button 
                className={`flex-1 py-3 text-sm font-bold tracking-widest uppercase transition-colors ${activeTab === 'upload' ? 'bg-[#00f0ff]/10 text-[#00f0ff] border-b-2 border-[#00f0ff]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`} 
                onClick={() => setActiveTab("upload")} 
              >
                Upload Spectrum
              </button>
            </div>

            <div className="p-4">
              {activeTab === 'upload' && (
                <div className="mb-6 p-4 bg-black/40 border border-dashed border-white/20 rounded-lg text-center">
                  <p className="text-sm text-gray-400 mb-4">Upload a CSV/TXT file with wavelength and intensity columns. The app will auto-detect peaks near the Q-branch wavelengths (±0.15nm).</p>
                  <label className="bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 px-6 py-2 rounded cursor-pointer transition-all text-sm font-bold tracking-wider inline-block">
                    <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
                    CHOOSE FILE
                  </label>
                </div>
              )}

              <div className="overflow-x-auto rounded border border-white/5">
                <table className="w-full text-left text-sm whitespace-nowrap bg-black/30">
                  <thead className="bg-white/5 text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="px-3 py-2 font-bold uppercase text-[10px] tracking-wider text-center">Inc</th>
                      <th className="px-3 py-2 font-bold uppercase text-[10px] tracking-wider text-center">J</th>
                      <th className="px-3 py-2 font-bold uppercase text-[10px] tracking-wider">λ(nm)</th>
                      <th className="px-3 py-2 font-bold uppercase text-[10px] tracking-wider">E(cm⁻¹)</th>
                      <th className="px-3 py-2 font-bold uppercase text-[10px] tracking-wider">S_J</th>
                      <th className="px-3 py-2 font-bold uppercase text-[10px] tracking-wider text-right">I_measured</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {selectedLines.map(line => (
                      <tr key={line.J} className={`transition-colors ${line.included ? 'hover:bg-white/5' : 'opacity-40'}`}>
                        <td className="px-3 py-2 text-center">
                          <input 
                            type="checkbox"
                            checked={line.included}
                            onChange={() => toggleLine(line.J)}
                            className="accent-[#00f0ff] bg-black/50 border-white/20 rounded"
                          />
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-[#00f0ff]">{line.J}</td>
                        <td className="px-3 py-2 font-mono text-xs">{line.wavelength.toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{line.E_cm1.toFixed(1)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-plasma-cyan">{line.S_J.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right">
                          <input 
                            type="number"
                            step="any"
                            value={line.I_measured || ''}
                            onChange={e => handleIntensityChange(line.J, e.target.value)}
                            className={`w-24 bg-black/60 border ${line.I_measured > 0 ? 'border-[#00f0ff]/40 text-[#00f0ff]' : 'border-white/10 text-gray-400'} rounded px-2 py-1 text-right font-mono text-sm outline-none focus:border-[#00f0ff]/70 transition-colors`}
                            placeholder="0.0"
                            disabled={!line.included}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 7: PHYSICS EXPLANATION */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-5 backdrop-blur-sm">
            <button 
              onClick={() => setIsExplanationOpen(!isExplanationOpen)}
              className="flex justify-between items-center w-full text-left"
            >
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <span>📚 Physics Explanation</span>
              </h3>
              <span className="text-gray-500 font-mono text-xs">{isExplanationOpen ? '[-]' : '[+]'}</span>
            </button>
            {isExplanationOpen && (
              <div className="mt-4 text-xs text-gray-400 leading-relaxed space-y-3 p-4 bg-black/30 rounded border border-white/5">
                <p>
                  The H₂ Fulcher-α system (d³Πᵤ → a³Σg⁺) emits in the 600-640nm range.
                  Q-branch lines (ΔJ=0) have well-defined line strengths S_J.
                </p>
                <p>
                  A Boltzmann plot of ln(I/S) vs upper state energy E (cm⁻¹) gives the rotational temperature, 
                  which equals the gas temperature when rotational-translational equilibrium is established 
                  (typically valid at pressures above ~1 mbar).
                </p>
                <p className="text-yellow-400 border border-yellow-500/20 bg-yellow-500/10 p-3 rounded">
                  <strong>Note on Negative Y-Axis:</strong> The mathematical term <span className="font-mono bg-black/50 px-1 rounded">ln(I / S_J)</span> can be negative if <span className="font-mono bg-black/50 px-1 rounded">I_measured &lt; S_J</span>. The temperature depends exclusively on the <em>slope</em> of the fit, so the absolute intensity value (and thus a negative Y-axis) does not affect the correctness of the final temperature.
                </p>
                <p className="italic border-t border-white/5 pt-2 mt-2">
                  Reference: Herzberg, Spectra of Diatomic Molecules
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8 flex flex-col">
          {/* SECTION 4: RESULT CARD */}
          <div className={`border-2 rounded-lg backdrop-blur-sm shadow-2xl overflow-hidden transition-all duration-300 ${
              !result ? 'border-white/10 bg-white/5' : r2Style?.border + ' ' + r2Style?.bg
            }`}>
            <div className="p-8 h-full flex flex-col justify-center items-center text-center">
              {!result ? (
                <div className="text-gray-400 py-6 text-center animate-pulse tracking-widest font-mono text-sm uppercase">
                  Awaiting Data (Need 3+ lines)
                </div>
              ) : (
                <div className="w-full">
                  <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest opacity-80">Temperature Result</h3>
                  
                  <div className="text-5xl lg:text-6xl font-mono font-bold text-white mb-2 tracking-tight flex items-baseline justify-center gap-2">
                    <span>T_gas = {result.T_gas.toFixed(0)}</span>
                    <span className="text-2xl text-gray-400">± {result.uncertainty.toFixed(0)}</span>
                    <span className="text-[#00f0ff] ml-2">K</span>
                  </div>
                  
                  <div className="mt-8 mb-6 p-5 bg-black/40 rounded-lg border border-white/10 inline-block text-left w-full max-w-sm mx-auto">
                    <div className="space-y-2 text-sm font-mono text-gray-300">
                      <p className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-500">Method:</span>
                        <span className="text-white">H₂ Fulcher Q-branch</span>
                      </p>
                      <p className="flex justify-between border-b border-white/5 py-2">
                        <span className="text-gray-500">Lines used:</span>
                        <span className="text-[#00f0ff] font-bold">{result.points.length}</span>
                      </p>
                      <p className="flex justify-between py-2">
                        <span className="text-gray-500">R² fit:</span>
                        <span className="text-white font-bold">{result.R2.toFixed(3)}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className={`text-sm font-bold text-center px-4 py-2 inline-block rounded-full border ${r2Style?.text} ${r2Style?.border} bg-black/30`}>
                    {r2Style?.label}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 8: EXPORT */}
            {result && (
              <div className="bg-black/50 border-t border-white/10 p-4 flex justify-end gap-3">
                <button 
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs font-bold uppercase tracking-wider text-gray-300 transition-colors flex items-center"
                  onClick={copyResult}
                >
                  {copyFeedback ? '✓ COPIED' : '📋 COPY RESULT'}
                </button>
              </div>
            )}
          </div>

          {/* Add H2 result to Report */}
          {result?.T_gas && (
            <div className="bg-black/40 border border-[#ff6b35]/20 rounded-lg p-4 flex flex-wrap gap-3 items-center mt-4">
              <FileText size={14} className="text-[#ff6b35] shrink-0" />
              <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                Add to Report:
              </span>
              <input
                type="text"
                value={h2ReportLabel}
                onChange={e => setH2ReportLabel(e.target.value)}
                placeholder={`H2 Fulcher Tgas=${result.T_gas.toFixed(0)}K`}
                className="flex-1 min-w-0 bg-black/60 border border-white/10 text-white rounded px-3 py-1.5 text-xs font-mono outline-none focus:border-[#ff6b35] transition-colors"
              />
              <button
                onClick={handleAddH2ToReport}
                disabled={h2AddedToReport}
                className={`px-4 py-1.5 rounded text-xs font-bold tracking-wider uppercase transition-all shrink-0 ${
                  h2AddedToReport
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                    : 'bg-[#ff6b35]/20 border border-[#ff6b35]/30 text-[#ff6b35] hover:bg-[#ff6b35]/30'
                }`}
              >
                {h2AddedToReport ? '✓ Added' : '+ Add'}
              </button>
            </div>
          )}

          {/* SECTION 5: TEMPERATURE CONTEXT */}
          {result && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-sm relative">
              <h3 className="text-xs font-bold text-gray-400 mb-8 uppercase tracking-widest">Temperature Context</h3>
              <div className="relative h-3 bg-gradient-to-r from-blue-900 via-yellow-700 to-white/90 rounded-full">
                <div 
                  className="absolute w-4 h-8 bg-[#00f0ff] rounded shadow-[0_0_15px_#00f0ff] z-10 transition-all duration-700 ease-out" 
                  style={{ 
                    left: `${Math.max(0, Math.min(100, (Math.log10(result.T_gas) - Math.log10(300)) / (Math.log10(15000) - Math.log10(300)) * 100))}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[#00f0ff] text-xs font-bold font-mono tracking-wider bg-black/80 px-2 py-1 rounded border border-[#00f0ff]/30 whitespace-nowrap">
                    ▼ {result.T_gas.toFixed(0)}K
                  </div>
                </div>
                {/* scale markers log scale approx */}
                <div className="absolute top-6 left-[0%] text-[10px] text-gray-500 font-mono -translate-x-1/2 text-center opacity-70">300K<br/>Room</div>
                <div className="absolute top-6 left-[25%] text-[10px] text-gray-500 font-mono -translate-x-1/2 text-center opacity-70">750K<br/>Warm</div>
                <div className="absolute top-6 left-[50%] text-[10px] text-gray-500 font-mono -translate-x-1/2 text-center opacity-70">2000K<br/>Hot</div>
                <div className="absolute top-6 left-[75%] text-[10px] text-gray-500 font-mono -translate-x-1/2 text-center opacity-70">5500K<br/>Arc</div>
                <div className="absolute top-6 left-[100%] text-[10px] text-gray-500 font-mono -translate-x-1/2 text-center opacity-70">15000K<br/>Stellar</div>
              </div>
              <div className="h-10"></div> {/* spacer for labels */}
            </div>
          )}

          {/* SECTION 3: BOLTZMANN PLOT */}
          {result && chartData && (
            <div className="bg-[#00f0ff]/5 border border-[#00f0ff]/20 rounded-lg p-6 backdrop-blur-sm shadow-xl flex-1 min-h-[300px] flex flex-col">
              <h3 className="text-xs font-bold text-[#00f0ff] mb-4 uppercase tracking-widest border-b border-[#00f0ff]/20 pb-2">Boltzmann Plot</h3>
              <div className="flex-1 w-full h-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart margin={{ top: 10, right: 10, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="Energy (cm⁻¹)"
                      domain={['auto', 'auto']} 
                      stroke="#666"
                      tick={{fill: '#888', fontSize: 11, fontFamily: 'monospace'}}
                      label={{ value: 'Energy E (cm⁻¹)', position: 'bottom', fill: '#aaa', fontSize: 12 }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="ln(I/S)"
                      domain={['auto', 'auto']} 
                      stroke="#666"
                      tick={{fill: '#888', fontSize: 11, fontFamily: 'monospace'}}
                      label={{ value: 'ln(I / S)', angle: -90, position: 'left', fill: '#aaa', fontSize: 12 }}
                    />
                    <Tooltip 
                      cursor={{strokeDasharray: '3 3', stroke: '#444'}}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length && payload[0].payload.J) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-[#0a0a0f] border border-[#00f0ff]/30 p-3 rounded shadow-lg">
                              <p className="text-[#00f0ff] font-bold text-sm mb-1 uppercase tracking-wider">Line J={d.J}</p>
                              <p className="text-gray-300 font-mono text-xs">E: {d.x.toFixed(1)} cm⁻¹</p>
                              <p className="text-gray-300 font-mono text-xs">ln(I/S): {d.y.toFixed(3)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    
                    {/* Linear Regression Line */}
                    <Line 
                      data={chartData.line} 
                      type="linear" 
                      dataKey="yLine" 
                      stroke="#b400ff" 
                      strokeWidth={2} 
                      dot={false} 
                      activeDot={false} 
                      isAnimationActive={false}
                    />
                    
                    {/* Data Points */}
                    <Scatter 
                      data={chartData.scatter} 
                      fill="#00f0ff" 
                      line={false}
                      shape="circle"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 6: LINE TABLE -> Detailed residuals */}
      {result && (
        <div className="mt-8 bg-white/5 border border-white/10 rounded-lg p-5 backdrop-blur-sm shadow-xl overflow-hidden">
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest border-b border-white/10 pb-3">Line Residuals (Fit Quality)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap bg-black/30">
              <thead className="bg-[#00f0ff]/5 text-gray-400 border-b border-[#00f0ff]/20">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider">J</th>
                  <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider">λ(nm)</th>
                  <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider">I_meas</th>
                  <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider">ln(I/S)</th>
                  <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider">Fit Value</th>
                  <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider text-right">Residual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {selectedLines.filter(l => l.included && l.I_measured > 0).map(line => {
                  const x = line.E_cm1;
                  const y = Math.log(line.I_measured / line.S_J);
                  const fit = result.slope * x + result.intercept;
                  const residual = y - fit;
                  return (
                    <tr key={line.J} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#00f0ff]">{line.J}</td>
                      <td className="px-4 py-3 font-mono text-xs">{line.wavelength.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-plasma-cyan">{line.I_measured.toFixed(1)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{y.toFixed(3)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{fit.toFixed(3)}</td>
                      <td className={`px-4 py-3 font-mono text-xs text-right font-bold ${Math.abs(residual) > 0.5 ? 'text-red-400' : Math.abs(residual) > 0.2 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {residual > 0 ? '+' : ''}{residual.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
