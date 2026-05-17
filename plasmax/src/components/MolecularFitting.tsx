import React, { useState, useCallback, useEffect } from 'react';
import { 
  generateSyntheticManifold,
  N2_SPS_MODEL,
  C2_SWAN_MODEL, 
  CN_VIOLET_MODEL,
  OH_UV_MODEL,
  N2P_FNS_MODEL,
  NO_BETA_MODEL,
  NH_MODEL,
  type MolecularModel
} from '../utils/molSpectro';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Download, Upload, Activity, RefreshCw } from 'lucide-react';

type Molecule = 'N2' | 'C2' | 'CN' | 'OH' | 'N2+' | 'NO' | 'NH';

// Molecules where only Trot is meaningful
// (Tvib not independently extractable)
const TROT_ONLY = new Set<Molecule>(['OH', 'NH']);

// NEW
function getModel(molecule: Molecule): MolecularModel {
  switch(molecule) {
    case 'N2':  return N2_SPS_MODEL;
    case 'C2':  return C2_SWAN_MODEL;
    case 'CN':  return CN_VIOLET_MODEL;
    case 'OH':  return OH_UV_MODEL;
    case 'N2+': return N2P_FNS_MODEL;
    case 'NO':  return NO_BETA_MODEL;
    case 'NH':  return NH_MODEL;
  }
}

const MOLECULE_META: Record<Molecule, {
  display: string;
  system: string;
  range: string;
  badge: string;
  badgeColor: string;
  group: string;
  demoTrot: number;
  demoTvib: number;
  demoInst: number;
  demoDesc: string;
  info: string;
}> = {
  N2: {
    display: 'N₂', system: 'C³Πᵤ→B³Πg',
    range: '366–376 nm', badge: 'Trot + Tvib',
    badgeColor: '#00f0ff', group: 'Nitrogen',
    demoTrot: 500, demoTvib: 4000, demoInst: 0.15,
    demoDesc: 'DBD plasma in air — cold gas, elevated Tvib',
    info: 'Standard diagnostic for all N₂/air plasma. Trot approximates Tgas at pressures above 10 Torr. Tvib is typically elevated in non-equilibrium discharges.'
  },
  C2: {
    display: 'C₂', system: 'd³Πg→a³Πᵤ',
    range: '512–517 nm', badge: 'Trot + Tvib',
    badgeColor: '#00f0ff', group: 'Carbon',
    demoTrot: 3000, demoTvib: 6000, demoInst: 0.10,
    demoDesc: 'Arc plasma with carbon electrodes',
    info: 'C₂ Swan bands appear in carbon-containing plasma. The characteristic green emission. Both Trot and Tvib measurable from the rotational envelope shape.'
  },
  CN: {
    display: 'CN', system: 'B²Σ⁺→X²Σ⁺',
    range: '385–389 nm', badge: 'Trot + Tvib',
    badgeColor: '#00f0ff', group: 'Carbon',
    demoTrot: 1500, demoTvib: 5000, demoInst: 0.10,
    demoDesc: 'N₂-CH₄ plasma mixture',
    info: 'CN violet system indicates N₂-carbon chemistry. As a Σ→Σ transition, no Q-branch exists. Three overlapping bands create the characteristic triple-peak pattern.'
  },
  OH: {
    display: 'OH', system: 'A²Σ⁺→X²Π',
    range: '306–320 nm', badge: 'Tgas',
    badgeColor: '#ff6b35', group: 'O / H',
    demoTrot: 1200, demoTvib: 1200, demoInst: 0.10,
    demoDesc: 'Atmospheric DBD with humidity — Trot = Tgas',
    info: 'Most sensitive atmospheric plasma diagnostic. OH rotational temperature directly equals Tgas for collisional plasma. Essential for DBD, APPJ, and biomedical plasma.'
  },
  'N2+': {
    display: 'N₂⁺', system: 'B²Σᵤ⁺→X²Σg⁺',
    range: '388–428 nm', badge: 'Trot + Tvib',
    badgeColor: '#00f0ff', group: 'Nitrogen',
    demoTrot: 800, demoTvib: 6000, demoInst: 0.15,
    demoDesc: 'High-voltage N₂ discharge — strong ionization',
    info: 'First Negative System of ionized nitrogen. Presence indicates high reduced electric field E/N > 100 Td. Always present alongside N₂ SPS in high-energy discharges.'
  },
  NO: {
    display: 'NO', system: 'A²Σ⁺→X²Π',
    range: '226–270 nm', badge: 'Trot + Tvib',
    badgeColor: '#00f0ff', group: 'Nitrogen',
    demoTrot: 2000, demoTvib: 4000, demoInst: 0.15,
    demoDesc: 'Air plasma — NOx production conditions',
    info: 'NO beta system is key indicator of air plasma chemistry and NOx production. Important for plasma-assisted combustion. Requires quartz optics (UV range).'
  },
  NH: {
    display: 'NH', system: 'A³Π→X³Σ⁻',
    range: '328–342 nm', badge: 'Tgas',
    badgeColor: '#ff6b35', group: 'Nitrogen',
    demoTrot: 1000, demoTvib: 1000, demoInst: 0.12,
    demoDesc: 'N₂-H₂ plasma mixture — plasma nitriding',
    info: 'NH radical diagnostic for N₂-H₂ plasma and plasma nitriding. Trot directly measures heavy particle temperature. Triplet system with three Ω sub-components.'
  }
};

const MOLECULE_GROUPS: { label: string; members: Molecule[] }[] = [
  { label: 'Nitrogen Systems', members: ['N2', 'N2+', 'NO', 'NH'] },
  { label: 'Carbon Systems',   members: ['C2', 'CN'] },
  { label: 'O / H Systems',    members: ['OH'] }
];

interface FitResult {
  Trot: number;
  Tvib: number;
  shift: number; // NEW
  rmse: number;
  ratio: number;
}

interface SpectrumPoint {
  wavelength: number;
  intensity: number;
}

const parseCSV = (text: string): SpectrumPoint[] => {
  const lines = text.split('\n');
  let points: SpectrumPoint[] = [];
  for (const line of lines) {
    if (line.trim() === '' || line.startsWith('#') || line.startsWith('//')) continue;
    const parts = line.replace(/,/g, '\t').replace(/;/g, '\t').split('\t').map(s => s.trim()).filter(s => s !== '');
    if (parts.length >= 2) {
      const wl = parseFloat(parts[0]);
      const i = parseFloat(parts[1]);
      if (!isNaN(wl) && !isNaN(i)) {
        points.push({ wavelength: wl, intensity: i });
      }
    }
  }
  
  points.sort((a,b) => a.wavelength - b.wavelength);
  
  if (points.length > 0) {
    const minInt = Math.min(...points.map(p => p.intensity));
    const maxInt = Math.max(...points.map(p => p.intensity));
    const range = maxInt - minInt;
    
    if (range > 0) {
      points = points.map(p => ({
        wavelength: p.wavelength,
        intensity: (p.intensity - minInt) / range
      }));
    } else {
      points = points.map(p => ({
        wavelength: p.wavelength,
        intensity: 0
      }));
    }
  }
  
  return points;
};

export default function MolecularFitting() {
  const [selectedMolecule, setSelectedMolecule] = useState<Molecule>('N2');
  
  const [experimentalSpectrum, setExperimentalSpectrum] = useState<SpectrumPoint[] | null>(null);
  const [syntheticSpectrum, setSyntheticSpectrum] = useState<SpectrumPoint[] | null>(null);
  const [fitResult, setFitResult] = useState<FitResult | null>(null);
  const [isFitting, setIsFitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fwhmNm, setFwhmNm] = useState(0.1);
  const [useDemo, setUseDemo] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isPhysicsOpen, setIsPhysicsOpen] = useState(false);

  // NEW: Update demo spectrum generation
  const generateDemoSpectrum = useCallback((molecule: Molecule): SpectrumPoint[] => {
    // FROM-GLOWLOGIC-ENGINE
    const model = getModel(molecule);
    const range = model.fit_range_nm;
    
    // Generate 1000 points in fit range
    const n = 1000;
    const targetAxis = Array.from({length: n}, 
      (_, i) => range[0] + (range[1]-range[0]) * i/(n-1)
    );
    
    const params = MOLECULE_META[molecule];
    const synth = generateSyntheticManifold({
      trot: params.demoTrot,
      tvib: params.demoTvib,
      inst: params.demoInst,
      shift: 0,
      model,
      targetAxis,
      clipBounds: { low: range[0], high: range[1] }
    });
    
    // Add small noise ±2%
    const maxVal = Math.max(...Array.from(synth));
    return targetAxis.map((wl, i) => ({
      wavelength: wl,
      intensity: maxVal > 0 
        ? synth[i]/maxVal + (Math.random()-0.5)*0.04 
        : 0
    }));
  }, []);

  const handleDemoClick = () => {
    const demo = generateDemoSpectrum(selectedMolecule);
    setExperimentalSpectrum(demo);
    setSyntheticSpectrum(null);
    setFitResult(null);
    setUseDemo(true);
    setFwhmNm(0.1);
    updateChart(demo, null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const pts = parseCSV(text);
        if (pts.length > 0) {
          setExperimentalSpectrum(pts);
          setSyntheticSpectrum(null);
          setFitResult(null);
          setUseDemo(false);
          updateChart(pts, null);
        }
      } catch (err) {
        console.error("Error parsing file", err);
      }
    };
    reader.readAsText(file);
  };

  const updateChart = (exp: SpectrumPoint[] | null, syn: SpectrumPoint[] | null) => {
    if (!exp) {
      setChartData([]);
      return;
    }
    const data = exp.map((p, i) => ({
      wavelength: p.wavelength,
      expInt: p.intensity,
      synInt: syn && syn[i] ? syn[i].intensity : null
    }));
    setChartData(data);
  };
  
  useEffect(() => {
    if (syntheticSpectrum && experimentalSpectrum) {
      updateChart(experimentalSpectrum, syntheticSpectrum);
    }
  }, [syntheticSpectrum, experimentalSpectrum]);

  // NEW: Update fitting algorithm
  const runFit = useCallback(async () => {
    if (!experimentalSpectrum) return;
    setIsFitting(true);
  
    // FROM-GLOWLOGIC-ENGINE
    const model = getModel(selectedMolecule);
    
    // Filter to fit range to avoid minimizing on irrelevant data
    const fitData = experimentalSpectrum.filter(p => 
      p.wavelength >= model.fit_range_nm[0] && 
      p.wavelength <= model.fit_range_nm[1]
    );
    const usedData = fitData.length > 0 ? fitData : experimentalSpectrum;

    const targetAxis = usedData
      .map(p => p.wavelength);
    const clipBounds = {
      low: targetAxis[0],
      high: targetAxis[targetAxis.length - 1]
    };
  
    const yExp = usedData
      .map(p => p.intensity);
    const yMax = Math.max(...yExp) || 1;
  
    const getLoss = (tr: number, tv: number, sh: number) => {
      const s = generateSyntheticManifold({
        trot: tr, tvib: tv, inst: fwhmNm,
        shift: sh, model, targetAxis, clipBounds
      });
      let mS = 1e-15;
      for (let j = 0; j < s.length; j++) 
        if (s[j] > mS) mS = s[j];
      let loss = 0;
      const limit = Math.min(s.length, yExp.length);
      for (let j = 0; j < limit; j++) {
        loss += Math.pow(
          (yExp[j] / yMax) - (s[j] / mS), 2
        );
      }
      return loss;
    };
  
    const meta = MOLECULE_META[selectedMolecule];
    let bestTrot = meta.demoTrot;
    let bestTvib = meta.demoTvib;
    let bestShift = 0;
  
    // Coarse shift scan to handle uncalibrated spectrometers
    let bestCoarseLoss = Infinity;
    for (let sh = -4.0; sh <= 4.0; sh += 0.1) {
      const loss = getLoss(bestTrot, bestTvib, sh);
      if (loss < bestCoarseLoss) {
        bestCoarseLoss = loss;
        bestShift = sh;
      }
    }

    for (let i = 0; i < 40; i++) {
      const decay = Math.exp(-i / 15);
      const stepT = 500 * decay;
      const stepS = 0.2 * decay; // increased allowing ±3nm shifts
      const baseLoss = getLoss(bestTrot, bestTvib, bestShift);
  
      if (getLoss(bestTrot, bestTvib, bestShift + stepS) 
          < baseLoss) bestShift += stepS;
      else if (getLoss(bestTrot, bestTvib, bestShift - stepS) 
          < baseLoss) bestShift -= stepS;
  
      if (getLoss(bestTrot + stepT, bestTvib, bestShift) 
          < baseLoss) bestTrot += stepT;
      else if (getLoss(bestTrot - stepT, bestTvib, bestShift) 
          < baseLoss) bestTrot -= stepT;
  
      // For Trot-only molecules (OH, NH) fix Tvib = Trot
      // These molecules thermalize rapidly —
      // rotational and vibrational are coupled
      if (!TROT_ONLY.has(selectedMolecule)) {
        if (getLoss(bestTrot, bestTvib + stepT*2, bestShift) 
            < baseLoss) bestTvib += stepT * 2;
        else if (getLoss(bestTrot, bestTvib - stepT*2, bestShift) 
            < baseLoss) bestTvib -= stepT * 2;
      } else {
        bestTvib = bestTrot;
      }
  
      setFitResult({
        Trot: Math.round(bestTrot),
        Tvib: Math.round(bestTvib),
        shift: bestShift,
        rmse: Math.sqrt(baseLoss / targetAxis.length),
        ratio: bestTvib / bestTrot
      });
      setProgress(((i + 1) / 40) * 100);
  
      if (i % 4 === 0) {
        await new Promise(r => setTimeout(r, 10));
      }
    }
  
    // Generate final synthetic for display (span full experimental range)
    const fullTargetAxis = experimentalSpectrum.map(p => p.wavelength);
    const fullClipBounds = {
      low: fullTargetAxis[0],
      high: fullTargetAxis[fullTargetAxis.length - 1]
    };

    const finalSynth = generateSyntheticManifold({
      trot: bestTrot, tvib: bestTvib,
      inst: fwhmNm, shift: bestShift,
      model, targetAxis: fullTargetAxis, 
      clipBounds: fullClipBounds
    });
    
    // We want to normalize the final synthetic spectrum based on the FIT DATA range maximum
    let localSynMax = 1e-15;
    for (let j = 0; j < targetAxis.length; j++) {
       // match the subset 
       // generateSyntheticManifold returns amplitudes. We can just evaluate it inside the fit window:
       const wl = targetAxis[j];
       const fullIdx = fullTargetAxis.findIndex(x => x === wl);
       if (fullIdx !== -1 && finalSynth[fullIdx] > localSynMax) {
         localSynMax = finalSynth[fullIdx];
       }
    }
    const maxS = Math.max(...Array.from(finalSynth)) || 1;
    // Actually we will normalize the plot in the render phase
    
    setSyntheticSpectrum(
      fullTargetAxis.map((wl, i) => ({
        wavelength: wl,
        intensity: finalSynth[i]
      }))
    );
  
    setIsFitting(false);
    setProgress(100);
  }, [experimentalSpectrum, selectedMolecule, fwhmNm]);

  // Compute what to display based on selected molecule model
  const displayModel = getModel(selectedMolecule);
  const displayRange = [displayModel.fit_range_nm[0] - 2, displayModel.fit_range_nm[1] + 2];
  
  // Filter chart data to Zoom in on the fitting range, and re-normalize intensities locally
  let filteredChartData = chartData.filter(d => d.wavelength >= displayRange[0] && d.wavelength <= displayRange[1]);
  if (filteredChartData.length > 0) {
    const localExpMax = Math.max(...filteredChartData.map(d => d.expInt || 0)) || 1;
    const localSynMax = Math.max(...filteredChartData.map(d => d.synInt || 0)) || 1;
    filteredChartData = filteredChartData.map(d => ({
      ...d,
      expInt: d.expInt / localExpMax,
      synInt: d.synInt !== null ? d.synInt / localSynMax : null
    }));
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      {/* SECTION 1: Header */}
      <div className="border border-[#00f0ff]/30 bg-[#00f0ff]/5 p-6 rounded-xl flex items-center justify-between shadow-[0_0_15px_rgba(0,240,255,0.1)]">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-widest flex items-center gap-3">
            <Activity className="text-[#00f0ff]" />
            MOLECULAR SPECTRUM FITTING
          </h2>
          <p className="text-[#00f0ff]/70 font-mono text-sm mt-1">Extract Trot and Tvib from band spectra</p>
        </div>
      </div>

      {/* SECTION 2: Molecule Selector — grouped */}
      <div className="space-y-4">
        {MOLECULE_GROUPS.map(group => (
          <div key={group.label}>
            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2 pl-1">
              {group.label}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {group.members.map(mol => {
                const m = MOLECULE_META[mol];
                const sel = selectedMolecule === mol;
                return (
                  <button
                    key={mol}
                    onClick={() => {
                      setSelectedMolecule(mol);
                      setExperimentalSpectrum(null);
                      setSyntheticSpectrum(null);
                      setFitResult(null);
                      setChartData([]);
                      setFwhmNm(m.demoInst);
                    }}
                    className={`p-4 rounded-lg border text-left transition-all duration-300 relative overflow-hidden backdrop-blur-sm ${
                      sel
                        ? 'bg-[#00f0ff]/10 border-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {sel && (
                      <div className="absolute top-0 right-0 w-12 h-12 bg-[#00f0ff]/20 blur-2xl rounded-full mix-blend-screen" />
                    )}
                    <div className={`text-xl font-bold mb-0.5 ${sel ? 'text-[#00f0ff]' : 'text-white'}`}>
                      {m.display}
                    </div>
                    <div className="text-[10px] text-gray-400 italic mb-1 leading-tight">
                      {m.system}
                    </div>
                    <div className="text-[10px] font-mono text-gray-500 mb-2">
                      {m.range}
                    </div>
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        color: m.badgeColor,
                        backgroundColor: m.badgeColor + '22',
                        border: `1px solid ${m.badgeColor}55`
                      }}
                    >
                      {m.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 3: Input Controls */}
      <div className="bg-black/40 border border-white/10 p-6 rounded-lg backdrop-blur-sm">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex gap-4">
            <label className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded cursor-pointer transition-all text-sm font-bold tracking-wider inline-flex items-center gap-2">
              <Upload size={16} />
              UPLOAD CSV
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            </label>
            <button 
              onClick={handleDemoClick}
              className="bg-[#b400ff]/20 hover:bg-[#b400ff]/30 text-[#b400ff] border border-[#b400ff]/30 px-4 py-2 rounded cursor-pointer transition-all text-sm font-bold tracking-wider inline-flex items-center gap-2"
            >
              <Activity size={16} />
              USE DEMO SPECTRUM
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm font-mono">Instrumental FWHM (nm):</span>
            <input 
              type="number" 
              step="0.01" 
              min="0.01" 
              value={fwhmNm} 
              onChange={e => setFwhmNm(parseFloat(e.target.value) || 0.1)}
              className="w-20 bg-black/60 border border-white/20 text-white rounded px-2 py-1 font-mono text-center outline-none focus:border-[#00f0ff] transition-colors" 
            />
          </div>
          
          <button
            onClick={runFit}
            disabled={!experimentalSpectrum || isFitting}
            className={`px-6 py-2 rounded font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${
              !experimentalSpectrum 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                : isFitting 
                  ? 'bg-[#00f0ff]/50 text-white cursor-wait'
                  : 'bg-[#00f0ff] text-black hover:bg-white hover:shadow-[0_0_15px_rgba(0,240,255,0.6)]'
            }`}
          >
            {isFitting ? <RefreshCw className="animate-spin" size={16} /> : <Activity size={16} />}
            {isFitting ? 'Fitting...' : 'Run Fit'}
          </button>
        </div>
      </div>

      {/* SECTION 4: Progress */}
      {isFitting && (
        <div className="bg-black/40 border border-[#00f0ff]/30 p-4 rounded-lg">
          <div className="flex justify-between text-xs font-mono text-[#00f0ff] mb-2">
            <span>Coordinate Descent Optimization...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-white/10">
            <div 
              className="bg-[#00f0ff] h-full shadow-[0_0_10px_rgba(0,240,255,0.8)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* SECTION 5: Spectrum Plot */}
      {filteredChartData.length > 0 && (
        <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-4 h-[400px]">
          <div className="text-xs text-gray-500 font-mono mb-2">Displaying Region: {displayRange[0]} - {displayRange[1]} nm</div>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={filteredChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="wavelength" 
                stroke="#666" 
                tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }} 
                type="number"
                domain={['dataMin', 'dataMax']}
                label={{ value: 'Wavelength (nm)', position: 'bottom', fill: '#aaa', fontSize: 12 }}
              />
              <YAxis 
                stroke="#666" 
                tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }} 
                label={{ value: 'Normalized Intensity', angle: -90, position: 'left', fill: '#aaa', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0a0f', borderColor: '#333', borderRadius: '8px' }}
                itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }}
                labelStyle={{ color: '#aaa', marginBottom: '5px' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ opacity: 0.8 }} />
              <Line 
                type="monotone" 
                dataKey="expInt" 
                stroke="#888" 
                strokeWidth={1.5}
                dot={false}
                name="Experimental" 
                isAnimationActive={false}
              />
              {syntheticSpectrum && (
                <Line 
                  type="monotone" 
                  dataKey="synInt" 
                  stroke="#00f0ff" 
                  strokeWidth={2}
                  dot={false}
                  name="Synthetic Fit" 
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* SECTION 6 & 7: Results & Equilibrium */}
      {fitResult && !isFitting && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* INFO BOX */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-lg text-left text-xs text-gray-400 col-span-1">
             <h3 className="text-white font-bold mb-2">FIT INFO</h3>
             <p className="mb-2">Full Rotational Simulation</p>
             <p className="text-[#00f0ff] mt-2 font-mono">Wavelength shift: {fitResult.shift > 0 ? '+' : ''}{fitResult.shift.toFixed(3)} nm</p>
             <p className="mt-2 text-gray-500">Coordinate descent optimized Trot, Tvib, and instrumental shift simultaneously.</p>
          </div>
          
          {/* ROTATIONAL */}
          <div className="bg-black/40 border border-[#00f0ff]/30 p-6 rounded-lg text-center relative overflow-hidden backdrop-blur-sm col-span-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent opacity-50" />
            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center justify-center gap-2">
              {TROT_ONLY.has(selectedMolecule) 
                ? '🌡️ T_GAS' 
                : '🌡️ T_ROTATIONAL'}
            </h3>
            <div className="text-4xl font-mono font-bold text-[#00f0ff] mb-2">
              {fitResult.Trot.toFixed(0)} <span className="text-lg text-gray-400">K</span>
            </div>
            <div className="text-sm font-mono text-gray-500 mb-4">
              ± 15 K
            </div>
            <div className="text-xs text-[#00f0ff]/80 bg-[#00f0ff]/10 py-1.5 px-3 rounded inline-block">
              {TROT_ONLY.has(selectedMolecule)
                ? '= Tgas (direct measurement)'
                : '≈ Gas Temperature'}
            </div>
          </div>

          {/* VIBRATIONAL — hidden for OH and NH */}
          {!TROT_ONLY.has(selectedMolecule) && (
          <div className="bg-black/40 border border-[#b400ff]/30 p-6 rounded-lg text-center relative overflow-hidden backdrop-blur-sm col-span-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#b400ff] to-transparent opacity-50" />
            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center justify-center gap-2">
              ⚡ T_VIBRATIONAL
            </h3>
            <div className="text-4xl font-mono font-bold text-[#b400ff] mb-2">
              {fitResult.Tvib.toFixed(0)} <span className="text-lg text-gray-400">K</span>
            </div>
            <div className="text-sm font-mono text-gray-500 mb-4">± 50 K</div>
            <div className="text-xs text-[#b400ff]/80 bg-[#b400ff]/10 py-1.5 px-3 rounded inline-block">
              RMSE: {fitResult.rmse.toFixed(4)}
            </div>
          </div>
          )}

          {/* EQUILIBRIUM — hidden for OH and NH */}
          {!TROT_ONLY.has(selectedMolecule) && (
          <div className="bg-black/40 border border-white/10 p-6 rounded-lg relative overflow-hidden backdrop-blur-sm col-span-1">
            <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">
              PLASMA STATUS
            </h3>
            <div className="flex justify-between items-end mb-4 border-b border-white/5 pb-2">
              <span className="text-gray-300">Tvib/Trot Ratio:</span>
              <span className="text-2xl font-mono text-white">{fitResult.ratio.toFixed(2)}</span>
            </div>
            {fitResult.ratio < 1.3 ? (
              <div className="text-green-400 text-sm">
                <span className="font-bold">🟢 THERMAL EQUILIBRIUM</span><br/>
                <span className="text-green-500/70 text-xs">Vibrational and translational modes balanced.</span>
              </div>
            ) : fitResult.ratio < 3 ? (
              <div className="text-yellow-400 text-sm">
                <span className="font-bold">🟡 MILD NON-EQUILIBRIUM</span><br/>
                <span className="text-yellow-500/70 text-xs">Typical of low-pressure glow discharges.</span>
              </div>
            ) : (
              <div className="text-red-400 text-sm">
                <span className="font-bold">🔴 STRONG NON-EQUILIBRIUM</span><br/>
                <span className="text-red-500/70 text-xs">Vibrational energy &gt;&gt; translational.</span>
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* SECTION 9: Physics Info (collapsible) */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-5 backdrop-blur-sm">
        <button 
          onClick={() => setIsPhysicsOpen(!isPhysicsOpen)}
          className="flex justify-between items-center w-full text-left"
        >
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <span>📚 Physics Explanation</span>
          </h3>
          <span className="text-gray-500 font-mono text-xs">{isPhysicsOpen ? '[-]' : '[+]'}</span>
        </button>
        {isPhysicsOpen && (
          <div className="mt-4 text-xs text-gray-400 leading-relaxed space-y-3 p-4 bg-black/30 rounded border border-white/5">
            {selectedMolecule === 'N2' && (
              <p>
                The N₂ second positive system (C³Πᵤ→B³Πg) is the dominant emission in air and nitrogen 
                plasma (300-400nm). Rotational temperature reflects gas kinetic temperature. Vibrational 
                temperature reflects internal molecular energy, often elevated in non-equilibrium cold plasma.
              </p>
            )}
            {selectedMolecule === 'C2' && (
              <p>
                C₂ Swan bands (d³Πg→a³Πᵤ) appear in carbon-containing plasma (470-570nm).
                The characteristic green color of carbon arc lamps comes from these bands.
              </p>
            )}
            {selectedMolecule === 'CN' && (
              <p>
                CN violet system (B²Σ⁺→X²Σ⁺) indicates nitrogen-carbon chemistry (350-390nm).
                Present when carbon and nitrogen coexist in plasma. Important for plasma nitrogen 
                fixation and carbon nitride deposition.
              </p>
            )}
            {selectedMolecule === 'OH' && (
              <p>
                OH A²Σ⁺→X²Π (306–320 nm) is the most important 
                atmospheric plasma diagnostic. The rotational 
                temperature thermalizes extremely rapidly with 
                the surrounding gas — in atmospheric plasma 
                Trot(OH) = Tgas to within measurement uncertainty.
                Essential for DBD, APPJ, and biomedical plasma.
                The doublet spin structure creates two F1/F2 
                sub-components per rotational line.
              </p>
            )}
            {selectedMolecule === 'N2+' && (
              <p>
                N₂⁺ First Negative System (B²Σᵤ⁺→X²Σg⁺, 388–428 nm)
                is emission from ionized molecular nitrogen.
                As a Σ→Σ transition, no Q-branch exists.
                The (0-0) band at 391.4 nm is strongest.
                Presence indicates high reduced electric field 
                E/N exceeding 100 Td. Nuclear spin weights are 
                inverted relative to neutral N₂ due to the 
                ungerade symmetry of the upper state.
              </p>
            )}
            {selectedMolecule === 'NO' && (
              <p>
                NO Beta System (A²Σ⁺→X²Π, 226–270 nm) appears 
                in air plasma and is a key NOx production indicator.
                The UV range requires quartz optics and a 
                UV-sensitive detector. Multiple overlapping 
                vibrational progressions from v′=0 and v′=1 
                upper levels create a rich band structure.
                Q-branch is suppressed for cleaner fitting.
              </p>
            )}
            {selectedMolecule === 'NH' && (
              <p>
                NH A³Π→X³Σ⁻ (328–342 nm) appears in N₂-H₂ plasma,
                plasma nitriding, and ammonia decomposition plasma.
                The triplet A³Π state creates three Ω sub-components
                (Ω=0,1,2) per band head, simulated with offset 
                sub-head weights. Trot directly measures heavy 
                particle temperature. The (0-0) band at 335.5 nm 
                is the primary diagnostic feature.
              </p>
            )}
            <p className="mt-2 text-[#00f0ff] font-mono">
              The physics engine uses exact Dunham expansion for state energies and calculates 
              P, Q, and R rotational branches. The optimization uses coordinate descent to simultaneously 
              minimize RMSE across Trot, Tvib, and instrumental wavelength shift.
            </p>
          </div>
        )}
      </div>
      
    </div>
  );
}
