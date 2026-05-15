
import React from 'react';
import { ListFilter, Trash2 } from 'lucide-react';
import { SpectrumData } from '../../types';

interface SpectrumCatalogProps {
  spectra: SpectrumData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const SpectrumCatalog: React.FC<SpectrumCatalogProps> = ({ spectra, selectedId, onSelect, onDelete }) => {
  return (
    <div className="flex-1 bg-slate-900/30 border border-slate-800 rounded-3xl p-6 flex flex-col overflow-hidden shadow-inner">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <ListFilter size={14} className="text-indigo-400" /> Catalog
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {spectra.length > 0 ? spectra.map(s => (
          <div key={s.id} className="group relative">
            <button
              onClick={() => onSelect(s.id)}
              className={`w-full p-4 rounded-2xl border text-left transition-all duration-300 overflow-hidden pr-10 ${
                selectedId === s.id 
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5' 
                  : 'bg-slate-800/20 border-slate-800/50 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <p className={`text-sm font-bold truncate pr-4 ${selectedId === s.id ? 'text-emerald-400' : 'text-slate-300'}`}>
                {s.name}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-slate-500 font-mono tracking-tighter">
                  {new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  selectedId === s.id ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-600'
                }`}>
                  {s.points.length} PTS
                </span>
              </div>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
              className="absolute top-1/2 -translate-y-1/2 right-3 p-2 bg-slate-900/50 hover:bg-rose-500/20 text-slate-600 hover:text-rose-400 rounded-lg border border-transparent hover:border-rose-500/30 transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )) : (
          <div className="text-center py-8">
            <p className="text-[11px] text-slate-600 font-bold uppercase">No data cataloged</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpectrumCatalog;
