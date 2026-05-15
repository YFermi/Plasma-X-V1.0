
import React from 'react';
import { BookOpen, Info } from 'lucide-react';
import { DiagnosticType } from '../../types';

interface AnalyticFrameworkProps {
  type: DiagnosticType | 'synth';
}

const AnalyticFramework: React.FC<AnalyticFrameworkProps> = ({ type }) => {
  return (
    <div className="bg-slate-900/60 rounded-2xl border border-emerald-500/10 p-5 flex flex-col shadow-inner relative overflow-hidden group">
      <h4 className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest flex items-center gap-2 mb-4">
        < BookOpen size={12} /> Analytic Framework
      </h4>
      <div className="bg-slate-950/40 py-6 px-4 rounded-xl border border-slate-800/80 flex items-center justify-center font-serif italic text-slate-200 shadow-inner mb-4 transition-all group-hover:bg-slate-950/60">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 whitespace-nowrap text-base">
            <span className="text-emerald-400 font-bold">ln</span>
            <div className="flex items-center">
              <span className="text-xl">(</span>
              <div className="flex flex-col items-center px-1">
                <span className="text-[11px] leading-none border-b border-slate-600 pb-2 px-2">
                  I<sub>count</sub> · λ<sup>4</sup>
                </span>
                <span className="text-[11px] leading-none pt-2 px-2">
                  S<sub>JJ</sub>
                </span>
              </div>
              <span className="text-xl">)</span>
            </div>
            <span className="text-lg">= - </span>
            <div className="flex flex-col items-center px-1">
              <span className="text-[11px] leading-none border-b border-slate-600 pb-2 px-2">
                hc · F(J')
              </span>
              <span className="text-[11px] leading-none pt-2 px-2">
                k · T<sub>rot</sub>
              </span>
            </div>
            <span className="text-lg">+ Const</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t border-slate-800/50 pt-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-bold text-emerald-500 uppercase">S<sub>JJ</sub></span>
            <span className="text-[7px] text-slate-600 uppercase font-bold">[Factor]</span>
          </div>
          <span className="text-[7px] text-slate-500 leading-tight">Combined Hönl-London & Nuclear Degeneracy.</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-bold text-slate-500 uppercase">F(J')</span>
            <span className="text-[7px] text-slate-700 uppercase font-bold">[cm⁻¹]</span>
          </div>
          <span className="text-[7px] text-slate-600 leading-tight">Upper state rotational energy level.</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-bold text-slate-500 uppercase">hc/k</span>
            <span className="text-[7px] text-slate-700 uppercase font-bold">[1.4388]</span>
          </div>
          <span className="text-[7px] text-slate-600 leading-tight">Second Radiation Constant.</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-emerald-400">
            <span className="text-[8px] font-bold uppercase">Slope (b)</span>
            <Info size={8} />
          </div>
          <span className="text-[7px] text-slate-500 leading-tight">b = -hc / (k · T<sub>rot</sub>)</span>
        </div>
      </div>
    </div>
  );
};

export default AnalyticFramework;
