
import React from 'react';
import { FlaskConical } from 'lucide-react';
import { ProjectState, PlasmaParameters } from '../types';
import BoltzmannEngine from './analysis/BoltzmannEngine';
import MoleculeSynthEngine from './analysis/MoleculeSynthEngine';
import StarkEngine from './analysis/StarkEngine';
import ArStarkEngine from './analysis/ArStarkEngine';
import AiConsultant from './analysis/AiConsultant';
import PermittivityEngine from './analysis/PermittivityEngine';

interface AnalysisPipelineProps {
  project: ProjectState;
  selectedModuleId: string;
  onUpdateResults: (spectrumId: string, params: Partial<PlasmaParameters>) => void;
}

const AnalysisPipeline: React.FC<AnalysisPipelineProps> = ({ project, selectedModuleId, onUpdateResults }) => {
  const renderEngine = () => {
    switch (selectedModuleId) {
      case 'molecule-synth':
        return <MoleculeSynthEngine project={project} onUpdateResults={onUpdateResults} />;
      
      case 'boltzmann':
        return <BoltzmannEngine project={project} selectedModuleId={selectedModuleId} onUpdateResults={onUpdateResults} />;
      
      case 'stark-h':
        return <StarkEngine project={project} selectedModuleId={selectedModuleId} onUpdateResults={onUpdateResults} />;

      case 'stark-ar':
        return <ArStarkEngine project={project} onUpdateResults={onUpdateResults} />;

      case 'perm-argon':
        return <PermittivityEngine project={project} onUpdateResults={onUpdateResults} />;

      case 'ai-consult':
        return <AiConsultant project={project} onUpdateResults={onUpdateResults} />;

      default:
        return (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center text-slate-500 text-center min-h-[500px]">
            <FlaskConical size={48} className="mb-4 opacity-10" />
            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-widest">Diagnostic Ready</h3>
            <p className="text-xs max-w-sm">Select a diagnostic module from the Molecular Hub to begin advanced analysis.</p>
          </div>
        );
    }
  };

  return (
    <div className="h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      {renderEngine()}
    </div>
  );
};

export default AnalysisPipeline;
