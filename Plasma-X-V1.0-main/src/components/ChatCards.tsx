import React from 'react';
import { motion } from 'motion/react';
import { 
  Atom, 
  Database, 
  Table, 
  TrendingUp, 
  Activity, 
  ArrowRightLeft,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';

export function SearchResultCard({ data }: { data: any[] }) {
  return (
    <div className="space-y-3 my-4">
      {data.map((line, i) => (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          key={i} 
          className="p-3 bg-white/5 border border-white/10 rounded-xl hover:border-plasma-cyan/40 transition-all group"
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold font-mono text-plasma-cyan">{line.wavelength.toFixed(3)} nm</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">{line.element} {line.ion}</span>
          </div>
          <div className="text-[9px] text-slate-400 font-mono mt-1 uppercase tracking-widest">
            {line.termLow} ({line.jLow}) → {line.termHigh} ({line.jHigh})
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function LineTableCard({ data }: { data: any[] }) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-white/5 bg-black/40">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 text-[8px] uppercase tracking-[0.2em] text-slate-500 bg-white/5">
            <th className="p-2 pl-3">λ (nm)</th>
            <th className="p-2">Elem</th>
            <th className="p-2">Aki (s⁻¹)</th>
            <th className="p-2 pr-3">Ek (eV)</th>
          </tr>
        </thead>
        <tbody className="text-[9px] font-mono">
          {data.map((line, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/5 text-slate-300">
              <td className="p-2 pl-3 text-plasma-cyan font-bold">{line.wavelength.toFixed(2)}</td>
              <td className="p-2">{line.element} {line.ion}</td>
              <td className="p-2">{line.aki.toExponential(1)}</td>
              <td className="p-2 pr-3">{line.energyHigh.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BoltzmannMiniPlot({ data }: { data: any }) {
  return (
    <div className="my-4 p-4 glass-panel bg-slate-900 overflow-hidden border-plasma-magenta/20">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-plasma-magenta" />
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">Boltzmann Regression</span>
        </div>
        <span className="text-xs font-mono text-plasma-magenta font-bold">{data.te.toLocaleString()} K</span>
      </div>
      <div className="space-y-2">
        {data.points.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-4 text-[9px] font-mono">
            <div className="w-12 text-slate-500">{p.wavelength.toFixed(1)}nm</div>
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-plasma-magenta/40" style={{ width: `${(p.intensity / Math.max(...data.points.map((pt: any) => pt.intensity))) * 100}%` }} />
            </div>
            <div className="w-12 text-right text-white">{p.intensity}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConversionCard({ data }: { data: any }) {
  return (
    <div className="my-4 grid grid-cols-3 gap-3">
      <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
        <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Vacuum λ</p>
        <p className="text-sm font-bold text-plasma-cyan font-mono">{data.nm.toFixed(2)} nm</p>
      </div>
      <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
        <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Energy</p>
        <p className="text-sm font-bold text-plasma-amber font-mono">{data.ev.toFixed(3)} eV</p>
      </div>
      <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
         <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Wavenumber</p>
        <p className="text-sm font-bold text-plasma-magenta font-mono">{data.cm.toFixed(1)} cm⁻¹</p>
      </div>
    </div>
  );
}

export function DiagnosticRatioCard({ data }: { data: any }) {
  return (
    <div className="my-4 space-y-4">
      {data.ne.map((item: any, i: number) => (
        <div key={i} className="p-3 bg-white/5 border border-white/10 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-white tracking-widest uppercase">{item.lines}</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase",
              item.sensitivity === 'High' || item.sensitivity === 'Primary' ? "bg-green-500/20 text-green-400" : "bg-plasma-amber/20 text-plasma-amber"
            )}>{item.sensitivity} Sen.</span>
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-500">
            <span>Dynamic Range:</span>
            <span className="text-white">{item.range}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ComparisonCard({ data }: { data: any }) {
  return (
    <div className="my-4 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <ArrowRightLeft className="w-3.5 h-3.5 text-plasma-cyan" />
        <span className="text-[10px] font-bold text-white uppercase tracking-widest">{data.title}</span>
      </div>
      {data.items.map((item: any, i: number) => (
        <div key={i} className="p-3 bg-white/5 border border-white/10 rounded-xl">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-plasma-cyan">{item.label}</span>
            <span className="text-[10px] font-mono text-white font-bold">{item.value}</span>
          </div>
          <p className="text-[9px] text-slate-500 italic mt-1">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
