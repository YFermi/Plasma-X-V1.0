import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  N2_SECOND_POSITIVE_BANDS,
  N2_SPECTROSCOPIC_CONSTANTS,
  C2_SWAN_BANDS,
  C2_SPECTROSCOPIC_CONSTANTS,
  CN_VIOLET_BANDS,
  CN_SPECTROSCOPIC_CONSTANTS,
  type N2BandHead,
  type C2BandHead,
  type CNBandHead
} from '../data/molecular_constants';
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

type Molecule = 'N2' | 'C2' | 'CN';

interface FitResult {
  Trot: number;
  Tvib: number;
  rmse: number;
  ratio: number;
}

interface SpectrumPoint {
  wavelength: number;
  intensity: number;
}

const getWavelengthRange = (molecule: Molecule): [number, number] => {
  switch (molecule) {
    case 'N2': return [296, 400];
    case 'C2': return [470, 570];
    case 'CN': return [350, 395];
  }
};

const getBands = (molecule: Molecule) => {
  switch (molecule) {
    case 'N2': return N2_SECOND_POSITIVE_BANDS;
    case 'C2': return C2_SWAN_BANDS;
    case 'CN': return CN_VIOLET_BANDS;
  }
};

const getConstants = (molecule: Molecule) => {
  switch (molecule) {
    case 'N2': return N2_SPECTROSCOPIC_CONSTANTS;
    case 'C2': return C2_SPECTROSCOPIC_CONSTANTS;
    case 'CN': return CN_SPECTROSCOPIC_CONSTANTS;
  }
};

const generateWavelengthAxis = (range: [number, number], points: number = 500): number[] => {
  const step = (range[1] - range[0]) / (points - 1);
  return Array.from({ length: points }, (_, i) => range[0] + i * step);
};

const generateSyntheticSpectrum = (
  molecule: Molecule,
  Trot: number,
  Tvib: number,
  fwhm: number,
  wavelengths: number[]
): number[] => {
  const kB = 0.695039;
  const spectrum = new Array(wavelengths.length).fill(0);
  const bands = getBands(molecule);
  const constants = getConstants(molecule);
  
  // Rotational structure proxy: FWHM broadens with Trot + Band Intensity modulation
  const Q_rot = kB * Trot / constants.Be_upper;
  const effective_fwhm = fwhm + (Trot * 0.0002);
  const sigma = effective_fwhm / (2 * Math.sqrt(2 * Math.log(2)));
  
  bands.forEach(band => {
    const E_vib = band.v_upper * constants.we_upper;
    const pop_vib = Math.exp(-E_vib / (kB * Tvib));
    const band_intensity = (band.FCF * pop_vib) / Q_rot;
    
    wavelengths.forEach((wl, i) => {
      const delta = wl - band.wavelength_nm;
      // Rotational bands shade to one side, but using Gaussian as requested
      // We only apply this if delta is somewhat close to avoid long processing
      if (Math.abs(delta) < 15) {
        spectrum[i] += band_intensity * 
          Math.exp(-(delta * delta) / (2 * sigma * sigma));
      }
    });
  });
  
  const maxVal = Math.max(...spectrum);
  return maxVal > 0 
    ? spectrum.map(v => v / maxVal) 
    : spectrum;
};

const calculateRMSE = (exp: number[], syn: number[]): number => {
  let sumsq = 0;
  for(let i = 0; i < exp.length; i++) {
    sumsq += Math.pow(exp[i] - syn[i], 2);
  }
  return Math.sqrt(sumsq / exp.length);
};

const parseCSV = (text: string): SpectrumPoint[] => {
  const lines = text.split('\n');
  const points: SpectrumPoint[] = [];
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
  return points.sort((a,b) => a.wavelength - b.wavelength);
};

const normalizeArray = (arr: number[]): number[] => {
  const maxVal = Math.max(...arr);
  return maxVal > 0 ? arr.map(v => v / maxVal) : arr;
};

export default function MolecularFitting() {
  const [selectedMolecule, setSelectedMolecule] = useState<Molecule>('N2');
  const [experimentalSpectrum, setExperimentalSpectrum] = useState<SpectrumPoint[] | null>(null);
  const [syntheticSpectrum, setSyntheticSpectrum] = useState<SpectrumPoint[] | null>(null);
  const [fitResult, setFitResult] = useState<FitResult | null>(null);
  const [isFitting, setIsFitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fwhmNm, setFwhmNm] = useState(0.5);
  const [useDemo, setUseDemo] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  const generateDemoSpectrum = useCallback((molecule: Molecule): SpectrumPoint[] => {
    let Trot = 500, Tvib = 4000;
    if (molecule === 'C2') { Trot = 3000; Tvib = 6000; }
    else if (molecule === 'CN') { Trot = 1500; Tvib = 5000; }
    
    const range = getWavelengthRange(molecule);
    const wls = generateWavelengthAxis(range, 400); // reduced points for speed
    const synth = generateSyntheticSpectrum(molecule, Trot, Tvib, fwhmNm, wls);
    
    return wls.map((wl, i) => {
      const noise = (Math.random() * 0.04 - 0.02);
      let noisyIntensity = synth[i] + noise;
      if (noisyIntensity < 0) noisyIntensity = 0;
      return { wavelength: wl, intensity: noisyIntensity };
    });
  }, [fwhmNm]);

  const handleDemoClick = () => {
    const demo = generateDemoSpectrum(selectedMolecule);
    setExperimentalSpectrum(demo);
    setSyntheticSpectrum(null);
    setFitResult(null);
    setUseDemo(true);
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
      synInt: syn ? syn[i].intensity : null
    }));
    setChartData(data);
  };
  
  useEffect(() => {
    if (syntheticSpectrum && experimentalSpectrum) {
      updateChart(experimentalSpectrum, syntheticSpectrum);
    }
  }, [syntheticSpectrum, experimentalSpectrum]);

  const runFineSearch = (
    bestTrotCoarse: number,
    bestTvibCoarse: number,
    wavelengths: number[],
    normExp: number[],
    molecule: Molecule,
    fwhm: number,
    onComplete: (res: FitResult) => void
  ) => {
    let bestTrot = bestTrotCoarse;
    let bestTvib = bestTvibCoarse;
    let bestRMSE = Infinity;
    
    for (let Trot = bestTrotCoarse - 200; Trot <= bestTrotCoarse + 200; Trot += 20) {
      if (Trot < 50) continue;
      for (let Tvib = bestTvibCoarse - 500; Tvib <= bestTvibCoarse + 500; Tvib += 50) {
        if (Tvib < 50) continue;
        const synth = generateSyntheticSpectrum(molecule, Trot, Tvib, fwhm, wavelengths);
        const rmse = calculateRMSE(normExp, synth);
        if (rmse < bestRMSE) {
          bestRMSE = rmse;
          bestTrot = Trot;
          bestTvib = Tvib;
        }
      }
    }
    onComplete({
      Trot: bestTrot,
      Tvib: bestTvib,
      rmse: bestRMSE,
      ratio: bestTvib / bestTrot
    });
  };

  const runFit = useCallback(() => {
    if (!experimentalSpectrum) return;
    setIsFitting(true);
    setProgress(0);
    
    const wavelengths = experimentalSpectrum.map(p => p.wavelength);
    const normExp = normalizeArray(experimentalSpectrum.map(p => p.intensity));
    
    let bestTrot = 500;
    let bestTvib = 3000;
    let bestRMSE = Infinity;
    
    const TrotValues = Array.from({length: 24}, (_, i) => 300 + i * 200);
    let trotIndex = 0;
    
    const processChunk = () => {
      if (trotIndex >= TrotValues.length) {
        // Stage 2
        runFineSearch(bestTrot, bestTvib, wavelengths, normExp, selectedMolecule, fwhmNm, (result) => {
          setFitResult(result);
          const synthStr = generateSyntheticSpectrum(
            selectedMolecule, result.Trot, result.Tvib, fwhmNm, wavelengths
          );
          const synthMap = wavelengths.map((wl, i) => ({
            wavelength: wl,
            intensity: synthStr[i]
          }));
          setSyntheticSpectrum(synthMap);
          setIsFitting(false);
          setProgress(100);
        });
        return;
      }
      
      const Trot = TrotValues[trotIndex];
      for (let Tvib = 500; Tvib <= 20000; Tvib += 500) {
        const synth = generateSyntheticSpectrum(selectedMolecule, Trot, Tvib, fwhmNm, wavelengths);
        const rmse = calculateRMSE(normExp, synth);
        if (rmse < bestRMSE) {
          bestRMSE = rmse;
          bestTrot = Trot;
          bestTvib = Tvib;
        }
      }
      
      trotIndex++;
      setProgress((trotIndex / TrotValues.length) * 80);
      requestAnimationFrame(processChunk);
    };
    
    requestAnimationFrame(processChunk);
  }, [experimentalSpectrum, selectedMolecule, fwhmNm]);

  const [isPhysicsOpen, setIsPhysicsOpen] = useState(false);

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

      {/* SECTION 2: Molecule Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { id: 'N2', name: 'N₂', sub: '2nd Positive', range: '300-400 nm', bands: '5 band heads' },
          { id: 'C2', name: 'C₂', sub: 'Swan Bands', range: '470-570 nm', bands: '2 band heads' },
          { id: 'CN', name: 'CN', sub: 'Violet System', range: '350-390 nm', bands: '3 band heads' }
        ].map(mol => (
          <button
            key={mol.id}
            onClick={() => {
              setSelectedMolecule(mol.id as Molecule);
              setExperimentalSpectrum(null);
              setSyntheticSpectrum(null);
              setFitResult(null);
              setChartData([]);
            }}
            className={`p-5 rounded-lg border text-left transition-all duration-300 relative overflow-hidden backdrop-blur-sm ${
              selectedMolecule === mol.id 
                ? 'bg-[#00f0ff]/10 border-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.2)]' 
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            {selectedMolecule === mol.id && (
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#00f0ff]/20 blur-2xl rounded-full mix-blend-screen" />
            )}
            <h3 className={`text-2xl font-bold ${selectedMolecule === mol.id ? 'text-[#00f0ff]' : 'text-white'}`}>
              {mol.name}
            </h3>
            <p className="text-sm text-gray-300 font-medium mb-2">{mol.sub}</p>
            <div className="flex justify-between items-center text-xs font-mono text-gray-500">
              <span>{mol.range}</span>
              <span>{mol.bands}</span>
            </div>
          </button>
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
              step="0.1" 
              min="0.1" 
              value={fwhmNm} 
              onChange={e => setFwhmNm(parseFloat(e.target.value) || 0.5)}
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
            <span>Fitting in progress... Scanning grid</span>
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
      {chartData.length > 0 && (
        <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-4 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="wavelength" 
                stroke="#666" 
                tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }} 
                type="number"
                domain={getWavelengthRange(selectedMolecule)}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ROTATIONAL */}
          <div className="bg-black/40 border border-[#00f0ff]/30 p-6 rounded-lg text-center relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent opacity-50" />
            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center justify-center gap-2">
              🌡️ T_ROTATIONAL
            </h3>
            <div className="text-4xl font-mono font-bold text-[#00f0ff] mb-2">
              {fitResult.Trot.toFixed(0)} <span className="text-lg text-gray-400">K</span>
            </div>
            <div className="text-sm font-mono text-gray-500 mb-4">± 100 K</div>
            <div className="text-xs text-[#00f0ff]/80 bg-[#00f0ff]/10 py-1.5 px-3 rounded inline-block">
              ≈ Gas Temperature
            </div>
          </div>

          {/* VIBRATIONAL */}
          <div className="bg-black/40 border border-[#b400ff]/30 p-6 rounded-lg text-center relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#b400ff] to-transparent opacity-50" />
            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center justify-center gap-2">
              ⚡ T_VIBRATIONAL
            </h3>
            <div className="text-4xl font-mono font-bold text-[#b400ff] mb-2">
              {fitResult.Tvib.toFixed(0)} <span className="text-lg text-gray-400">K</span>
            </div>
            <div className="text-sm font-mono text-gray-500 mb-4">± 250 K</div>
            <div className="text-xs text-[#b400ff]/80 bg-[#b400ff]/10 py-1.5 px-3 rounded inline-block">
              RMSE: {fitResult.rmse.toFixed(4)}
            </div>
          </div>
          
          {/* EQUILIBRIUM */}
          <div className="bg-black/40 border border-white/10 p-6 rounded-lg relative overflow-hidden backdrop-blur-sm">
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
                <span className="text-green-500/70 text-xs">Vibrational & translational modes balanced.</span>
              </div>
            ) : fitResult.ratio < 3 ? (
              <div className="text-yellow-400 text-sm">
                <span className="font-bold">🟡 MILD NON-EQUILIBRIUM</span><br/>
                <span className="text-yellow-500/70 text-xs">Typical of low-pressure glow discharges.</span>
              </div>
            ) : (
              <div className="text-red-400 text-sm">
                <span className="font-bold">🔴 STRONG NON-EQUILIBRIUM</span><br/>
                <span className="text-red-500/70 text-xs">Vibrational energy &gt;&gt; translational (DBD, Cold Plasma)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 8: Band Contribution Table */}
      <div className="bg-black/40 border border-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
        <div className="bg-white/5 p-4 border-b border-white/10">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">BAND CONTRIBUTIONS</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black/50 text-gray-500 font-mono text-xs text-left border-b border-white/5">
                <th className="px-4 py-3">v'→v''</th>
                <th className="px-4 py-3">λ (nm)</th>
                <th className="px-4 py-3">FCF</th>
                <th className="px-4 py-3">Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300 font-mono">
              {getBands(selectedMolecule).map((band, i) => {
                const constants = getConstants(selectedMolecule);
                let contributionStr = "N/A";
                if (fitResult) {
                  const E_vib = band.v_upper * constants.we_upper;
                  const pop_vib = Math.exp(-E_vib / (0.695039 * fitResult.Tvib));
                  const Q_rot = 0.695039 * fitResult.Trot / constants.Be_upper;
                  const intensity = (band.FCF * pop_vib) / Q_rot;
                  
                  // calc total sum for perc
                  let totalInt = 0;
                  getBands(selectedMolecule).forEach(b => {
                    const Ev = b.v_upper * constants.we_upper;
                    const pv = Math.exp(-Ev / (0.695039 * fitResult.Tvib));
                    totalInt += (b.FCF * pv) / Q_rot;
                  });
                  
                  contributionStr = ((intensity / totalInt) * 100).toFixed(1) + "%";
                }
                
                return (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2 text-[#00f0ff]">{band.v_upper}→{band.v_lower}</td>
                    <td className="px-4 py-2">{band.wavelength_nm.toFixed(2)}</td>
                    <td className="px-4 py-2 text-gray-400">{band.FCF.toFixed(3)}</td>
                    <td className="px-4 py-2">{contributionStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
          </div>
        )}
      </div>
      
    </div>
  );
}
