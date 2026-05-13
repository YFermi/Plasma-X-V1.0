import React, { useState } from 'react';
import { Search, Loader2, Download, Plus, ChevronDown, CheckSquare, Square, Info, Database, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchNistData, NistSearchParams, NistResponse, NistLine } from '../services/nistApi';
import { SpectralLine } from '../data/nist_samples';
import { motion, AnimatePresence } from 'framer-motion';

const ELEMENT_SYMBOLS = [
  "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca",
  "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr", "Rb", "Sr", "Y", "Zr",
  "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe", "Cs", "Ba", "La", "Ce", "Pr", "Nd",
  "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg",
  "Tl", "Pb", "Bi", "Po", "At", "Rn", "Fr", "Ra", "Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm",
  "Md", "No", "Lr", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og"
];

const ELEMENT_NAMES = [
  "Hydrogen", "Helium", "Lithium", "Beryllium", "Boron", "Carbon", "Nitrogen", "Oxygen", "Fluorine", "Neon",
  "Sodium", "Magnesium", "Aluminum", "Silicon", "Phosphorus", "Sulfur", "Chlorine", "Argon", "Potassium", "Calcium",
  "Scandium", "Titanium", "Vanadium", "Chromium", "Manganese", "Iron", "Cobalt", "Nickel", "Copper", "Zinc",
  "Gallium", "Germanium", "Arsenic", "Selenium", "Bromine", "Krypton", "Rubidium", "Strontium", "Yttrium", "Zirconium",
  "Niobium", "Molybdenum", "Technetium", "Ruthenium", "Rhodium", "Palladium", "Silver", "Cadmium", "Indium", "Tin",
  "Antimony", "Tellurium", "Iodine", "Xenon", "Cesium", "Barium", "Lanthanum", "Cerium", "Praseodymium", "Neodymium",
  "Promethium", "Samarium", "Europium", "Gadolinium", "Terbium", "Dysprosium", "Holmium", "Erbium", "Thulium", "Ytterbium",
  "Lutetium", "Hafnium", "Tantalum", "Tungsten", "Rhenium", "Osmium", "Iridium", "Platinum", "Gold", "Mercury",
  "Thallium", "Lead", "Bismuth", "Polonium", "Astatine", "Radon", "Francium", "Radium", "Actinium", "Thorium",
  "Protactinium", "Uranium", "Neptunium", "Plutonium", "Americium", "Curium", "Berkelium", "Californium", "Einsteinium", "Fermium",
  "Mendelevium", "Nobelium", "Lawrencium", "Rutherfordium", "Dubnium", "Seaborgium", "Bohrium", "Hassium", "Meitnerium", "Darmstadtium",
  "Roentgenium", "Copernicium", "Nihonium", "Flerovium", "Moscovium", "Livermorium", "Tennessine", "Oganesson"
];

const ELEMENTS = ELEMENT_SYMBOLS.map((sym, i) => ({ symbol: sym, name: ELEMENT_NAMES[i] }));

const PRESETS = [
  { label: 'Balmer series (H)', params: { element: 'H', ion: 'I', wavelengthMin: 380, wavelengthMax: 700 } },
  { label: 'Ar I — Common visible lines', params: { element: 'Ar', ion: 'I', wavelengthMin: 400, wavelengthMax: 800 } },
  { label: 'Ar II — ICP reference lines', params: { element: 'Ar', ion: 'II', wavelengthMin: 200, wavelengthMax: 500 } },
  { label: 'Fe I — LIBS standard lines', params: { element: 'Fe', ion: 'I', wavelengthMin: 200, wavelengthMax: 400 } },
  { label: 'C II — Fusion edge lines', params: { element: 'C', ion: 'II', wavelengthMin: 400, wavelengthMax: 700 } },
  { label: 'O I — 777nm triplet', params: { element: 'O', ion: 'I', wavelengthMin: 770, wavelengthMax: 780 } }
];

export function NistSearch({ onAddLines }: { onAddLines: (lines: SpectralLine[]) => void }) {
  const [element, setElement] = useState('Fe');
  const [ion, setIon] = useState('All');
  const [wavelengthMin, setWavelengthMin] = useState<string>('400');
  const [wavelengthMax, setWavelengthMax] = useState<string>('450');
  const [accuracy, setAccuracy] = useState('Any');
  const [maxLines, setMaxLines] = useState('100');
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NistResponse | null>(null);
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const handleSearch = async () => {
    setLoading(true);
    setResults(null);
    setSelectedLines(new Set());
    setExpandedRows(new Set());

    const wMin = parseFloat(wavelengthMin);
    const wMax = parseFloat(wavelengthMax);

    const data = await fetchNistData({
      element,
      ion: ion === 'All' ? undefined : ion,
      wavelengthMin: isNaN(wMin) ? undefined : wMin,
      wavelengthMax: isNaN(wMax) ? undefined : wMax,
      maxLines: parseInt(maxLines),
      minAccuracy: accuracy !== 'Any' ? (accuracy as any) : undefined
    });

    setResults(data);
    setLoading(false);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setElement(preset.params.element);
    setIon(preset.params.ion || 'All');
    setWavelengthMin(preset.params.wavelengthMin?.toString() || '');
    setWavelengthMax(preset.params.wavelengthMax?.toString() || '');
    handleSearch();
  };

  const toggleRowSelect = (index: number) => {
    const newSelected = new Set(selectedLines);
    if (newSelected.has(index)) newSelected.delete(index);
    else newSelected.add(index);
    setSelectedLines(newSelected);
  };

  const toggleAll = () => {
    if (!results) return;
    if (selectedLines.size === results.lines.length) {
      setSelectedLines(new Set());
    } else {
      setSelectedLines(new Set(results.lines.map((_, i) => i)));
    }
  };

  const toggleRowExpand = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) newExpanded.delete(index);
    else newExpanded.add(index);
    setExpandedRows(newExpanded);
  };

  const formatAki = (aki: number | null) => {
    if (aki == null) return "—";
    return aki.toExponential(2);
  };

  const handleAddSelectedToBoltzmann = () => {
    if (!results) return;
    const linesToAdd: SpectralLine[] = [];
    selectedLines.forEach(index => {
      const l = results.lines[index];
      linesToAdd.push({
        id: `nist-${l.element}-${l.ion}-${l.wavelength}-${index}`,
        element: l.element,
        ion: l.ion,
        wavelength: l.wavelength,
        aki: l.aki || 0,
        gk: l.gk || 0,
        gi: l.gi || 0,
        energyLow: l.energyLow || 0,
        energyHigh: l.energyHigh || 0,
        accuracy: l.accuracy,
        source: `NIST (${results.source})`
      });
    });
    onAddLines(linesToAdd);
    setSelectedLines(new Set());
  };

  const handleExportCSV = () => {
    if (!results) return;
    
    const headers = ['Wavelength (nm)', 'Element', 'Ion', 'Aki (s-1)', 'gk', 'gi', 'E_low (cm-1)', 'E_high (cm-1)', 'Accuracy'];
    const rows = results.lines.map(l => [
      l.wavelength, l.element, l.ion, l.aki || '', l.gk || '', l.gi || '', l.energyLow || '', l.energyHigh || '', l.accuracy
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nist_${element}_${ion}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-slate-300 font-sans p-6 gap-6">
      <div className="flex-none p-6 bg-slate-900 border border-white/10 rounded-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-plasma-cyan/5 to-plasma-magenta/5" />
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-plasma-cyan/10 rounded-lg border border-plasma-cyan/20">
              <Database className="w-6 h-6 text-plasma-cyan" />
            </div>
            <h2 className="text-xl font-display font-bold tracking-widest text-white uppercase">
              NIST Atomic Spectra Database — Live Search
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Element</label>
              <select 
                value={element}
                onChange={(e) => setElement(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-plasma-cyan/50"
              >
                {ELEMENTS.map(el => (
                  <option key={el.symbol} value={el.symbol}>{el.symbol} — {el.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Ion</label>
              <select 
                value={ion}
                onChange={(e) => setIon(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-plasma-cyan/50"
              >
                {['All', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII+'].map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex justify-between">
                <span>Wavelength Range (nm)</span>
                <span className="text-plasma-cyan/50">Min / Max</span>
              </label>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  value={wavelengthMin}
                  onChange={(e) => setWavelengthMin(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-plasma-cyan/50"
                  placeholder="Min nm"
                />
                <div className="text-slate-600 self-center">—</div>
                <input 
                  type="text" 
                  value={wavelengthMax}
                  onChange={(e) => setWavelengthMax(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-plasma-cyan/50"
                  placeholder="Max nm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Min Accuracy</label>
              <select 
                value={accuracy}
                onChange={(e) => setAccuracy(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-plasma-cyan/50"
              >
                {['Any', 'AAA', 'AA', 'A', 'B', 'C', 'D'].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Max Lines</label>
              <select 
                value={maxLines}
                onChange={(e) => setMaxLines(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-plasma-cyan/50"
              >
                {['50', '100', '250', '500', '1000', '2500', '5000'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            
            <div className="col-span-2 flex items-end gap-4">
              <button 
                onClick={handleSearch}
                disabled={loading}
                className="flex-1 bg-plasma-cyan text-black font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-[#00e5ff] transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? 'QUERYING NIST DATABASE...' : 'SEARCH NIST'}
              </button>
              
              <div className="relative group">
                <button className="h-full bg-white/5 border border-white/10 rounded-lg px-4 flex items-center gap-2 text-sm hover:bg-white/10 transition-colors">
                  <span className="whitespace-nowrap">📋 Quick Presets</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  {PRESETS.map((preset, i) => (
                    <button 
                      key={i}
                      onClick={() => applyPreset(preset)}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm transition-colors border-b border-white/5 last:border-0"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase">
            <Info className="w-3.5 h-3.5" />
            Data Source: NIST Live | Global Cache | Local Bundle
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[400px] flex flex-col bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-plasma-cyan gap-6">
            <div className="relative">
              <div className="w-16 h-16 border-2 border-plasma-cyan rounded-full animate-ping absolute inset-0 opacity-20" />
              <Loader2 className="w-16 h-16 animate-spin" />
            </div>
            <div className="font-mono uppercase tracking-widest animate-pulse">Querying NIST Database...</div>
          </div>
        ) : !results ? (
          <div className="flex-1 flex items-center justify-center text-slate-600 font-mono text-sm uppercase tracking-widest text-center px-10">
            Configure parameters and click Search NIST<br/>to retrieve atomic spectra data
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-none p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div>
                <h3 className="font-display text-white tracking-widest uppercase">
                  Results: {results.count} lines found
                </h3>
                <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2 mt-1">
                  Source: 
                  <span className={cn(
                    "px-1.5 py-0.5 rounded",
                    results.source === 'nist-live' ? 'bg-[#00ff88]/20 text-[#00ff88]' :
                    results.source === 'local-cache' ? 'bg-[#ffcc00]/20 text-[#ffcc00]' :
                    'bg-[#ff3333]/20 text-[#ff3333]'
                  )}>
                    {results.source.toUpperCase()}
                  </span>
                  {results.warning && (
                    <span className="flex items-center gap-1 text-[#ffcc00] ml-2">
                       <AlertTriangle className="w-3 h-3" /> {results.warning}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleAddSelectedToBoltzmann}
                  disabled={selectedLines.size === 0}
                  className="bg-plasma-magenta/20 text-plasma-magenta hover:bg-plasma-magenta/30 border border-plasma-magenta/30 px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold uppercase transition-colors disabled:opacity-30 disabled:hover:bg-plasma-magenta/20"
                >
                  <Plus className="w-3.5 h-3.5" /> 
                  Add to Boltzmann ({selectedLines.size})
                </button>
                <button 
                  onClick={handleExportCSV}
                  className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold uppercase transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> 
                  Export CSV
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-900 border-b border-white/10 z-10 text-[10px] font-mono uppercase tracking-widest text-slate-500 shadow-xl">
                  <tr>
                    <th className="p-3 w-12 text-center">
                      <button onClick={toggleAll} className="hover:text-white transition-colors">
                        {selectedLines.size === results.lines.length && results.lines.length > 0 ? 
                          <CheckSquare className="w-4 h-4 text-plasma-cyan" /> : 
                          <Square className="w-4 h-4" />
                        }
                      </button>
                    </th>
                    <th className="p-3 font-medium">Wavelength (nm)</th>
                    <th className="p-3 font-medium">Element</th>
                    <th className="p-3 font-medium">Ion</th>
                    <th className="p-3 font-medium">Aki (s⁻¹)</th>
                    <th className="p-3 font-medium">gk</th>
                    <th className="p-3 font-medium">gi</th>
                    <th className="p-3 font-medium">Acc</th>
                    <th className="p-3 font-medium">Terms (Low-High)</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-mono divide-y divide-white/5">
                  {results.lines.map((line, i) => {
                    const isSelected = selectedLines.has(i);
                    const isExpanded = expandedRows.has(i);
                    
                    return (
                      <React.Fragment key={i}>
                        <tr 
                          onClick={() => toggleRowExpand(i)}
                          className={cn(
                            "cursor-pointer transition-colors group relative",
                            isSelected ? "bg-plasma-cyan/5" : "hover:bg-white/5",
                            isExpanded && "bg-white/5 border-l-2 border-l-plasma-cyan"
                          )}
                        >
                          <td className="p-3 text-center" onClick={(e) => { e.stopPropagation(); toggleRowSelect(i); }}>
                            <button className="hover:text-plasma-cyan transition-colors">
                              {isSelected ? 
                                <CheckSquare className="w-4 h-4 text-plasma-cyan" /> : 
                                <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                              }
                            </button>
                          </td>
                          <td className="p-3 text-plasma-cyan font-bold">{line.wavelength.toFixed(4)}</td>
                          <td className="p-3">{line.element}</td>
                          <td className="p-3">{line.ion}</td>
                          <td className="p-3 text-plasma-magenta leading-none">{formatAki(line.aki)}</td>
                          <td className="p-3 text-slate-400">{line.gk ?? '—'}</td>
                          <td className="p-3 text-slate-400">{line.gi ?? '—'}</td>
                          <td className="p-3 text-[#ffcc00]">{line.accuracy || '—'}</td>
                          <td className="p-3 text-slate-400">{line.termLow} — {line.termHigh}</td>
                        </tr>
                        
                        {isExpanded && (
                          <tr className="bg-black/20 border-b border-black">
                            <td colSpan={9} className="p-4 pl-16">
                              <div className="grid grid-cols-4 gap-6 text-xs text-slate-400">
                                <div className="space-y-1">
                                  <div className="text-[10px] text-slate-600 uppercase tracking-widest">Energy Levels (cm⁻¹)</div>
                                  <div><span className="text-white">Low:</span> {line.energyLow ?? 'Unknown'}</div>
                                  <div><span className="text-white">High:</span> {line.energyHigh ?? 'Unknown'}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[10px] text-slate-600 uppercase tracking-widest">Configurations</div>
                                  <div><span className="text-white">Low:</span> {line.confLow || '—'}</div>
                                  <div><span className="text-white">High:</span> {line.confHigh || '—'}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[10px] text-slate-600 uppercase tracking-widest">J Values (Angular Mom.)</div>
                                  <div><span className="text-white">Low:</span> {line.jLow || '—'}</div>
                                  <div><span className="text-white">High:</span> {line.jHigh || '—'}</div>
                                </div>
                                <div className="flex flex-col items-end justify-center">
                                  <button 
                                    onClick={() => {
                                      const newSel = new Set(selectedLines);
                                      newSel.add(i);
                                      setSelectedLines(newSel);
                                    }}
                                    className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-colors"
                                  >
                                    Select Line
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              {results.lines.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-mono text-sm">
                  No spectral lines found matching these criteria.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
