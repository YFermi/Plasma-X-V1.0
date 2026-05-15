import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ELEMENTS, ElementMetadata } from '../data/nist_samples';
import { cn } from '../lib/utils';
import { Info, Atom, Zap } from 'lucide-react';

interface PeriodicTableProps {
  onElementClick: (element: ElementMetadata) => void;
}

const IONIZATION_ENERGIES: Record<string, number> = {
  H: 1312, He: 2372, Li: 520, Be: 899, B: 801, C: 1086, N: 1402, O: 1314, F: 1681, Ne: 2081,
  Na: 496, Mg: 738, Al: 578, Si: 786, P: 1012, S: 1000, Cl: 1251, Ar: 1521,
  K: 419, Ca: 590, Sc: 633, Ti: 658, V: 651, Cr: 653, Mn: 717, Fe: 762, Co: 760, Ni: 737, Cu: 745, Zn: 906,
  Ga: 579, Ge: 762, As: 947, Se: 941, Br: 1140, Kr: 1351
};

const ELEMENT_NAMES: Record<string, string> = {
  H: 'Hydrogen', He: 'Helium', Li: 'Lithium', Be: 'Beryllium', B: 'Boron', C: 'Carbon', N: 'Nitrogen', O: 'Oxygen', F: 'Fluorine', Ne: 'Neon',
  Na: 'Sodium', Mg: 'Magnesium', Al: 'Aluminum', Si: 'Silicon', P: 'Phosphorus', S: 'Sulfur', Cl: 'Chlorine', Ar: 'Argon',
  K: 'Potassium', Ca: 'Calcium', Sc: 'Scandium', Ti: 'Titanium', V: 'Vanadium', Cr: 'Chromium', Mn: 'Manganese', Fe: 'Iron', Co: 'Cobalt', Ni: 'Nickel', Cu: 'Copper', Zn: 'Zinc', Ga: 'Gallium', Ge: 'Germanium', As: 'Arsenic', Se: 'Selenium', Br: 'Bromine', Kr: 'Krypton'
};

const ATOMIC_NUMBERS: Record<string, number> = {
  H: 1, He: 2, Li: 3, Be: 4, B: 5, C: 6, N: 7, O: 8, F: 9, Ne: 10,
  Na: 11, Mg: 12, Al: 13, Si: 14, P: 15, S: 16, Cl: 17, Ar: 18,
  K: 19, Ca: 20, Sc: 21, Ti: 22, V: 23, Cr: 24, Mn: 25, Fe: 26, Co: 27, Ni: 28, Cu: 29, Zn: 30, Ga: 31, Ge: 32, As: 33, Se: 34, Br: 35, Kr: 36
};

const TABLE_STRUCTURE = [
  ['H', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 'He'],
  ['Li', 'Be', null, null, null, null, null, null, null, null, null, null, 'B', 'C', 'N', 'O', 'F', 'Ne'],
  ['Na', 'Mg', null, null, null, null, null, null, null, null, null, null, 'Al', 'Si', 'P', 'S', 'Cl', 'Ar'],
  ['K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr'],
  // Add more as needed, but for the demo we focus on these
];

export function PeriodicTable({ onElementClick }: PeriodicTableProps) {
  const [hovered, setHovered] = useState<ElementMetadata | null>(null);

  const getElementData = (symbol: string) => ELEMENTS.find(e => e.symbol === symbol);

  return (
    <div className="relative p-8 glass-panel border-plasma-cyan/5 overflow-x-auto overflow-y-hidden" style={{ minHeight: '600px' }}>
      <div className="grid grid-cols-18 gap-2 min-w-[1100px] relative">
        {/* Legend Placed in Grid Gap */}
        <div className="col-start-3 col-end-13 row-start-1 row-end-4 flex items-center justify-center pointer-events-none hidden md:flex">
          <div className="border border-plasma-cyan/20 bg-plasma-cyan/5 p-4 rounded-lg backdrop-blur-sm shadow-[0_0_15px_rgba(0,240,255,0.05)] text-plasma-cyan/80">
            <div className="text-xs font-display mb-3 uppercase tracking-widest text-center border-b border-plasma-cyan/20 pb-2">Element Legend</div>
            <div className="flex items-center gap-6">
               <div className="w-20 h-20 border border-plasma-cyan/50 bg-plasma-cyan/10 rounded-lg flex flex-col items-center justify-center relative shadow-inner">
                 <span className="absolute top-1 text-[9px] font-mono opacity-80 leading-none left-1 border-b border-r border-plasma-cyan/20 pb-[1px] pr-[2px] rounded-br-sm text-plasma-cyan">Z</span>
                 <span className="absolute top-1 text-[8px] font-mono opacity-80 leading-none right-1 text-plasma-amber/80">kJ/mol</span>
                 <span className="text-3xl font-display font-bold leading-none -mt-2">Sy</span>
                 <span className="text-[8px] font-mono opacity-80 leading-none tracking-wider text-plasma-cyan uppercase mt-0.5">NAME</span>
                 <div className="absolute bottom-1 left-1 px-[4px] bg-black/80 rounded text-[9px] font-mono font-bold text-plasma-cyan border border-plasma-cyan/40 leading-none py-[3px] shadow-[0_0_5px_rgba(0,0,0,0.8)]">Lines</div>
               </div>
               <div className="flex-1 text-[10px] font-mono leading-relaxed space-y-1">
                 <p><span className="text-plasma-cyan font-bold text-xs border-b border-r border-plasma-cyan/20 pr-1 pb-0.5 mr-1">Z</span> Atomic Number</p>
                 <p><span className="text-plasma-amber text-xs font-bold mr-1">kJ/mol</span> First Ionization Energy</p>
                 <p><span className="text-white font-bold text-lg leading-none mr-1">Sy</span> Symbol &amp; Name</p>
                 <p><span className="text-plasma-cyan font-bold border border-plasma-cyan/40 px-1 bg-black rounded text-[9px] py-0.5 mr-1">Lines</span> Spectral lines in database</p>
               </div>
            </div>
          </div>
        </div>
        {TABLE_STRUCTURE.map((row, rIdx) => (
          row.map((symbol, cIdx) => {
            if (!symbol) return null;
            const data = getElementData(symbol);
            const isAvailable = !!data;
            const lineCount = data?.lines || 0;
            const hasData = lineCount > 0;

            return (
              <motion.div
                key={symbol}
                style={{ gridColumn: cIdx + 1, gridRow: rIdx + 1 }}
                whileHover={{ 
                  scale: 1.15, 
                  zIndex: 20,
                  boxShadow: hasData ? '0 0 30px rgba(0, 240, 255, 0.5)' : undefined
                }}
                onHoverStart={() => data && setHovered(data)}
                onHoverEnd={() => setHovered(null)}
                onClick={() => hasData && onElementClick(data)}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center border transition-all cursor-pointer rounded-lg relative overflow-hidden",
                  hasData 
                    ? lineCount > 5 
                      ? "bg-plasma-cyan/10 border-plasma-cyan/50 text-plasma-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]" 
                      : "bg-plasma-cyan/5 border-plasma-cyan/30 text-plasma-cyan hover:bg-plasma-cyan/10" 
                    : "bg-white/5 border-white/5 text-slate-600 opacity-40 grayscale" 
                )}
              >
                {/* Subtle pulse background on hover */}
                {hovered?.symbol === symbol && hasData && (
                  <motion.div 
                    layoutId="pulse"
                    className="absolute inset-0 bg-plasma-cyan/10 animate-pulse"
                  />
                )}
                
                {/* Upper corners */}
                <span className="absolute top-1 text-[10px] font-mono opacity-80 z-10 leading-none left-1 border-b border-r border-plasma-cyan/20 pb-[1px] pr-[2px] rounded-br-sm text-plasma-cyan/90">
                  {data?.number || ATOMIC_NUMBERS[symbol] || '?'}
                </span>
                
                {IONIZATION_ENERGIES[symbol] && (
                  <span className="absolute top-1 text-[8px] font-mono opacity-70 z-10 leading-none right-1 truncate text-right text-plasma-amber/80" title="1st Ionization (kJ/mol)">
                    {IONIZATION_ENERGIES[symbol]}
                  </span>
                )}

                {/* Center Symbol */}
                <span className="text-2xl font-display font-bold leading-none relative z-10 -mt-2">{symbol}</span>
                
                {/* Below Symbol Element Name */}
                <span className="text-[7.5px] font-mono opacity-70 z-10 leading-none tracking-wider text-plasma-cyan uppercase mt-0.5 px-0.5 text-center truncate w-full">
                  {data?.name || ELEMENT_NAMES[symbol] || ''}
                </span>

                {/* Lines Badge bottom-left */}
                {hasData && (
                  <div className="absolute bottom-[3px] left-[3px] px-[4px] bg-black/80 rounded text-[8px] font-mono font-bold text-plasma-cyan border border-plasma-cyan/40 z-20 leading-none py-[3px] shadow-[0_0_5px_rgba(0,0,0,0.8)]">
                    {lineCount}
                  </div>
                )}
              </motion.div>
            )
          })
        ))}
      </div>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 right-4 w-64 glass-panel p-4 border-plasma-cyan/30 plasma-glow-cyan z-50 pointer-events-none"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-display text-white">{hovered.name}</h3>
              <span className="text-plasma-cyan font-mono text-sm">#{hovered.number}</span>
            </div>
            
            <div className="space-y-2 text-[11px] font-mono">
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400 uppercase tracking-widest">Energy Levels</span>
                <span className="text-white">{hovered.levels}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400 uppercase tracking-widest">Spectral Lines</span>
                <span className="text-white">{hovered.lines}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400 uppercase tracking-widest">Ion Stages</span>
                <span className="text-white text-plasma-magenta">I - {hovered.ions}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400 uppercase tracking-widest">Data Quality</span>
                <span className={cn(
                  hovered.quality === 'Excellent' ? "text-green-400" : 
                  hovered.quality === 'Good' ? "text-plasma-cyan" : "text-plasma-amber"
                )}>{hovered.quality}</span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2 text-[9px] text-plasma-cyan animate-pulse">
              <Zap className="w-3 h-3" />
              <span>CLICK TO ANALYZE SPECTRUM</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
