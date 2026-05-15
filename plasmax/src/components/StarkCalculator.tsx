import React, { useState, useEffect, useMemo } from 'react';
import {
  STARK_DATABASE,
  StarkEntry,
  calculateDopplerFWHM,
  calculateStarkFWHM,
  calculateNe,
  formatNe
} from '../data/stark_database';

interface SavedMeasurement {
  id: string;
  line_name: string;
  measured_fwhm: number;
  inst_fwhm: number;
  T_gas: number;
  ne: number | null;
  uncertainty: number;
}

export default function StarkCalculator() {
  const [selectedEntry, setSelectedEntry] = useState<StarkEntry | null>(STARK_DATABASE[0]);
  
  // SECTION 4 Inputs with 300ms debounce
  const [totalFWHMInput, setTotalFWHMInput] = useState<string>("0.2");
  const [instFWHMInput, setInstFWHMInput] = useState<string>("0.02");
  const [tGasInput, setTGasInput] = useState<string>("300");
  const [atomicMassInput, setAtomicMassInput] = useState<string>("1.008");

  const [debouncedInputs, setDebouncedInputs] = useState({
    total: "0.2",
    inst: "0.02",
    tGas: "300",
    mass: "1.008"
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedInputs({
        total: totalFWHMInput,
        inst: instFWHMInput,
        tGas: tGasInput,
        mass: atomicMassInput
      });
    }, 300);
    return () => clearTimeout(t);
  }, [totalFWHMInput, instFWHMInput, tGasInput, atomicMassInput]);

  useEffect(() => {
    if (selectedEntry) {
      setAtomicMassInput(selectedEntry.atomic_mass_amu.toString());
    }
  }, [selectedEntry]);

  const [savedMeasurements, setSavedMeasurements] = useState<SavedMeasurement[]>([]);

  const numTotalFWHM = parseFloat(debouncedInputs.total);
  const numInstFWHM = parseFloat(debouncedInputs.inst);
  const numTGas = parseFloat(debouncedInputs.tGas);
  const numAtomicMass = parseFloat(debouncedInputs.mass);

  const W_doppler = useMemo(() => {
    if (!selectedEntry || isNaN(numTGas) || isNaN(numAtomicMass) || numTGas <= 0 || numAtomicMass <= 0) return 0;
    return calculateDopplerFWHM(selectedEntry.wavelength_nm, numTGas, numAtomicMass);
  }, [selectedEntry, numTGas, numAtomicMass]);

  const W_stark = useMemo(() => {
    if (isNaN(numTotalFWHM) || isNaN(numInstFWHM) || isNaN(W_doppler)) return null;
    return calculateStarkFWHM(numTotalFWHM, numInstFWHM, W_doppler);
  }, [numTotalFWHM, numInstFWHM, W_doppler]);

  const neResult = useMemo(() => {
    if (!selectedEntry || W_stark === null || W_stark <= 0) return null;
    return calculateNe(selectedEntry, W_stark);
  }, [selectedEntry, W_stark]);

  const starkDopplerRatio = useMemo(() => {
    if (W_stark === null || W_doppler === 0) return 0;
    return W_stark / W_doppler;
  }, [W_stark, W_doppler]);

  const addMeasurement = () => {
    if (!selectedEntry || !neResult) return;
    const newMeasurement: SavedMeasurement = {
      id: Math.random().toString(36).substring(7),
      line_name: selectedEntry.line_name,
      measured_fwhm: numTotalFWHM,
      inst_fwhm: numInstFWHM,
      T_gas: numTGas,
      ne: neResult.ne_cm3,
      uncertainty: selectedEntry.uncertainty_percent
    };
    setSavedMeasurements([...savedMeasurements, newMeasurement]);
  };

  const removeMeasurement = (id: string) => {
    setSavedMeasurements(savedMeasurements.filter(m => m.id !== id));
  };

  return (
    <div className="w-full h-full p-4 md:p-6 text-gray-200 bg-[#0a0a0f] overflow-y-auto font-sans rounded-xl border border-white/10">
      {/* SECTION 1: Header */}
      <header className="mb-8 border-b border-white/10 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#00f0ff] mb-2 drop-shadow-[0_0_15px_rgba(0,240,255,0.3)]">
          ⚡ STARK BROADENING — nₑ CALCULATOR
        </h1>
        <p className="text-gray-400 text-lg">Calculate electron density from line width</p>
      </header>

      {/* SECTION 2: Quick select buttons */}
      <div className="mb-8 bg-white/5 border border-white/10 p-5 rounded-lg backdrop-blur-sm">
        <h2 className="text-sm font-bold mb-4 text-white uppercase tracking-wider text-[#00f0ff]">Select Spectral Line</h2>
        <div className="flex flex-wrap gap-2">
          {STARK_DATABASE.map(entry => (
            <button
              key={entry.line_name}
              onClick={() => setSelectedEntry(entry)}
              className={`px-4 py-2 rounded text-sm font-bold transition-all border ${
                selectedEntry?.line_name === entry.line_name 
                  ? 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.3)]' 
                  : 'bg-black/50 border-white/10 hover:bg-white/10 text-gray-400'
              }`}
            >
              {entry.line_name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          
          {/* SECTION 3: Selected line info card */}
          {selectedEntry && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-sm shadow-xl">
              <h3 className="text-sm font-bold text-[#00f0ff] mb-4 uppercase tracking-widest border-b border-white/5 pb-2">Line Information</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 text-sm">
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-1">Line & Wavelength</p>
                  <p className="font-mono text-white text-base">{selectedEntry.line_name} <span className="text-[#00f0ff]">({selectedEntry.wavelength_nm} nm)</span></p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-1">Ref Stark Width</p>
                  <p className="font-mono text-white">{selectedEntry.stark_w_nm} nm @ {formatNe(selectedEntry.ref_ne_cm3)}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-1">Scaling & Error</p>
                  <p className="font-mono capitalize text-white">{selectedEntry.scaling} (±{selectedEntry.uncertainty_percent}%)</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-1">Reliable Range</p>
                  <p className="font-mono text-white text-xs">{formatNe(selectedEntry.ne_min_cm3)} to {formatNe(selectedEntry.ne_max_cm3)}</p>
                </div>
                <div className="col-span-2 bg-black/30 p-3 rounded border border-white/5">
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-1">Reference</p>
                  <p className="text-sm text-gray-300 italic">{selectedEntry.reference}</p>
                  <p className="text-xs text-gray-400 mt-2">{selectedEntry.notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: Input fields */}
          <div className="bg-[#00f0ff]/5 border border-[#00f0ff]/20 rounded-lg p-6 backdrop-blur-sm shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f0ff]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <h3 className="text-sm font-bold text-[#00f0ff] mb-4 uppercase tracking-widest">Measured Parameters</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Total FWHM (nm)</label>
                <input 
                  type="number" step="0.001" 
                  value={totalFWHMInput} onChange={e => setTotalFWHMInput(e.target.value)} 
                  className="w-full bg-black/60 border border-[#00f0ff]/30 focus:border-[#00f0ff] rounded-md px-3 py-2 text-[#00f0ff] font-mono text-lg shadow-inner outline-none transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Instrumental FWHM (nm)</label>
                <input 
                  type="number" step="0.001" 
                  value={instFWHMInput} onChange={e => setInstFWHMInput(e.target.value)} 
                  className="w-full bg-black/60 border border-white/10 rounded-md px-3 py-2 text-white font-mono outline-none focus:border-white/30 transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Gas Temp (K)</label>
                <input 
                  type="number" step="1" 
                  value={tGasInput} onChange={e => setTGasInput(e.target.value)} 
                  className="w-full bg-black/60 border border-white/10 rounded-md px-3 py-2 text-white font-mono outline-none focus:border-white/30 transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Atomic Mass (amu)</label>
                <input 
                  type="number" step="0.001" 
                  value={atomicMassInput} onChange={e => setAtomicMassInput(e.target.value)} 
                  className="w-full bg-black/60 border border-white/10 rounded-md px-3 py-2 text-white font-mono outline-none focus:border-white/30 transition-colors" 
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 space-y-3 font-mono text-sm bg-black/40 -mx-6 -mb-6 px-6 py-6 mt-6">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded">
                <span className="text-gray-400">→ Doppler FWHM:</span>
                <span className="text-yellow-400 font-bold text-base">{W_doppler.toFixed(5)} nm</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-3 rounded">
                <span className="text-gray-400">→ Stark FWHM:</span>
                {W_stark === null ? (
                  <span className="text-red-400 font-bold uppercase text-xs">Reduce total or instrumental FWHM</span>
                ) : (
                  <span className="text-[#00f0ff] font-bold text-base">{W_stark.toFixed(5)} nm</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8 flex flex-col">
          
          {/* SECTION 5: Result card */}
          <div className={`flex-1 border-2 rounded-lg backdrop-blur-sm shadow-2xl overflow-hidden transition-colors ${
              !neResult ? 'border-white/10 bg-white/5' : 
              neResult.reliable ? 'border-green-500/50 bg-gradient-to-b from-green-500/10 to-transparent' : 
              'border-red-500/50 bg-gradient-to-b from-red-500/10 to-transparent'
            }`}>
            <div className="p-8 h-full flex flex-col justify-center">
              <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-widest text-center opacity-80">Final Density Result</h3>
              {W_stark === null ? (
                <div className="text-red-400 py-12 text-center text-xl font-medium border border-red-500/20 bg-red-500/5 rounded-lg mt-4">
                  Stark width invalid.<br/>
                  <span className="text-sm opacity-70 mt-2 block">Check: Total² - Instrumental² - Doppler² &gt; 0</span>
                </div>
              ) : !neResult ? (
                <div className="text-gray-400 py-12 text-center animate-pulse tracking-widest font-mono">
                  COMPUTING...
                </div>
              ) : (
                <div className="py-4 flex-1 flex flex-col justify-center">
                  <div 
                    className="text-5xl lg:text-6xl font-mono text-center font-bold text-white mb-2 tracking-tight" 
                    style={{ textShadow: `0 0 30px ${neResult.reliable ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)"}` }}
                  >
                    {formatNe(neResult.ne_cm3)}
                  </div>
                  <div className="text-center font-mono text-[#00f0ff] font-bold mb-4 opacity-80">cm⁻³</div>
                  
                  <p className="text-center text-sm font-mono mb-6 bg-black/40 inline-flex mx-auto px-4 py-2 rounded-full border border-white/5 text-gray-300">
                    Range: [{formatNe(neResult.ne_min)}, {formatNe(neResult.ne_max)}]
                  </p>
                  
                  {neResult.warning && (
                    <div className="text-red-400/90 text-sm font-bold text-center mb-6 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center justify-center gap-2">
                      <span className="text-xl">⚠️</span> <span>{neResult.warning}</span>
                    </div>
                  )}
                  
                  <div className="text-[11px] text-gray-500 font-mono p-5 bg-black/60 rounded-lg mt-auto border border-white/5">
                    <p className="mb-3 uppercase text-gray-400 font-bold tracking-widest border-b border-white/10 pb-2">Calculation Breakdown</p>
                    <p className="mb-1 text-gray-400">Total² - Instrumental² - Doppler² = Stark²</p>
                    <p className="mb-4 text-white opacity-90">({numTotalFWHM.toFixed(4)})² - ({numInstFWHM.toFixed(4)})² - ({W_doppler.toFixed(4)})² = {W_stark.toFixed(4)}²</p>
                    {selectedEntry?.scaling === "gigosos" ? (
                      <>
                        <p className="mb-1 text-gray-400">nₑ = ref_ne_cm3 × (W_Stark / stark_w_nm)^(1/0.668)</p>
                        <p className="text-white opacity-90">nₑ = {formatNe(selectedEntry.ref_ne_cm3)} × ({W_stark.toFixed(4)} / {selectedEntry.stark_w_nm})^(1.497)</p>
                      </>
                    ) : (
                      <>
                        <p className="mb-1 text-gray-400">nₑ = ref_ne_cm3 × (W_Stark / stark_w_nm)</p>
                        <p className="text-white opacity-90">nₑ = {formatNe(selectedEntry?.ref_ne_cm3 || 0)} × ({W_stark.toFixed(4)} / {selectedEntry?.stark_w_nm || 1})</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 6: Density context bar */}
          {neResult && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-sm relative">
              <h3 className="text-xs font-bold text-gray-400 mb-8 uppercase tracking-widest">Density Context Range</h3>
              <div className="relative h-3 bg-gradient-to-r from-blue-900 via-purple-900 to-red-900 rounded-full">
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-8 bg-white rounded shadow-[0_0_15px_white] z-10 transition-all duration-700 ease-out" 
                  style={{ 
                    left: `${Math.max(0, Math.min(100, (Math.log10(neResult.ne_cm3) - 8) / (20 - 8) * 100))}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-white text-xs font-bold w-max bg-black/80 px-2 py-1 rounded">▲ LOG(nₑ)</div>
                </div>
                {/* scale markers */}
                <div className="absolute top-6 left-0 text-xs text-gray-500 font-mono">10⁸</div>
                <div className="absolute top-6 left-1/4 -translate-x-1/2 text-xs text-gray-500 font-mono">10¹¹</div>
                <div className="absolute top-6 left-2/4 -translate-x-1/2 text-xs text-gray-500 font-mono">10¹⁴</div>
                <div className="absolute top-6 left-3/4 -translate-x-1/2 text-xs text-gray-500 font-mono">10¹⁷</div>
                <div className="absolute top-6 right-0 text-xs text-gray-500 font-mono">10²⁰</div>
              </div>
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-gray-500 px-1 mt-10">
                <span>Glow/RF</span>
                <span className="text-center">Microwave/Arc</span>
                <span className="text-right">Laser/Fusion</span>
              </div>
            </div>
          )}

          {/* SECTION 7: Feasibility indicator */}
          {neResult && (
            <div className="bg-black/30 border border-white/5 rounded-lg p-5 backdrop-blur-sm shadow-inner flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">Feasibility Ratio</h3>
                <div className="text-sm font-mono text-gray-300">W_Stark / W_Doppler = <span className="text-white font-bold">{starkDopplerRatio.toFixed(3)}</span></div>
              </div>
              <div className="ml-4">
                {starkDopplerRatio > 5 ? (
                  <span className="bg-green-500/20 text-green-400 px-4 py-2 rounded-md text-sm font-bold tracking-wider border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]">✅ EXCELLENT</span>
                ) : starkDopplerRatio >= 2 ? (
                  <span className="bg-green-400/20 text-green-300 px-4 py-2 rounded-md text-sm font-bold tracking-wider border border-green-400/30">🟢 GOOD</span>
                ) : starkDopplerRatio >= 1 ? (
                  <span className="bg-yellow-500/20 text-yellow-500 px-4 py-2 rounded-md text-sm font-bold tracking-wider border border-yellow-500/30">🟡 USE WITH CARE</span>
                ) : (
                  <span className="bg-red-500/20 text-red-500 px-4 py-2 rounded-md text-sm font-bold tracking-wider border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">🔴 NOT FEASIBLE</span>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* SECTION 8: Multi-line table */}
      <div className="mt-8 bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Multi-Line Consistency Check</h3>
            <p className="text-xs text-gray-400 mt-1">Cross-check multiple lines to verify density convergence.</p>
          </div>
          <button 
            onClick={addMeasurement}
            disabled={!neResult}
            className="flex-shrink-0 bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 px-5 py-2.5 rounded-md transition-all text-sm font-bold shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            + Add to Table
          </button>
        </div>
        
        {savedMeasurements.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-lg bg-black/20 text-gray-500 text-sm font-medium">
            No lines added yet.<br/> <span className="opacity-70 mt-1 block tracking-wider uppercase text-[10px]">Add current calculation to compare</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10 max-w-full">
            <table className="w-full text-left text-sm whitespace-nowrap bg-black/30">
              <thead className="bg-[#00f0ff]/10 text-white border-b border-[#00f0ff]/20">
                <tr>
                  <th className="px-5 py-4 font-bold tracking-wider uppercase text-xs">Line</th>
                  <th className="px-5 py-4 font-bold tracking-wider uppercase text-xs">W_total (nm)</th>
                  <th className="px-5 py-4 font-bold tracking-wider uppercase text-xs">nₑ (cm⁻³)</th>
                  <th className="px-5 py-4 font-bold tracking-wider uppercase text-xs">Uncertainty</th>
                  <th className="px-5 py-4 font-bold tracking-wider uppercase text-xs text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-200">
                {savedMeasurements.map(m => (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4 font-bold text-[#00f0ff] bg-white/[0.02]">{m.line_name}</td>
                    <td className="px-5 py-4 font-mono">{m.measured_fwhm.toFixed(3)}</td>
                    <td className="px-5 py-4 font-mono font-medium">
                      {m.ne ? formatNe(m.ne) : <span className="text-red-400">Invalid</span>}
                    </td>
                    <td className="px-5 py-4 font-mono text-gray-400">± {m.uncertainty}%</td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => removeMeasurement(m.id)} className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-widest px-3 py-1 bg-red-500/10 rounded border border-red-500/20 transition-colors">Remove</button>
                    </td>
                  </tr>
                ))}
                
                {/* Average calculation row */}
                {savedMeasurements.filter(m => m.ne !== null).length > 0 && (
                  <tr className="bg-[#00f0ff]/5 border-t-2 border-[#00f0ff]/20">
                    <td colSpan={2} className="px-5 py-5 text-right font-bold uppercase tracking-widest text-[#00f0ff] opacity-80">
                      Mean Density
                    </td>
                    <td className="px-5 py-5 font-mono text-xl font-bold text-[#00f0ff] drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                      {formatNe(
                        savedMeasurements.reduce((acc, m) => acc + (m.ne || 0), 0) / 
                        savedMeasurements.filter(m => m.ne !== null).length
                      )}
                    </td>
                    <td colSpan={2} className="px-5 py-5 font-mono text-xs text-gray-400 tracking-wider">
                      From {savedMeasurements.filter(m => m.ne !== null).length} lines
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
