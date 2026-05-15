
import React, { useState, useCallback } from 'react';
import { Database, Download, ChevronRight, Brain, FlaskConical, Zap, Waves } from 'lucide-react';
import { SpectrumData, ProjectState, PlasmaParameters } from './types';
import SpectraViewer from './components/SpectraViewer';
import Dashboard from './components/Dashboard';
import AnalysisPipeline from './components/AnalysisPipeline';
import Sidebar from './components/layout/Sidebar';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'spectra' | 'analysis' | 'dashboard'>('spectra');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('molecule-synth');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['mol-suite', 'ai-strat', 'atomic-diag']);
  
  const [project, setProject] = useState<ProjectState>({
    spectra: [],
    selectedSpectrumId: null,
    results: {},
    globalEnv: { pressure: 101325, multiMol: 5.0, multiAtm: 10.0, isEquilibrium: false }
  });

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const autoRouteAnalysis = (spectrum: SpectrumData) => {
    const wavelengths = spectrum.points.map(p => p.wavelength);
    const minW = Math.min(...wavelengths), maxW = Math.max(...wavelengths);
    if ((656.3 >= minW && 656.3 <= maxW) || (486.1 >= minW && 486.1 <= maxW)) setSelectedModuleId('stark-h');
    else if (603.2 >= minW && 603.2 <= maxW) setSelectedModuleId('stark-ar');
    else if ((337.1 >= minW && 337.1 <= maxW) || (minW >= 290 && maxW <= 410)) setSelectedModuleId('molecule-synth');
  };

  const handleFileUpload = useCallback((newSpectra: SpectrumData[]) => {
    setProject(prev => {
      const nextSpectra = [...prev.spectra, ...newSpectra];
      const latestId = newSpectra.length > 0 ? newSpectra[0].id : prev.selectedSpectrumId;
      if (newSpectra.length > 0) autoRouteAnalysis(newSpectra[0]);
      return { ...prev, spectra: nextSpectra, selectedSpectrumId: latestId };
    });
    setActiveTab('spectra');
  }, []);

  const handleDeleteSpectrum = useCallback((id: string) => {
    setProject(prev => {
      const nextSpectra = prev.spectra.filter(s => s.id !== id);
      return { ...prev, spectra: nextSpectra, selectedSpectrumId: prev.selectedSpectrumId === id ? (nextSpectra.length > 0 ? nextSpectra[0].id : null) : prev.selectedSpectrumId };
    });
  }, []);

  const handleUpdateResults = useCallback((spectrumId: string, params: Partial<PlasmaParameters>) => {
    setProject(prev => {
      const currentRes = prev.results[spectrumId] || {};
      return { ...prev, results: { ...prev.results, [spectrumId]: { ...currentRes, ...params } } };
    });
  }, []);

  const updateGlobalEnv = (env: Partial<ProjectState['globalEnv']>) => setProject(prev => ({ ...prev, globalEnv: { ...prev.globalEnv, ...env } }));

  const analysisCategories = [
    { id: 'ai-strat', title: 'Strategic Advisor', icon: <Brain size={16} className="text-violet-400" />, modules: [{ id: 'ai-consult', name: 'Auto-Diagnostic Consultant' }] },
    { id: 'mol-suite', title: 'Molecular Hub (Tg)', icon: <FlaskConical size={16} className="text-cyan-400" />, modules: [{ id: 'molecule-synth', name: 'Synthesis (N2 / C2 / CN)' }, { id: 'boltzmann', name: 'Boltzmann (H2/OH/O2/Ar)' }] },
    { id: 'atomic-diag', title: 'Atomic Diag (ne)', icon: <Zap size={16} />, modules: [{ id: 'stark-h', name: 'Stark H Engine' }, { id: 'stark-ar', name: 'Stark Ar Engine (603 nm)' }] },
    { id: 'radiative', title: 'EM Parameters', icon: <Waves size={16} />, modules: [{ id: 'perm-argon', name: 'Argon Permittivity Engine' }] }
  ];

  return (
    <div className="flex h-screen w-full bg-[#0a0a0c] text-slate-200 overflow-hidden font-sans">
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab}
        analysisCategories={analysisCategories} expandedCategories={expandedCategories}
        toggleCategory={toggleCategory} selectedModuleId={selectedModuleId}
        setSelectedModuleId={setSelectedModuleId} project={project}
        updateGlobalEnv={updateGlobalEnv}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950/20">
        <header className="h-20 border-b border-slate-800 bg-[#0f1115]/50 flex items-center justify-between px-10 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-base font-medium text-slate-400">
              <Database size={20} className="text-emerald-500" /><span className="font-mono text-sm tracking-tight">STATION_ALPHA_CORE</span><ChevronRight size={18} className="opacity-30" />
              <span className="text-emerald-400 font-bold tracking-tight uppercase text-base">{activeTab} Module</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-all border border-slate-700"><Download size={18} /> Export fits</button>
            <button className="flex items-center gap-2 px-8 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-all shadow-lg active:scale-95">Excel Link</button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-10 relative scroll-smooth custom-scrollbar">
          <div className="max-w-7xl mx-auto pb-16">
            {activeTab === 'spectra' && <SpectraViewer spectrum={project.spectra.find(s => s.id === project.selectedSpectrumId)} allSpectra={project.spectra} onSelect={(id) => setProject(p => ({...p, selectedSpectrumId: id}))} onUpload={handleFileUpload} onDelete={handleDeleteSpectrum} />}
            {activeTab === 'analysis' && <AnalysisPipeline project={project} selectedModuleId={selectedModuleId} onUpdateResults={handleUpdateResults} />}
            {activeTab === 'dashboard' && <Dashboard project={project} />}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
