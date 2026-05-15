import React from 'react';
import { motion } from 'motion/react';

interface SpectralLine {
  wavelength: number;
  intensity: number;
  label: string;
  color: string;
}

interface SpectrumVisualizerProps {
  lines: SpectralLine[];
  minWavelength?: number;
  maxWavelength?: number;
}

export function SpectrumVisualizer({ lines, minWavelength = 300, maxWavelength = 800 }: SpectrumVisualizerProps) {
  const getX = (wl: number) => ((wl - minWavelength) / (maxWavelength - minWavelength)) * 100;

  return (
    <div className="w-full h-48 bg-black/40 border border-plasma-border rounded-lg relative overflow-hidden group">
      {/* Wavelength Grid */}
      <div className="absolute inset-0 flex justify-between px-2 items-end pb-1 pointer-events-none opacity-20">
        {[0, 25, 50, 75, 100].map((p) => (
          <div key={p} className="flex flex-col items-center">
            <div className="h-2 w-px bg-white mb-1" />
            <span className="text-[10px] font-mono">
              {Math.round(minWavelength + (p / 100) * (maxWavelength - minWavelength))}nm
            </span>
          </div>
        ))}
      </div>

      {/* Spectral Lines */}
      <div className="absolute inset-0 flex items-end px-4 overflow-visible">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${line.intensity * 80}%` }}
            transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
            className="absolute bottom-0 w-px group-hover:w-0.5 transition-all cursor-crosshair"
            style={{ 
              left: `${getX(line.wavelength)}%`, 
              backgroundColor: line.color,
              boxShadow: `0 0 8px ${line.color}`
            }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              <span className="text-[9px] font-bold bg-black/80 px-1 border border-white/10 rounded" style={{ color: line.color }}>
                {line.label} ({line.wavelength}nm)
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-plasma-cyan/5 to-transparent" />
    </div>
  );
}
