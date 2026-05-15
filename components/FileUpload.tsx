
import React from 'react';
import { FileUp, FileJson, FileText, UploadCloud, Database, AlertCircle } from 'lucide-react';
import { SpectrumData, SpectralPoint } from '../types';

interface FileUploadProps {
  onUpload: (spectra: SpectrumData[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload }) => {
  const [status, setStatus] = React.useState<string>('SYSTEM_IDLE: AWAITING_BUFFER');
  const [error, setError] = React.useState<string | null>(null);

  const parseData = (content: string): SpectralPoint[] => {
    const lines = content.split(/\r?\n/);
    const points: SpectralPoint[] = [];

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Try splitting by comma, tab, or semicolon
      const parts = trimmedLine.split(/,|\t|;/).map(p => p.trim());
      
      // Filter out empty parts and try to parse numbers
      const numericParts = parts
        .filter(p => p.length > 0)
        .map(p => parseFloat(p))
        .filter(p => !isNaN(p));

      // We expect at least two numeric values: wavelength and intensity
      if (numericParts.length >= 2) {
        points.push({
          wavelength: numericParts[0],
          intensity: numericParts[1]
        });
      }
    });

    // Sort by wavelength to ensure charts render correctly
    return points.sort((a, b) => a.wavelength - b.wavelength);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setStatus('PROCESSING: PARSING_INPUT_STREAM');

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          if (!content) throw new Error("File is empty");

          const parsedPoints = parseData(content);

          if (parsedPoints.length === 0) {
            throw new Error(`No valid numeric data found in ${file.name}. Ensure 2-column format.`);
          }

          const newSpectrum: SpectrumData = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            timestamp: new Date().toISOString(),
            points: parsedPoints,
            metadata: {
              exposureTime: 0,
              grating: "Detected from file",
              centerWavelength: parsedPoints.length > 0 ? parsedPoints[Math.floor(parsedPoints.length / 2)].wavelength : 0
            }
          };

          onUpload([newSpectrum]);
          setStatus(`SUCCESS: LOADED_${file.name.toUpperCase()}`);
        } catch (err: any) {
          setError(err.message);
          setStatus('ERROR: PARSING_FAILED');
        }
      };

      reader.onerror = () => {
        setError(`Failed to read file: ${file.name}`);
        setStatus('ERROR: IO_EXCEPTION');
      };

      reader.readAsText(file);
    });
  };

  return (
    <div className="space-y-4 px-2">
      <label className="relative group flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/30 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all cursor-pointer overflow-hidden">
        <input 
          type="file" 
          multiple 
          className="hidden" 
          onChange={handleFileChange}
          accept=".csv,.txt,.dat,.asc"
        />
        <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 transition-colors mb-2" />
        <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 text-center">Import Origin CSV/Data</span>
        <span className="text-[10px] text-slate-600 mt-1 uppercase tracking-tighter">comma or tab separated</span>
        
        <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500/10 rounded-bl-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <FileUp size={12} className="text-emerald-400" />
        </div>
      </label>

      <div className="space-y-2">
        <h4 className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-2 px-1">
          <Database size={10} /> Data Inlet Status
        </h4>
        <div className={`flex items-center gap-2 p-2 border rounded text-[10px] font-mono transition-colors ${
          error ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${error ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          {status}
        </div>
        {error && (
          <div className="flex items-start gap-2 p-2 bg-rose-500/5 rounded text-[9px] text-rose-400/80 leading-tight">
            <AlertCircle size={10} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
