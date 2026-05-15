
import React, { useState, useEffect } from 'react';
import { 
  Maximize2, Minimize2, MousePointer2, ZoomIn, Crosshair, FlaskConical, LineChart, Import
} from 'lucide-react';
import { SpectrumData } from '../types';
import FileUpload from './FileUpload';
import SpectrumChart from './viewer/SpectrumChart';
import SpectrumCatalog from './viewer/SpectrumCatalog';

interface SpectraViewerProps {
  spectrum?: SpectrumData;
  allSpectra: SpectrumData[];
  onSelect: (id: string) => void;
  onUpload: (spectra: SpectrumData[]) => void;
  onDelete: (id: string) => void;
}

const SpectraViewer: React.FC<SpectraViewerProps> = ({ spectrum, allSpectra, onSelect, onUpload, onDelete }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner">
              <LineChart size={24} className="text-indigo-400" />
            </span>
            Spectra Analysis Engine
          </h2>
          {spectrum && (
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 rounded-lg border border-slate-800 shadow-lg">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              <span className="text-[11px] font-mono text-emerald-500 uppercase truncate max-w-[250px] font-bold">
                {spectrum.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ControlButton icon={<MousePointer2 size={16} />} label="Navigate" active />
          <ControlButton icon={<ZoomIn size={16} />} label="Inspect" />
          <ControlButton icon={<Crosshair size={16} />} label="Trace" />
          <div className="w-[1px] h-5 bg-slate-800 mx-2" />
          <ControlButton 
            icon={isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />} 
            label={isFullscreen ? "Restore" : "Expand"} 
            onClick={() => setIsFullscreen(!isFullscreen)}
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[580px]">
        {spectrum ? (
          <SpectrumChart 
            spectrum={spectrum} 
            isFullscreen={isFullscreen} 
            onCloseFullscreen={() => setIsFullscreen(false)} 
          />
        ) : (
          <div className="col-span-9 bg-slate-950 border border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-500 animate-pulse text-center p-12">
            <FlaskConical size={54} className="mb-4 opacity-10" />
            <p className="text-base font-medium uppercase tracking-widest text-slate-600">Buffer Empty</p>
            <p className="text-sm mt-1 text-slate-700 font-mono">Import data to begin analysis</p>
          </div>
        )}

        {!isFullscreen && (
          <div className="col-span-3 flex flex-col gap-6 overflow-hidden">
            <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-5 shadow-inner">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4 px-1">
                <Import size={14} className="text-emerald-400" /> Acquisition
              </h3>
              <FileUpload onUpload={onUpload} />
            </div>
            <SpectrumCatalog 
              spectra={allSpectra} 
              selectedId={spectrum?.id || null} 
              onSelect={onSelect} 
              onDelete={onDelete} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

const ControlButton: React.FC<{ icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase transition-all border ${
    active 
      ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-200 hover:border-slate-700'
  }`}>
    {icon}
    {label}
  </button>
);

export default SpectraViewer;
