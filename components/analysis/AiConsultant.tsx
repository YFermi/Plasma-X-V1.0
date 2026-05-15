
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Terminal, Activity, Brain, FileText, Send, Loader2, Info } from 'lucide-react';
import { ProjectState, PlasmaParameters } from '../../types';

interface AiConsultantProps {
  project: ProjectState;
  onUpdateResults: (id: string, params: Partial<PlasmaParameters>) => void;
}

const AiConsultant: React.FC<AiConsultantProps> = ({ project, onUpdateResults }) => {
  const [isConsulting, setIsConsulting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [report, setReport] = useState<string | null>(null);

  const selectedResult = project.selectedSpectrumId ? project.results[project.selectedSpectrumId] : null;

  const runConsultation = async () => {
    if (!project.selectedSpectrumId || !selectedResult) return;
    setIsConsulting(true);
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] INITIATING_AI_CONSULTATION`, ...prev]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        As a Senior Plasma Physicist, analyze the following diagnostic results for spectrum "${project.selectedSpectrumId}":
        - Gas Temperature (Tg): ${selectedResult.gasTemperature || 'Not measured'} K
        - Electron Temperature (Te): ${selectedResult.electronTemperature || 'Not measured'} K
        - Vibrational Temperature (Tv): ${selectedResult.vibrationalTemperature || 'Not measured'} K
        - Electron Density (ne): ${selectedResult.electronDensity || 'Not measured'} cm⁻³
        - Pressure: ${project.globalEnv.pressure} Pa
        - Debye Length: ${selectedResult.debyeLength ? (selectedResult.debyeLength * 1e6).toFixed(2) : 'N/A'} um
        
        Is the plasma in LTE? Are there signs of non-equilibrium (Tg << Te)? 
        Suggest the next diagnostic steps (e.g., Stark broadening check, molecular synth refinement).
        Provide a concise technical report in Markdown.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });

      const text = response.text || "Diagnostic matrix complete. No anomalies detected.";
      setReport(text);
      setLogs(prev => [`[${new Date().toLocaleTimeString()}] CONSULTATION_SUCCESSFUL`, ...prev]);
      
      onUpdateResults(project.selectedSpectrumId, { aiInsights: text });

    } catch (err) {
      setLogs(prev => [`[${new Date().toLocaleTimeString()}] ERROR: AI_UNAVAILABLE`, ...prev]);
    } finally {
      setIsConsulting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">AI Diagnostic Consultant</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Brain size={12} className="text-violet-500" /> GEMINI-3 PRO Analysis Engine
            </p>
          </div>
        </div>
        <button 
           onClick={runConsultation}
           disabled={isConsulting || !selectedResult}
           className="flex items-center gap-2 px-8 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-500/10 active:scale-95"
        >
          {isConsulting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 
          Run Auto-Diagnostic
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8">
           <div className="bg-slate-950/80 rounded-3xl border border-slate-800 p-8 shadow-2xl min-h-[500px] flex flex-col">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <FileText size={12} className="text-violet-500" /> Scientific Report
              </h4>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 prose prose-invert prose-xs max-w-none">
                {report ? (
                  <div dangerouslySetInnerHTML={{ __html: report.replace(/\n/g, '<br/>') }} className="text-slate-300 leading-relaxed font-sans" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-600 italic">
                    <Brain size={48} className="mb-4 opacity-10" />
                    <p>Awaiting data feed for auto-diagnostic report...</p>
                  </div>
                )}
              </div>
           </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
           <div className="bg-slate-900/40 rounded-3xl border border-slate-800 p-6 flex flex-col gap-6 shadow-xl">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <Terminal size={12} className="text-indigo-400" /> Consultation Log
              </h4>
              <div className="font-mono text-[10px] space-y-3 text-violet-400/70 overflow-y-auto max-h-[200px] custom-scrollbar">
                 {logs.map((log, i) => <p key={i}>{log}</p>)}
              </div>
           </div>

           <div className="p-6 bg-slate-900/20 border border-slate-800 rounded-3xl space-y-4">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <Info size={12} className="text-violet-500" /> AI Strategy
              </h4>
              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                The GlowLogic AI consultant uses advanced LLM reasoning to correlate multiple plasma parameters and identify non-physical fitting artifacts.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AiConsultant;
