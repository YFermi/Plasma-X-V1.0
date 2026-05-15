
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X } from 'lucide-react';
import { SpectrumData } from '../../types';

interface SpectrumChartProps {
  spectrum: SpectrumData;
  isFullscreen: boolean;
  onCloseFullscreen: () => void;
}

const CustomTooltip = ({ active, payload, label, isFullscreen }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={`bg-slate-900 border border-slate-700 rounded-lg shadow-2xl font-mono backdrop-blur-md ${isFullscreen ? 'p-12 text-3xl' : 'p-4 text-[11px]'}`}>
        <p className="text-emerald-400 font-bold mb-2">λ: {typeof label === 'number' ? label.toFixed(4) : label} nm</p>
        <p className="text-slate-300">Inten: {payload[0].value.toLocaleString(undefined, {minimumFractionDigits: 1})}</p>
      </div>
    );
  }
  return null;
};

const SpectrumChart: React.FC<SpectrumChartProps> = ({ spectrum, isFullscreen, onCloseFullscreen }) => {
  return (
    <div className={`bg-slate-950 border border-slate-800 rounded-3xl relative group shadow-2xl overflow-hidden flex items-center justify-center transition-all duration-500 ${
      isFullscreen ? 'fixed inset-0 z-[100] m-0 rounded-none border-none bg-[#020204] p-24' : 'col-span-9 p-8'
    }`}>
      <div className="absolute inset-0 bg-emerald-500/[0.01] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {isFullscreen && (
        <button 
          onClick={onCloseFullscreen}
          className="absolute top-12 right-12 p-6 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full border border-slate-700 transition-all z-[110] shadow-2xl active:scale-90"
        >
          <X size={48} />
        </button>
      )}

      <ResponsiveContainer width="100%" height="100%" key={spectrum.id + (isFullscreen ? '-fs' : '')}>
        <AreaChart 
          data={spectrum.points} 
          margin={isFullscreen ? { top: 80, right: 80, left: 80, bottom: 120 } : { top: 10, right: 10, left: 0, bottom: 20 }}
        >
          <defs>
            <linearGradient id="colorInt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={isFullscreen ? 0.5 : 0.2}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={isFullscreen ? 0.1 : 0.5} />
          <XAxis 
            dataKey="wavelength" 
            type="number"
            domain={['auto', 'auto']} 
            stroke="#475569" 
            fontSize={isFullscreen ? 24 : 11} 
            tickFormatter={(val) => val.toFixed(1)}
            label={{ 
              value: 'Wavelength (nm)', 
              position: 'insideBottom', 
              offset: isFullscreen ? -80 : -10, 
              fill: '#475569', 
              fontSize: isFullscreen ? 32 : 11, 
              fontWeight: 'bold' 
            }}
            tick={{ fill: '#64748b' }}
          />
          <YAxis 
            stroke="#475569" 
            fontSize={isFullscreen ? 24 : 11}
            label={{ 
              value: 'Intensity (counts)', 
              angle: -90, 
              position: 'insideLeft', 
              fill: '#475569', 
              fontSize: isFullscreen ? 32 : 11, 
              fontWeight: 'bold', 
              offset: isFullscreen ? -30 : 10 
            }}
            tick={{ fill: '#64748b' }}
          />
          <Tooltip content={<CustomTooltip isFullscreen={isFullscreen} />} />
          <Area 
            type="monotone" 
            dataKey="intensity" 
            stroke="#10b981" 
            strokeWidth={isFullscreen ? 8 : 1.5}
            fillOpacity={1} 
            fill="url(#colorInt)" 
            isAnimationActive={true}
            animationDuration={isFullscreen ? 1200 : 800}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      <div className={`absolute flex gap-3 ${isFullscreen ? 'top-12 left-12' : 'top-6 right-6'}`}>
        <span className={`font-mono bg-slate-900/90 rounded-2xl text-emerald-500 border border-slate-800 shadow-2xl font-bold backdrop-blur-xl ${
          isFullscreen ? 'px-16 py-8 text-4xl' : 'px-3 py-1.5 text-[11px]'
        }`}>
          {isFullscreen ? 'ENGINE_TRACE: ' : ''}SAMPLES {spectrum.points.length.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default SpectrumChart;
