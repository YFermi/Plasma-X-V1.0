
import React from 'react';
import { Target } from 'lucide-react';
import { PeakResult } from '../../types';

interface IntensityRowProps {
  label: string;
  peakData: PeakResult;
  shift: number;
  onShiftChange: (v: number) => void;
}

const IntensityRow: React.FC<IntensityRowProps> = ({ label, peakData, shift, onShiftChange }) => {
  const netIntensity = peakData.intensity - peakData.background;
  
  return (
    <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl space-y-2 group hover:border-slate-700 transition-colors">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
        <span className={`text-[9px] font-mono font-bold ${netIntensity > 0 ? 'text-emerald-500' : 'text-slate-700'}`}>
          λ_found: {peakData.detectedWavelength.toFixed(3)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-lg px-2.5 py-1.5 text-[10px] font-mono flex items-center justify-between border ${netIntensity > 0 ? 'bg-slate-950 border-emerald-500/20 text-emerald-400 shadow-[inset_0_0_10px_rgba(16,185,129,0.02)]' : 'bg-slate-900 border-slate-800 text-slate-700'}`}>
          <span className="truncate">{netIntensity > 0 ? netIntensity.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '---'}</span>
          <Target size={10} className={netIntensity > 0 ? 'text-emerald-500/40' : 'text-slate-800'} />
        </div>
        <div className="flex items-center gap-1.5 px-2 bg-slate-900 border border-slate-800 rounded-lg group-hover:border-slate-700 transition-colors">
           <span className="text-[8px] text-slate-600 font-bold uppercase shrink-0">Offset</span>
           <input 
            type="number" step="0.01" value={shift} 
            onChange={(e) => onShiftChange(parseFloat(e.target.value) || 0)} 
            className="bg-transparent text-[10px] font-mono text-indigo-400 outline-none w-full" 
          />
        </div>
      </div>
    </div>
  );
};

export default IntensityRow;
