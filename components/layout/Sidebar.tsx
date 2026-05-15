
import React from 'react';
import { Sparkles, Layers, Cpu, BarChart3, ChevronRight, ChevronDown, Wind } from 'lucide-react';
import PressureConverter from '../PressureConverter';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  analysisCategories: any[];
  expandedCategories: string[];
  toggleCategory: (id: string) => void;
  selectedModuleId: string;
  setSelectedModuleId: (id: string) => void;
  project: any;
  updateGlobalEnv: (env: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, setActiveTab, analysisCategories, expandedCategories, 
  toggleCategory, selectedModuleId, setSelectedModuleId, project, updateGlobalEnv 
}) => {
  return (
    <aside className="w-[330px] border-r border-slate-800 flex flex-col bg-[#0f1115] shrink-0 shadow-2xl z-20">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-lg">
          <Sparkles className="text-emerald-400 w-8 h-8" />
        </div>
        <div>
          <h1 className="font-bold text-2xl tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent leading-tight">
            GlowLogic
          </h1>
          <p className="text-[12px] text-slate-500 font-bold uppercase tracking-widest leading-none">By Dr.Yo</p>
        </div>
      </div>

      <nav className="flex-1 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-6 py-2 text-[12px] font-bold text-slate-600 uppercase tracking-[0.2em]">Core Engines</p>
        <NavItem icon={<Layers size={22} />} label="Spectra Explorer" active={activeTab === 'spectra'} onClick={() => setActiveTab('spectra')} />
        <NavItem icon={<Cpu size={22} />} label="Analysis Pipeline" active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} hasSubmenu expanded={activeTab === 'analysis'} />
        {activeTab === 'analysis' && (
          <div className="ml-4 pl-4 border-l border-slate-800/50 space-y-1">
            {analysisCategories.map(cat => (
              <div key={cat.id} className="space-y-0.5">
                <button onClick={() => toggleCategory(cat.id)} className="w-full flex items-center justify-between px-3 py-3 text-[12px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300">
                  <span className="flex items-center gap-2">{cat.icon}{cat.title}</span>
                  {expandedCategories.includes(cat.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {expandedCategories.includes(cat.id) && (
                  <div className="ml-3 space-y-0.5 animate-in fade-in duration-200">
                    {cat.modules.map((mod: any) => (
                      <button key={mod.id} onClick={() => setSelectedModuleId(mod.id)} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-[13px] font-medium transition-all ${selectedModuleId === mod.id ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                        <div className={`w-2 h-2 rounded-full ${selectedModuleId === mod.id ? 'bg-emerald-400' : 'bg-transparent'}`} />
                        {mod.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <NavItem icon={<BarChart3 size={22} />} label="Live Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
      </nav>

      <div className="p-4 border-t border-slate-800/40 space-y-4 bg-slate-950/20">
         <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-slate-500 uppercase flex items-center gap-1.5"><Wind size={14} className="text-cyan-500" /> Environment</span>
              <span className="text-[11px] font-mono text-cyan-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">{(project.globalEnv.pressure / 101325).toFixed(2) + ' atm'}</span>
            </div>
            <div className="flex flex-col gap-2">
               <div className="flex justify-between items-center text-[12px] font-medium text-slate-400">
                  <span>Pressure (Pa)</span>
                  <input 
                    type="number" 
                    value={project.globalEnv.pressure} 
                    onChange={(e) => updateGlobalEnv({ pressure: parseInt(e.target.value) || 0 })}
                    className="bg-transparent text-right outline-none text-emerald-400 font-mono w-28 text-sm" 
                  />
               </div>
            </div>
         </div>
         <PressureConverter 
           currentGlobalPressure={project.globalEnv.pressure} 
           onSync={(pa) => updateGlobalEnv({ pressure: Math.round(pa) })} 
         />
      </div>
    </aside>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode, label: string, active?: boolean, onClick: () => void, hasSubmenu?: boolean, expanded?: boolean }> = ({ icon, label, active, onClick, hasSubmenu, expanded }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-6 py-4 transition-all text-[17px] font-medium ${
      active ? 'bg-emerald-500/10 text-emerald-400 border-r-4 border-emerald-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
    }`}
  >
    <div className="flex items-center gap-4">{icon}{label}</div>
    {hasSubmenu && (expanded ? <ChevronDown size={18} className="opacity-50" /> : <ChevronRight size={18} className="opacity-50" />)}
  </button>
);

export default Sidebar;
