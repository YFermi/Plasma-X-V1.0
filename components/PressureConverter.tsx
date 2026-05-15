
import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowRightLeft, Database, Info } from 'lucide-react';

interface PressureConverterProps {
  currentGlobalPressure: number;
  onSync: (pa: number) => void;
}

type PressureUnit = 'Pa' | 'atm' | 'bar' | 'Torr' | 'mbar' | 'psi';

const CONVERSIONS: Record<PressureUnit, number> = {
  Pa: 1,
  atm: 101325,
  bar: 100000,
  Torr: 133.322,
  mbar: 100,
  psi: 6894.76
};

const PressureConverter: React.FC<PressureConverterProps> = ({ currentGlobalPressure, onSync }) => {
  const [inputValue, setInputValue] = useState<string>(currentGlobalPressure.toString());
  const [unit, setUnit] = useState<PressureUnit>('Pa');
  const [results, setResults] = useState<Record<PressureUnit, number>>({
    Pa: 0, atm: 0, bar: 0, Torr: 0, mbar: 0, psi: 0
  });

  useEffect(() => {
    const val = parseFloat(inputValue) || 0;
    const paValue = val * CONVERSIONS[unit];
    
    const nextResults: Record<PressureUnit, number> = {
      Pa: paValue,
      atm: paValue / CONVERSIONS.atm,
      bar: paValue / CONVERSIONS.bar,
      Torr: paValue / CONVERSIONS.Torr,
      mbar: paValue / CONVERSIONS.mbar,
      psi: paValue / CONVERSIONS.psi
    };
    setResults(nextResults);
  }, [inputValue, unit]);

  const handleSync = () => {
    onSync(results.Pa);
  };

  const formatValue = (val: number) => {
    if (val === 0) return "0";
    if (val < 0.001 || val > 1000000) return val.toExponential(3);
    return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 space-y-3 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
          <ArrowRightLeft size={10} className="text-indigo-400" /> Unit Converter
        </span>
        <button 
          onClick={handleSync}
          className="text-[8px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 uppercase transition-colors"
        >
          <Database size={8} /> Sync to Core
        </button>
      </div>

      <div className="flex gap-2">
        <input 
          type="number" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-indigo-400 outline-none focus:border-indigo-500/50 transition-all"
          placeholder="Value..."
        />
        <select 
          value={unit} 
          onChange={(e) => setUnit(e.target.value as PressureUnit)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-1 text-[10px] font-bold text-slate-400 outline-none"
        >
          {Object.keys(CONVERSIONS).map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-1.5 pt-1">
        {(Object.entries(results) as [PressureUnit, number][]).filter(([u]) => u !== unit).map(([u, val]) => (
          <div key={u} className="bg-slate-950/50 border border-slate-800/40 rounded-lg p-1.5 flex flex-col">
            <span className="text-[7px] font-bold text-slate-600 uppercase leading-none mb-1">{u}</span>
            <span className="text-[9px] font-mono text-slate-400 truncate">{formatValue(val)}</span>
          </div>
        ))}
      </div>
      
      <div className="flex items-center gap-1.5 text-[8px] text-slate-600 italic px-1">
        <Info size={8} />
        <span>Values relative to {unit} base.</span>
      </div>
    </div>
  );
};

export default PressureConverter;
