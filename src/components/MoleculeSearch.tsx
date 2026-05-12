import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  Download, 
  Star,
  Plus,
  BarChart2,
  TrendingUp,
  Atom
} from 'lucide-react';
import { MOLECULAR_DATA, MolecularBand } from '../data/expansions/molecular_index';
import { cn } from '../lib/utils';
import { SkeletonLoader } from './LoadingSkeleton';

export function MoleculeSearch() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    molecule: 'ALL',
    type: 'ALL'
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const uniqueMolecules = useMemo(() => {
    return [...new Set(MOLECULAR_DATA.map(m => m.molecule))];
  }, []);

  const uniqueTypes = useMemo(() => {
    return [...new Set(MOLECULAR_DATA.map(m => m.type))];
  }, []);

  const filteredData = useMemo(() => {
    return MOLECULAR_DATA.filter(band => {
      const matchQuery = band.molecule.toLowerCase().includes(query.toLowerCase()) || 
                         band.bandHead_nm.toString().includes(query) ||
                         band.system.toLowerCase().includes(query.toLowerCase());
      const matchMolecule = filters.molecule === 'ALL' || band.molecule === filters.molecule;
      const matchType = filters.type === 'ALL' || band.type === filters.type;
      return matchQuery && matchMolecule && matchType;
    });
  }, [query, filters]);

  if (loading) {
    return <div className="space-y-8"><SkeletonLoader type="table" /></div>;
  }

  return (
    <div className="flex flex-col gap-8 h-full pb-12">
      {/* Header & Search */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-display font-black text-white glow-text-magenta tracking-tight uppercase">Molecular Band Search</h2>
            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mt-1">Diatomic Spectral Lines & Systems</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-wider hover:bg-white/5 transition-all">
              <Download className="w-3.5 h-3.5" /> Export Data
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-plasma-magenta/10 border border-plasma-magenta/30 text-[10px] font-bold text-plasma-magenta uppercase tracking-wider hover:bg-plasma-magenta/20 transition-all">
              <Plus className="w-3.5 h-3.5" /> Save Results
            </button>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-plasma-magenta/30 to-plasma-cyan/30 rounded-2xl blur opacity-30 group-focus-within:opacity-100 transition duration-1000" />
          <div className="relative flex items-center bg-black/60 border border-white/10 rounded-2xl p-2 gap-4">
            <Search className="w-6 h-6 text-plasma-magenta ml-4" />
            <input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by molecule (e.g. OH, N2), wavelength, or system..."
              className="flex-1 bg-transparent border-none text-lg py-4 px-2 focus:ring-0 text-white placeholder:text-slate-700 outline-none"
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <aside className="space-y-6">
          <div className="glass-panel p-6 border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <Filter className="w-4 h-4 text-plasma-magenta" />
              <h3 className="text-xs font-display text-white tracking-widest uppercase">Global Filters</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Molecule</label>
                <div className="grid grid-cols-3 gap-1">
                  {['ALL', ...uniqueMolecules].map(mol => (
                    <button 
                      key={mol}
                      onClick={() => setFilters(f => ({ ...f, molecule: mol }))}
                      className={cn(
                        "py-1 rounded border text-[10px] font-bold transition-all",
                        filters.molecule === mol 
                          ? "bg-plasma-magenta/20 border-plasma-magenta/50 text-plasma-magenta" 
                          : "bg-white/5 border-white/5 text-slate-500 hover:text-white"
                      )}
                    >
                      {mol}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Type</label>
                 <div className="flex flex-wrap gap-1">
                   {['ALL', ...uniqueTypes].map(type => (
                     <button 
                        key={type}
                        onClick={() => setFilters(f => ({ ...f, type: type }))}
                        className={cn(
                          "px-2 py-1 rounded border text-[9px] font-bold transition-all uppercase",
                          filters.type === type 
                            ? "bg-plasma-cyan/20 border-plasma-cyan/50 text-plasma-cyan" 
                            : "bg-white/5 border-white/5 text-slate-500 hover:text-white"
                        )}
                      >
                        {type}
                     </button>
                   ))}
                 </div>
              </div>

              <div className="pt-4 border-t border-white/5 text-center">
                 <button 
                  onClick={() => setFilters({ molecule: 'ALL', type: 'ALL' })}
                  className="text-[9px] text-slate-600 hover:text-white transition-colors uppercase tracking-widest font-bold"
                 >
                  Clear All Filters
                 </button>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 border-white/5 bg-plasma-magenta/5">
             <div className="flex items-center gap-3 mb-2">
               <TrendingUp className="w-4 h-4 text-plasma-magenta" />
               <h3 className="text-xs font-display text-white tracking-widest uppercase">Diagnostic Alert</h3>
             </div>
             <p className="text-[11px] text-slate-400 leading-relaxed italic">
               "Trot extracted from OH (A-X) 306 nm is frequently out of equilibrium with Tgas in nanosecond plasmas."
             </p>
          </div>
        </aside>

        {/* Results Table */}
        <div className="lg:col-span-3 space-y-8">
           {/* Summary Stats */}
           <div className="flex gap-4">
              <SummaryStat label="Matched Bands" value={filteredData.length} />
              <SummaryStat label="Molecules" value={new Set(filteredData.map(d => d.molecule)).size} />
              <SummaryStat label="Source" value="LIFBASE & Literature" color="text-plasma-magenta" />
           </div>

           {/* Results List */}
           <div className="glass-panel border-white/5 overflow-hidden">
             <table className="w-full text-left text-[11px] font-mono">
               <thead>
                 <tr className="bg-white/5 border-b border-white/10 uppercase tracking-widest font-display text-plasma-magenta">
                   <th className="p-4">Head (nm)</th>
                   <th className="p-4">Molecule</th>
                   <th className="p-4">System</th>
                   <th className="p-4">Transition</th>
                   <th className="p-4">Intensity</th>
                   <th className="p-4"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {filteredData.map((band, idx) => (
                   <React.Fragment key={idx}>
                    <tr 
                      onClick={() => setExpandedId(expandedId === idx ? null : idx)}
                      className="hover:bg-white/5 cursor-pointer transition-colors group"
                    >
                      <td className="p-4 text-white font-bold tracking-wider">{band.bandHead_nm.toFixed(3)}</td>
                      <td className="p-4 text-plasma-cyan font-bold">{band.molecule}</td>
                      <td className="p-4 text-slate-300">{band.system}</td>
                      <td className="p-4 text-plasma-amber">{band.transition}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-1 rounded text-[9px] font-bold uppercase",
                          band.intensity === 'very strong' ? "bg-plasma-magenta/20 text-plasma-magenta" : 
                          band.intensity === 'strong' ? "bg-green-400/20 text-green-400" :
                          "bg-white/10 text-slate-400"
                        )}>{band.intensity}</span>
                      </td>
                      <td className="p-4 text-right">
                        <ChevronDown className={cn("w-4 h-4 text-slate-700 transition-transform", expandedId === idx && "rotate-180")} />
                      </td>
                    </tr>
                    {expandedId === idx && (
                      <tr>
                        <td colSpan={6} className="p-0 bg-black/40">
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="p-6 border-t border-white/5 flex gap-8"
                          >
                            <div className="flex-1 space-y-4">
                               <div className="grid grid-cols-2 gap-4">
                                 <DetailItem label="Upper State" value={band.upperState || 'N/A'} />
                                 <DetailItem label="Lower State" value={band.lowerState || 'N/A'} />
                                 <DetailItem label="Type" value={band.type.toUpperCase()} />
                                 <DetailItem label="Trot Sensitive" value={band.Trot_sensitive ? 'YES' : 'NO'} />
                               </div>
                               <div className="mt-4">
                                 <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Diagnostic Use</div>
                                 <div className="text-[11px] text-white font-sans leading-relaxed">{band.diagnosticUse}</div>
                               </div>
                               <div className="mt-4">
                                 <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Common Plasma Types</div>
                                 <div className="text-[11px] text-slate-400 font-sans">{band.plasmaType}</div>
                               </div>
                               <div className="mt-4 text-[10px] text-slate-500 border-t border-white/5 pt-4">
                                  Ref: {band.reference}
                               </div>
                            </div>
                            <div className="w-64 glass-panel border-white/10 p-4 bg-black/40 flex flex-col justify-center items-center text-center">
                               <Atom className="w-12 h-12 text-plasma-magenta/30 mb-4 animate-pulse" />
                               <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Molecular Record</span>
                               <p className="text-[10px] italic leading-relaxed text-slate-400">
                                 Detailed structure of {band.molecule} {band.system} band.
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
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, color = "text-white" }: { label: string, value: string | number, color?: string }) {
  return (
    <div className="flex-1 glass-panel p-3 border-white/5 border-l-plasma-magenta border-l-2 bg-white/5">
      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</div>
      <div className={cn("text-lg font-display font-black tracking-tighter", color)}>{value}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="space-y-1">
      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="text-[11px] text-white font-mono">{value}</div>
    </div>
  );
}
