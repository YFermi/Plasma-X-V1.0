import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  Maximize2, 
  Download, 
  Star,
  Plus,
  BarChart2,
  Info,
  TrendingUp,
  Atom
} from 'lucide-react';
import { SAMPLE_DATA, ION_STAGES, SpectralLine } from '../data/nist_samples';
import { searchMolecularBands, MolecularBand } from '../data/expansions/molecular_index'; // MOLECULAR ADDITION
import { cn } from '../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

import { SkeletonLoader } from './LoadingSkeleton';

export function LineSearch({ onAddLine, onAddLines, initialQuery = '' }: { onAddLine?: (line: SpectralLine) => void, onAddLines?: (lines: any[]) => void, initialQuery?: string }) { // FIX-2
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(initialQuery); // FIX-2
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showMolecular, setShowMolecular] = useState(false); // MOLECULAR ADDITION
  const [molecularResults, setMolecularResults] = useState<MolecularBand[]>([]); // MOLECULAR ADDITION
  const [filters, setFilters] = useState({
    ion: 'ALL',
    accuracy: 'ALL',
    unit: 'nm'
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // MOLECULAR ADDITION
  useEffect(() => {
    if (!showMolecular) { setMolecularResults([]); return; } // FIX
    const num = parseFloat(query); // FIX
    const isNum = !isNaN(num) && query.trim() !== ''; // FIX
    if (isNum) { // FIX
      setMolecularResults(searchMolecularBands(num, 1.0)); // FIX
} else if (query.trim() !== '') { // FIX
      const q = query.toLowerCase(); // FIX
      import('../data/expansions/molecular_index').then(m => { // FIX
        setMolecularResults(m.MOLECULAR_DATA.filter(b => b.molecule.toLowerCase().includes(q) || b.system.toLowerCase().includes(q))); // FIX
      }); // FIX
    } else { // FIX
      setMolecularResults([]); // FIX
    } // FIX
  }, [query, showMolecular]); // MOLECULAR ADDITION

  // CSV-UPLOAD
  interface SpectrumResult {
    wavelength: number;
    intensity: number;
    matchedLine?: SpectralLine;
    matchQuality?: 'Excellent' | 'Good' | 'Approximate';
  }
  const [spectrumResults, setSpectrumResults] = useState<SpectrumResult[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { // CSV-UPLOAD
    const file = e.target.files?.[0]; // CSV-UPLOAD
    if (!file) return; // CSV-UPLOAD
    setLoading(true); // CSV-UPLOAD

    const reader = new FileReader(); // CSV-UPLOAD
    reader.onload = (event) => { // CSV-UPLOAD
      const text = event.target?.result as string; // CSV-UPLOAD
      const lines = text.split('\n'); // CSV-UPLOAD
      const results: SpectrumResult[] = []; // CSV-UPLOAD

      lines.forEach(line => { // CSV-UPLOAD
        const trimmed = line.trim(); // CSV-UPLOAD
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return; // CSV-UPLOAD

        const parts = trimmed.split(/[,;\t]+/); // CSV-UPLOAD
        if (parts.length >= 2) { // CSV-UPLOAD
          const wl = parseFloat(parts[0]); // CSV-UPLOAD
          const intens = parseFloat(parts[1]); // CSV-UPLOAD
          if (isNaN(wl) || isNaN(intens)) return; // CSV-UPLOAD

          let closestLine: SpectralLine | undefined; // CSV-UPLOAD
          let minDiff = Infinity; // CSV-UPLOAD
          
          SAMPLE_DATA.forEach(dbLine => { // CSV-UPLOAD
            const diff = Math.abs(dbLine.wavelength - wl); // CSV-UPLOAD
            if (diff <= 0.5 && diff < minDiff) { // CSV-UPLOAD
              minDiff = diff; // CSV-UPLOAD
              closestLine = dbLine; // CSV-UPLOAD
            } // CSV-UPLOAD
          }); // CSV-UPLOAD

          let quality: 'Excellent' | 'Good' | 'Approximate' | undefined; // CSV-UPLOAD
          if (minDiff <= 0.05) quality = 'Excellent'; // CSV-UPLOAD
          else if (minDiff <= 0.2) quality = 'Good'; // CSV-UPLOAD
          else if (minDiff <= 0.5) quality = 'Approximate'; // CSV-UPLOAD

          results.push({ // CSV-UPLOAD
            wavelength: wl, // CSV-UPLOAD
            intensity: intens, // CSV-UPLOAD
            matchedLine: closestLine, // CSV-UPLOAD
            matchQuality: quality // CSV-UPLOAD
          }); // CSV-UPLOAD
        } // CSV-UPLOAD
      }); // CSV-UPLOAD
      setSpectrumResults(results); // CSV-UPLOAD
      setLoading(false); // CSV-UPLOAD
      if (fileInputRef.current) fileInputRef.current.value = ''; // CSV-UPLOAD
    }; // CSV-UPLOAD
    reader.readAsText(file); // CSV-UPLOAD
  }; // CSV-UPLOAD

  const filteredData = useMemo(() => {
    return SAMPLE_DATA.filter(line => {
      const q = query.trim().toLowerCase(); // FIX-1
      if (!q) return filters.ion === 'ALL' || line.ion === filters.ion; // FIX-1
      const num = parseFloat(q); // FIX-1
      const isNum = !isNaN(num); // FIX-1
      const matchWavelength = isNum ? Math.abs(line.wavelength - num) <= 1.0 : false; // FIX-1
      const isShort = q.length <= 2; // FIX-1
      const matchElem = isShort ? line.element.toLowerCase() === q : line.element.toLowerCase().includes(q); // FIX-1
      const matchIonText = isShort ? line.ion.toLowerCase() === q : line.ion.toLowerCase().includes(q); // FIX-1
      const matchText = matchElem || matchIonText; // FIX-1
      const matchQuery = isNum ? matchWavelength : matchText; // FIX-1

      const matchIon = filters.ion === 'ALL' || line.ion === filters.ion;
      return matchQuery && matchIon;
    });
  }, [query, filters]);

  const displayedData = query.trim() === '' ? filteredData.slice(0, 50) : filteredData; // FIX-1

  // Chart data
  const chartData = useMemo(() => {
    return filteredData.map(line => ({
      name: `${line.element} ${line.ion}`,
      wavelength: line.wavelength,
      intensity: line.aki * line.gk, // Relative intensity proxy
    })).sort((a, b) => a.wavelength - b.wavelength);
  }, [filteredData]);

  if (loading) {
    return <div className="space-y-8"><SkeletonLoader type="table" /></div>;
  }

  return (
    <div className="flex flex-col gap-8 h-full pb-12">
      {/* Header & Search */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-display font-black text-white glow-text-cyan tracking-tight uppercase">Spectral Line Search</h2>
            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mt-1">Global NIST Database Extraction Interface</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-wider hover:bg-white/5 transition-all">
              <Download className="w-3.5 h-3.5" /> Export Data
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-plasma-cyan/10 border border-plasma-cyan/30 text-[10px] font-bold text-plasma-cyan uppercase tracking-wider hover:bg-plasma-cyan/20 transition-all">
              <Plus className="w-3.5 h-3.5" /> Save Results
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-plasma-magenta/10 border border-plasma-magenta/30 text-[10px] font-bold text-plasma-magenta uppercase tracking-wider hover:bg-plasma-magenta/20 transition-all"> {/* CSV-UPLOAD */}
              <Download className="w-3.5 h-3.5 rotate-180" /> Upload Spectrum {/* CSV-UPLOAD */}
            </button> {/* CSV-UPLOAD */}
            <input type="file" accept=".csv,.asc" onChange={handleFileUpload} ref={fileInputRef} className="hidden" /> {/* CSV-UPLOAD */}
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-plasma-cyan/30 to-plasma-magenta/30 rounded-2xl blur opacity-30 group-focus-within:opacity-100 transition duration-1000" />
          <div className="relative flex items-center bg-black/60 border border-white/10 rounded-2xl p-2 gap-4">
            <Search className="w-6 h-6 text-plasma-cyan ml-4" />
            <input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter wavelength, element (e.g. Ar), or transition configuration..."
              className="flex-1 bg-transparent border-none text-lg py-4 px-2 focus:ring-0 text-white placeholder:text-slate-700"
            />
            <div className="flex items-center gap-2 pr-4">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Unit:</span>
              <select 
                value={filters.unit}
                onChange={(e) => setFilters(f => ({ ...f, unit: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] font-bold uppercase text-plasma-cyan outline-none"
              >
                <option value="nm">nm</option>
                <option value="A">Å</option>
                <option value="cm-1">cm⁻¹</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <aside className="space-y-6">
          <div className="glass-panel p-6 border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <Filter className="w-4 h-4 text-plasma-cyan" />
              <h3 className="text-xs font-display text-white tracking-widest uppercase">Global Filters</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Ionization Stage</label>
                <div className="grid grid-cols-4 gap-1">
                  {['ALL', ...ION_STAGES].map(stage => (
                    <button 
                      key={stage}
                      onClick={() => setFilters(f => ({ ...f, ion: stage }))}
                      className={cn(
                        "py-1 rounded border text-[10px] font-bold transition-all",
                        filters.ion === stage 
                          ? "bg-plasma-cyan/20 border-plasma-cyan/50 text-plasma-cyan" 
                          : "bg-white/5 border-white/5 text-slate-500 hover:text-white"
                      )}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Min Accuracy (NIST)</label>
                 <div className="flex flex-wrap gap-1">
                   {['ALL', 'AAA', 'A+', 'A', 'B+'].map(acc => (
                     <button 
                        key={acc}
                        onClick={() => setFilters(f => ({ ...f, accuracy: acc }))}
                        className={cn(
                          "px-2 py-1 rounded border text-[9px] font-bold transition-all",
                          filters.accuracy === acc 
                            ? "bg-plasma-magenta/20 border-plasma-magenta/50 text-plasma-magenta" 
                            : "bg-white/5 border-white/5 text-slate-500 hover:text-white"
                        )}
                      >
                        {acc}
                     </button>
                   ))}
                 </div>
              </div>

              <div className="pt-4 border-t border-white/5 text-center">
                 <button className="text-[9px] text-slate-600 hover:text-white transition-colors uppercase tracking-widest font-bold">Clear All Filters</button>
              </div>
              <div className="pt-4 border-t border-white/5"> {/* MOLECULAR ADDITION */}
                <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider"> {/* MOLECULAR ADDITION */}
                  <input type="checkbox" checked={showMolecular} onChange={(e) => setShowMolecular(e.target.checked)} className="rounded border-white/10 bg-transparent text-plasma-cyan focus:ring-plasma-cyan" /> {/* MOLECULAR ADDITION */}
                  Include molecular bands (±1.0nm) {/* MOLECULAR ADDITION */}
                </label> {/* MOLECULAR ADDITION */}
              </div> {/* MOLECULAR ADDITION */}
            </div>
          </div>

          <div className="glass-panel p-6 border-white/5 bg-plasma-cyan/5">
             <div className="flex items-center gap-3 mb-2">
               <TrendingUp className="w-4 h-4 text-plasma-cyan" />
               <h3 className="text-xs font-display text-white tracking-widest uppercase">Diagnostic Alert</h3>
             </div>
             <p className="text-[11px] text-slate-400 leading-relaxed italic">
               "Strong resonance absorption predicted for Ar-I 811.5 nm at ne &gt; 10¹⁶ cm⁻³. Consider 750.4 nm for population audits."
             </p>
          </div>
        </aside>

        {/* Results Table & Plot */}
        <div className="lg:col-span-3 space-y-8">
           {/* Summary Stats */}
           <div className="flex gap-4">
              <SummaryStat label="Matched Lines" value={filteredData.length} />
              <SummaryStat label="NIST Source" value="v5.9 (2024)" />
              <SummaryStat label="Confidence" value="100%" color="text-green-400" />
           </div>

           {/* CSV-UPLOAD RESULTS */}
           {spectrumResults.length > 0 && (
             <div className="glass-panel border-white/5 overflow-hidden border-t-2 border-t-plasma-magenta">
               <div className="flex justify-between items-center p-4 bg-white/5 border-b border-white/10">
                 <h3 className="text-xs font-display text-white tracking-widest uppercase flex items-center gap-2">
                   <BarChart2 className="w-4 h-4 text-plasma-magenta" /> Spectrum Analysis Results
                 </h3>
                 <button onClick={() => {
                   const linesToExport = spectrumResults.filter(r => r.matchedLine).map(r => ({ line: r.matchedLine, intensity: r.intensity }));
                   onAddLines?.(linesToExport);
                 }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-plasma-cyan/10 border border-plasma-cyan/30 text-[10px] font-bold text-plasma-cyan uppercase tracking-wider hover:bg-plasma-cyan/20 transition-all">
                   <Plus className="w-3.5 h-3.5" /> Send matched lines to Boltzmann Tool
                 </button>
               </div>
               <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                 <table className="w-full text-left text-[11px] font-mono">
                   <thead>
                     <tr className="bg-white/5 border-b border-white/10 uppercase tracking-widest text-slate-400 sticky top-0 backdrop-blur z-10">
                       <th className="p-4">Measured λ (nm)</th>
                       <th className="p-4">Intensity</th>
                       <th className="p-4">Matched Line</th>
                       <th className="p-4">Element / Ion</th>
                       <th className="p-4">A_ki (s⁻¹)</th>
                       <th className="p-4">Match Quality</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {spectrumResults.map((r, i) => (
                       <tr key={i} className="hover:bg-white/5">
                         <td className="p-4 font-bold text-white">{r.wavelength.toFixed(3)}</td>
                         <td className="p-4 text-slate-300">{r.intensity.toExponential(2)}</td>
                         {r.matchedLine ? (
                           <>
                             <td className="p-4 text-plasma-cyan">{r.matchedLine.wavelength.toFixed(3)}</td>
                             <td className="p-4"><span className="text-plasma-amber">{r.matchedLine.element}</span> <span className="text-plasma-magenta">{r.matchedLine.ion}</span></td>
                             <td className="p-4 text-slate-400">{r.matchedLine.aki.toExponential(2)}</td>
                             <td className="p-4">
                               <span className={cn(
                                 "px-2 py-1 rounded text-[9px] font-bold uppercase",
                                 r.matchQuality === 'Excellent' ? "bg-green-500/20 text-green-400" :
                                 r.matchQuality === 'Good' ? "bg-yellow-500/20 text-yellow-400" :
                                 "bg-orange-500/20 text-orange-400"
                               )}>
                                 {r.matchQuality === 'Excellent' ? '✅' : r.matchQuality === 'Good' ? '🟡' : '🟠'} {r.matchQuality}
                               </span>
                             </td>
                           </>
                         ) : (
                           <td colSpan={4} className="p-4 text-slate-400 italic">
                             ⚠️ {r.wavelength.toFixed(1)}nm — No match found in database
                           </td>
                         )}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           )}

           {/* Results List */}
           <div className="glass-panel border-white/5 overflow-hidden">
             {query.trim() === '' && ( // FIX-1
               <div className="p-4 bg-white/5 border-b border-white/10 text-[11px] font-mono text-slate-400 text-center uppercase tracking-widest">
                 Showing 50 of {filteredData.length} lines. Enter element symbol or wavelength.
               </div>
             )}
             <table className="w-full text-left text-[11px] font-mono">
               <thead>
                 <tr className="bg-white/5 border-b border-white/10 uppercase tracking-widest font-display text-plasma-cyan">
                   <th className="p-4">Wavelength ({filters.unit})</th>
                   <th className="p-4">Element</th>
                   <th className="p-4">Ion</th>
                   <th className="p-4">Upper Level</th>
                   <th className="p-4">A_ki (s⁻¹)</th>
                   <th className="p-4">Acc.</th>
                   <th className="p-4"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {displayedData.map((line, idx) => (
                   <React.Fragment key={idx}>
                    <tr 
                      onClick={() => setExpandedId(expandedId === idx ? null : idx)}
                      className="hover:bg-white/5 cursor-pointer transition-colors group"
                    >
                      <td className="p-4 text-white font-bold tracking-wider">{line.wavelength.toFixed(3)}</td>
                      <td className="p-4 text-plasma-amber">{line.element}</td>
                      <td className="p-4 text-plasma-magenta">{line.ion}</td>
                      <td className="p-4 text-slate-400">{line.upperLevel}</td>
                      <td className="p-4 text-slate-400">{line.aki.toExponential(2)}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold",
                          line.accuracy === 'AAA' ? "bg-green-400/20 text-green-400" : "bg-plasma-cyan/20 text-plasma-cyan"
                        )}>{line.accuracy}</span>
                      </td>
                      <td className="p-4 text-right">
                        <ChevronDown className={cn("w-4 h-4 text-slate-700 transition-transform", expandedId === idx && "rotate-180")} />
                      </td>
                    </tr>
                    {expandedId === idx && (
                      <tr>
                        <td colSpan={7} className="p-0 bg-black/40">
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="p-6 border-t border-white/5 flex gap-8"
                          >
                            <div className="flex-1 space-y-4">
                               <div className="grid grid-cols-2 gap-4">
                                 <DetailItem label="Upper Configuration" value={line.confHigh} />
                                 <DetailItem label="Lower Configuration" value={line.confLow} />
                                 <DetailItem label="Upper Term" value={`${line.termHigh} (J=${line.jHigh})`} />
                                 <DetailItem label="Lower Term" value={`${line.termLow} (J=${line.jLow})`} />
                                 <DetailItem label="Upper Energy" value={`${line.energyHigh} eV`} />
                                 <DetailItem label="Lower Energy" value={`${line.energyLow} eV`} />
                               </div>
                               <div className="flex gap-2 mt-6">
                                  <button 
                                    onClick={() => onAddLine?.(line)}
                                    className="flex-1 py-2 bg-plasma-cyan/10 border border-plasma-cyan/20 rounded-lg text-[10px] font-bold text-plasma-cyan uppercase hover:bg-plasma-cyan/20 transition-all flex items-center justify-center gap-2"
                                  >
                                     <Plus className="w-3.5 h-3.5" /> Add to Boltzmann Plot
                                  </button>
                                  <button className="w-12 h-10 flex items-center justify-center rounded-lg border border-white/5 hover:bg-white/5 text-slate-500 hover:text-plasma-magenta transition-all">
                                     <Star className="w-4 h-4" />
                                  </button>
                               </div>
                            </div>
                            <div className="w-64 glass-panel border-white/10 p-4 bg-black/40 flex flex-col justify-center items-center text-center">
                               <Atom className="w-12 h-12 text-plasma-cyan/30 mb-4 animate-spin-slow" />
                               <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Electronic Logic</span>
                               <p className="text-[10px] italic leading-relaxed text-slate-400">
                                 Transition probability calibrated against NIST v5.9 reference publications.
                               </p>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                   </React.Fragment>
                 ))}
               </tbody>
             </table>
           </div>

           {/* MOLECULAR ADDITION */}
           {showMolecular && molecularResults.length > 0 && ( /* MOLECULAR ADDITION */
             <div className="glass-panel border-white/5 overflow-hidden mt-8"> {/* MOLECULAR ADDITION */}
               <h3 className="p-4 text-xs font-display text-white tracking-widest uppercase border-b border-white/10 bg-white/5">Detected Molecular Bands</h3> {/* MOLECULAR ADDITION */}
               <table className="w-full text-left text-[11px] font-mono"> {/* MOLECULAR ADDITION */}
                 <thead><tr className="bg-white/5 border-b border-white/10 uppercase tracking-widest text-plasma-magenta"><th className="p-4">Molecule</th><th className="p-4">System</th><th className="p-4">Band Head (nm)</th><th className="p-4">Transition</th><th className="p-4">Intensity</th><th className="p-4">Diagnostic Use</th></tr></thead> {/* MOLECULAR ADDITION */}
                 <tbody className="divide-y divide-white/5"> {/* MOLECULAR ADDITION */}
                   {molecularResults.map((m, i) => ( /* MOLECULAR ADDITION */
                     <tr key={i} className="hover:bg-white/5"> {/* MOLECULAR ADDITION */}
                       <td className="p-4 text-plasma-cyan font-bold">{m.molecule}</td> {/* MOLECULAR ADDITION */}
                       <td className="p-4 text-slate-300">{m.system}</td> {/* MOLECULAR ADDITION */}
                       <td className="p-4 text-white font-bold">{m.bandHead_nm.toFixed(3)}</td> {/* MOLECULAR ADDITION */}
                       <td className="p-4 text-plasma-amber">{m.transition}</td> {/* MOLECULAR ADDITION */}
                       <td className="p-4"><span className="px-2 py-1 bg-white/10 text-[9px] uppercase rounded font-bold">{m.intensity}</span></td> {/* MOLECULAR ADDITION */}
                       <td className="p-4 text-slate-400 max-w-[200px] truncate" title={m.diagnosticUse}>{m.diagnosticUse}</td> {/* MOLECULAR ADDITION */}
                     </tr> /* MOLECULAR ADDITION */
                   ))} /* MOLECULAR ADDITION */
                 </tbody> {/* MOLECULAR ADDITION */}
               </table> {/* MOLECULAR ADDITION */}
             </div> /* MOLECULAR ADDITION */
           )} {/* MOLECULAR ADDITION */}

           {/* Spectral Analysis Plot */}
           <div className="glass-panel p-6 border-white/5 overflow-hidden">
             <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-3">
                 <BarChart2 className="w-4 h-4 text-plasma-cyan" />
                 <h3 className="text-xs font-display text-white tracking-widest uppercase">Synthetic Spectrum Preview</h3>
               </div>
               <div className="text-[9px] font-mono text-slate-600 uppercase tracking-tighter">
                 I_rel ∝ Aki × gk
               </div>
             </div>

             <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} barCategoryGap={1}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                   <XAxis 
                     dataKey="wavelength" 
                     stroke="#444" 
                     tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono' }} 
                     domain={['auto', 'auto']}
                   />
                   <YAxis hide />
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#0a0a14', border: '1px solid #00f0ff33', borderRadius: '8px', padding: '12px' }}
                     itemStyle={{ fontSize: '11px', color: '#00f0ff', fontFamily: 'JetBrains Mono' }}
                     labelStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                     labelFormatter={(v) => `${v} nm`}
                   />
                   <Bar dataKey="intensity">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.intensity > 1e8 ? '#b400ff' : '#00f0ff'} />
                      ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, color = "text-white" }: { label: string, value: string | number, color?: string }) {
  return (
    <div className="flex-1 glass-panel p-3 border-white/5 border-l-plasma-cyan border-l-2 bg-white/5">
      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</div>
      <div className={cn("text-lg font-display font-black tracking-tighter", color)}>{value}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="text-[11px] text-white font-mono">{value || 'N/A'}</div>
    </div>
  );
}
