import React, { useState, useRef, useEffect } from 'react';
import { 
  Atom, 
  Search, 
  LineChart, 
  Calculator, 
  Activity, 
  Settings, 
  Cpu, 
  Zap, 
  Database,
  Send,
  User,
  ShieldCheck,
  ChevronRight,
  Maximize2,
  LayoutDashboard,
  Menu,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { geminiService } from './services/geminiService';
import { spectralSolver } from './services/spectralSolver';
import { ChatMessage } from './types';
import { SpectrumVisualizer } from './components/SpectrumVisualizer';
import { 
  SearchResultCard, 
  LineTableCard, 
  BoltzmannMiniPlot, 
  ConversionCard, 
  DiagnosticRatioCard,
  ComparisonCard
} from './components/ChatCards';
import { cn } from './lib/utils';
import { PlasmaBackground } from './components/PlasmaBackground';
import { SoundProvider, useSound } from './contexts/SoundContext';

// Page Components
import { Dashboard } from './components/Dashboard';
import { LineSearch } from './components/LineSearch';
import { MoleculeSearch } from './components/MoleculeSearch';
import { BoltzmannTool } from './components/BoltzmannTool';
import { SpectrumSimulator } from './components/SpectrumSimulator';
import { DataSourceStatus } from './components/DataSourceStatus';
// NIST-LIVE-INTEGRATION
import { NistSearch } from './components/NistSearch';
import { NistStatusDot } from './components/NistStatusDot';
import StarkCalculator from './components/StarkCalculator'; // RESTORED

export default function App() {
  return (
    <SoundProvider>
      <AppContent />
    </SoundProvider>
  );
}

function Clock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Timebase: {currentTime.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }).replace(/-/g, '.')}</span>
      <span className="text-xs font-mono text-plasma-cyan glow-text-cyan">{currentTime.toLocaleTimeString('en-US', { timeZone: 'Europe/Paris', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
    </div>
  );
}

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [boltzmannLines, setBoltzmannLines] = useState<any[]>([]);
  const [initialSearchQuery, setInitialSearchQuery] = useState(''); // FIX-2
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { playClick, playData, playSuccess } = useSound();

  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const content = String(children).replace(/\n$/, '');
      
      if (!inline && match && match[1] === 'spectrum') {
        try {
          const data = JSON.parse(content);
          return (
            <div className="my-4">
              <h4 className="text-[10px] font-bold text-plasma-cyan mb-2 uppercase tracking-widest">Synthetic Spectrum Simulation</h4>
              <SpectrumVisualizer lines={data} />
            </div>
          );
        } catch (e) {
          return <pre className={cn("bg-black/40 border border-white/10 p-4 rounded-xl overflow-x-auto my-6 shadow-inner", className)} {...props}>{children}</pre>;
        }
      }
      return !inline && match ? (
        <pre className={cn("bg-black/40 border border-white/10 p-4 rounded-xl overflow-x-auto my-6 shadow-inner", className)} {...props}>
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code className={cn("bg-white/10 px-1.5 py-0.5 rounded font-mono text-plasma-amber", className)} {...props}>
          {children}
        </code>
      );
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'model',
          content: '## ⚛️ PLASMA-X CORE ONLINE\nGreetings, researcher. I am synced with NIST repositories. \n\nHow can I enhance your diagnostics today?',
          timestamp: Date.now()
        }
      ]);
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);
    playClick();

    try {
      // 1. Try local spectral solver first
      const localResult = spectralSolver.solve(currentInput);
      
      if (localResult) {
        setTimeout(() => {
          playData();
          setMessages(prev => [...prev, {
            role: 'model',
            content: localResult.content,
            solverResult: {
              type: localResult.type,
              data: localResult.data
            },
            timestamp: Date.now()
          }]);
          setIsTyping(false);
        }, 500);
        return;
      }

      // 2. Fallback to Gemini if no local intent matched
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const response = await geminiService.chat(currentInput, history);
      
      playData();
      const aiMsg: ChatMessage = {
        role: 'model',
        content: response || "I encountered a spectral decoupling error.",
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'model',
        content: "🚨 **SYSTEM ERROR:** Core reasoning module disconnected.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentView} onElementSelect={setInitialSearchQuery} />; // FIX-2
      case 'search': return <LineSearch initialQuery={initialSearchQuery} 
        onAddLine={(line) => {
          setBoltzmannLines(prev => [...prev, line]);
          setCurrentView('boltzmann');
        }}
        onAddLines={(lines) => {
          setBoltzmannLines(prev => [...prev, ...lines]);
          setCurrentView('boltzmann');
        }}
      />;
      case 'nist_search': return <NistSearch 
        onAddLines={(lines) => {
          setBoltzmannLines(prev => [...prev, ...lines]);
          setCurrentView('boltzmann');
        }}
      />;
      case 'molecules': return <MoleculeSearch />;
      case 'boltzmann': return <BoltzmannTool externalLines={boltzmannLines} onClearExternal={() => setBoltzmannLines([])} />;
      case 'stark': return <StarkCalculator />; // RESTORED
      case 'simulator': return <SpectrumSimulator />;
      default: return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
          <Atom className="w-24 h-24 text-plasma-cyan/20 animate-spin-slow" />
          <h2 className="text-2xl font-display text-white uppercase tracking-[0.3em]">Holographic Panel Offline</h2>
          <p className="text-slate-500 font-mono text-sm uppercase tracking-widest leading-relaxed">
            Module {currentView.toUpperCase()} is under terminal reconstruction.<br/>Please revert to Dashboard interface.
          </p>
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="px-6 py-2 bg-plasma-cyan/10 border border-plasma-cyan/20 rounded-lg text-xs font-bold text-plasma-cyan uppercase tracking-widest hover:bg-plasma-cyan/20 transition-all"
          >
            Return to Core
          </button>
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen w-full bg-plasma-bg overflow-hidden relative">
      <PlasmaBackground />
      <div className="scanline" />
      
      {/* Navigation Sidebar */}
      <motion.aside 
        animate={{ width: sidebarOpen ? 280 : 80 }}
        className="border-r border-white/5 bg-slate-950/40 backdrop-blur-xl flex flex-col z-20 relative group"
      >
        <div className="p-6 h-24 flex items-center justify-between overflow-hidden">
          <AnimatePresence mode="wait">
            {sidebarOpen ? (
              <motion.div 
                key="logo-full"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-4"
              >
                <div className="p-2 bg-plasma-cyan/10 rounded-xl border border-plasma-cyan/20 plasma-glow-cyan animate-pulse">
                  <Zap className="w-6 h-6 text-plasma-cyan" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-2xl font-display font-black text-white glow-text-cyan tracking-tighter leading-none">PLASMA-X</h1>
                  <p className="text-[9px] font-mono tracking-widest text-plasma-cyan/60 uppercase mt-1">By: Dr.Yo Fermi</p>
                </div>
              </motion.div>
            ) : (
                <motion.div 
                  key="logo-short"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mx-auto p-2 bg-plasma-cyan/10 rounded-xl border border-plasma-cyan/20"
                >
                  <Zap className="w-6 h-6 text-plasma-cyan" />
                </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-hidden">
          <SidebarItem 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')}
            expanded={sidebarOpen}
          />
          <SidebarItem 
            icon={<Search className="w-5 h-5" />} 
            label="Line Search" 
            active={currentView === 'search'} 
            onClick={() => setCurrentView('search')}
            expanded={sidebarOpen}
          />
          <SidebarItem 
            icon={<Database className="w-5 h-5" />} 
            label="NIST Live" // NIST-LIVE-INTEGRATION
            rightElement={<NistStatusDot />} // NIST-LIVE-INTEGRATION
            active={currentView === 'nist_search'} 
            onClick={() => setCurrentView('nist_search')}
            expanded={sidebarOpen}
          />
          <SidebarItem 
            icon={<Atom className="w-5 h-5" />} 
            label="Molecular Bands" 
            active={currentView === 'molecules'} 
            onClick={() => setCurrentView('molecules')}
            expanded={sidebarOpen}
          />
          <SidebarItem 
            icon={<LineChart className="w-5 h-5" />} 
            label="Boltzmann Tool" 
            active={currentView === 'boltzmann'}
            onClick={() => setCurrentView('boltzmann')}
            expanded={sidebarOpen}
          />
          <SidebarItem 
            icon={<Zap className="w-5 h-5" />} 
            label="⚡ Stark nₑ" 
            active={currentView === 'stark'}
            onClick={() => setCurrentView('stark')}
            expanded={sidebarOpen}
          /> {/* RESTORED */}
          <SidebarItem 
            icon={<Activity className="w-5 h-5" />} 
            label="Diagnostics" 
            onClick={() => setCurrentView('diagnostics')}
            expanded={sidebarOpen}
          />
          <SidebarItem 
            icon={<Calculator className="w-5 h-5" />} 
            label="Simulator" 
            onClick={() => setCurrentView('simulator')}
            expanded={sidebarOpen}
          />
          
          <div className="pt-6 mt-6 border-t border-white/5">
             <SidebarItem 
              icon={<Settings className="w-5 h-5" />} 
              label="Settings" 
              onClick={() => setCurrentView('settings')}
              expanded={sidebarOpen}
            />
          </div>
        </nav>

        <div className="p-6 border-t border-white/5 overflow-hidden">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-plasma-magenta/20 border border-plasma-magenta/30 flex items-center justify-center flex-shrink-0 animate-pulse">
                <User className="w-5 h-5 text-plasma-magenta" />
             </div>
             {sidebarOpen && (
               <div className="flex-1 overflow-hidden">
                 <p className="text-sm font-bold text-white truncate">Dr. Youcef Fermi</p>
                 <p className="text-[10px] text-slate-500 font-mono tracking-widest truncate uppercase">Senior Physicist</p>
               </div>
             )}
          </div>
        </div>

        {/* Sidebar Toggle Button */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-24 w-6 h-6 bg-plasma-bg border border-white/10 rounded-full flex items-center justify-center hover:border-plasma-cyan/50 transition-colors z-30"
        >
          {sidebarOpen ? <X className="w-3 h-3 text-slate-400" /> : <Menu className="w-3 h-3 text-slate-400" />}
        </button>
      </motion.aside>

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-24 border-b border-white/5 flex items-center justify-between px-10 bg-slate-950/20 backdrop-blur-md z-10">
          <div className="flex items-center gap-6">
             <Clock />
             <div className="w-px h-8 bg-white/5" />
             <button className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-plasma-cyan/30 text-slate-400 hover:text-white transition-all">
                <Maximize2 className="w-5 h-5" />
             </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto custom-scrollbar px-10 pt-10 relative">
           <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-[1400px] mx-auto h-full"
              >
                {renderView()}
              </motion.div>
           </AnimatePresence>

           {/* Floating FAB for AI Chat */}
           <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setChatOpen(!chatOpen)}
            className="fixed bottom-10 right-10 w-16 h-16 rounded-full bg-plasma-magenta border border-plasma-magenta/50 plasma-glow-magenta flex items-center justify-center z-40 group overflow-hidden"
          >
             <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-white/20" />
             <Zap className={cn("w-8 h-8 text-white relative z-10 transition-transform duration-500", chatOpen && "rotate-180")} />
             <div className="absolute inset-0 shimmer opacity-30 group-hover:opacity-100" />
          </motion.button>
        </section>

        {/* Chat Drawer Side Panel */}
        <AnimatePresence>
          {chatOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setChatOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              />
              <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] lg:w-[500px] bg-slate-950/90 backdrop-blur-2xl border-l border-white/5 z-50 flex flex-col shadow-[-40px_0_100px_rgba(0,0,0,0.8)]"
              >
                <header className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-plasma-magenta/10 rounded-xl border border-plasma-magenta/30">
                      <Zap className="w-5 h-5 text-plasma-magenta" />
                    </div>
                    <div>
                      <h3 className="text-lg font-display text-white tracking-widest uppercase">PLASMA-X INFERENCE</h3>
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em] mt-1">NIST-Gemini Neural Sync</p>
                    </div>
                  </div>
                  <button onClick={() => setChatOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  <AnimatePresence mode="popLayout">
                    {messages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex flex-col gap-2 max-w-[90%]",
                          msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div className={cn(
                          "p-4 rounded-2xl glass-panel relative",
                          msg.role === 'user' 
                            ? "bg-plasma-magenta/10 border-plasma-magenta/30 text-white" 
                            : "bg-slate-900 border-white/5 text-slate-200"
                        )}>
                          <div className={cn("markdown-body", msg.role === 'user' ? "text-right" : "text-left")}>
                            <ReactMarkdown 
                              remarkPlugins={[remarkMath]} 
                              rehypePlugins={[rehypeKatex]}
                              components={components}
                            >
                              {msg.content}
                            </ReactMarkdown>

                            {/* Render Custom Solver Result Cards */}
                            {msg.solverResult && (
                              <div className="mt-4">
                                {msg.solverResult.type === 'search' && <SearchResultCard data={msg.solverResult.data} />}
                                {msg.solverResult.type === 'list' && <LineTableCard data={msg.solverResult.data} />}
                                {msg.solverResult.type === 'boltzmann' && <BoltzmannMiniPlot data={msg.solverResult.data} />}
                                {msg.solverResult.type === 'conversion' && <ConversionCard data={msg.solverResult.data} />}
                                {msg.solverResult.type === 'diagnostic' && <DiagnosticRatioCard data={msg.solverResult.data} />}
                                {msg.solverResult.type === 'comparison' && <ComparisonCard data={msg.solverResult.data} />}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {isTyping && (
                    <div className="flex flex-col gap-2 items-start">
                      <div className="glass-panel bg-slate-900 border-plasma-cyan/30 p-4 rounded-2xl">
                        <div className="flex gap-2">
                          <div className="w-1.5 h-1.5 bg-plasma-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-plasma-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-plasma-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          <span className="text-[10px] text-plasma-cyan font-bold tracking-widest ml-2 uppercase animate-pulse">Scanning NIST Spectrum...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-6 border-t border-white/5">
                     <SuggestionChip label="Strongest Ar-II lines 400-500nm" onClick={(v) => setInput(v)} />
                     <SuggestionChip label="Calculate Te from 5 lines" onClick={(v) => setInput(v)} />
                     <SuggestionChip label="Grotrian diagram for He-I" onClick={(v) => setInput(v)} />
                     <SuggestionChip label="Hydrogen line ratios for ne" onClick={(v) => setInput(v)} />
                  </div>
                  <div ref={chatEndRef} />
                </div>

                <div className="p-6 border-t border-white/5 bg-black/40">
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-plasma-magenta/40 to-plasma-cyan/40 rounded-xl blur opacity-20 group-focus-within:opacity-100 transition duration-500" />
                    <div className="relative flex items-center bg-black border border-white/10 rounded-xl p-1 shadow-2xl">
                      <input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Neural interface active..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-4 placeholder:text-slate-700 text-white font-mono"
                      />
                      <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="w-10 h-10 flex items-center justify-center bg-plasma-magenta/10 hover:bg-plasma-magenta/20 border border-plasma-magenta/20 rounded-lg transition-all active:scale-95 disabled:opacity-30 group"
                      >
                        <Send className="w-4 h-4 text-plasma-magenta group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Global Bottom Status Bar */}
        <footer className="h-10 border-t border-white/5 flex items-center justify-between px-10 bg-slate-950/40 backdrop-blur-md z-10 shrink-0">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 group cursor-help">
                 <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                 <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">Data Integrity: Optimal</span>
              </div>
              <div className="flex items-center gap-2 group cursor-help">
                 <Cpu className="w-3.5 h-3.5 text-plasma-cyan" />
                 <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">Load: 14%</span>
              </div>
           </div>
           <div className="flex items-center gap-4 text-[9px] font-mono text-slate-600 uppercase tracking-tighter">
              <span>NIST ASD v5.9 Sync</span>
              <div className="w-px h-2 bg-white/5" />
              <span>Session: Q-Flux-8842</span>
           </div>
        </footer>
      </main>
      <DataSourceStatus />
    </div>
  );
}

import { Ripple } from './components/Ripple';

// NIST-LIVE-INTEGRATION
function SidebarItem({ icon, label, active = false, onClick, expanded = true, rightElement }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, expanded?: boolean, rightElement?: React.ReactNode }) {
  const { playClick } = useSound();
  return (
    <div 
      onClick={() => {
        playClick();
        onClick?.();
      }}
      className={cn(
        "flex items-center rounded-xl cursor-pointer transition-all duration-300 relative group overflow-hidden border whitespace-nowrap",
        active 
          ? "bg-plasma-cyan/10 border-plasma-cyan/30 text-plasma-cyan plasma-glow-cyan" 
          : "text-slate-500 border-transparent hover:bg-white/5 hover:text-white",
        expanded ? "px-4 py-3 gap-4 h-12 w-full" : "w-12 h-12 justify-center p-0 mx-auto"
      )}
    >
      <Ripple />
      <div className={cn("transition-transform duration-300 relative z-10", active && "scale-110")}>
        {icon}
      </div>
      {expanded && (
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2 relative z-10">
          <span className="text-xs font-display font-medium tracking-widest uppercase truncate">{label}</span>
          {rightElement}
        </div>
      )}
      {!expanded && active && (
        <div className="absolute right-0 w-1 h-6 bg-plasma-cyan rounded-l-full shadow-[0_0_10px_var(--color-plasma-cyan)]" />
      )}
      {!expanded && rightElement && (
        <div className="absolute top-2 right-2">
          {rightElement}
        </div>
      )}
      {active && (
        <div className="absolute inset-0 shimmer opacity-20 pointer-events-none" />
      )}
    </div>
  );
}

function SuggestionChip({ label, onClick }: { label: string, onClick: (v: string) => void }) {
  return (
    <button 
      onClick={() => onClick(label)}
      className="p-3 text-left bg-white/5 border border-white/5 rounded-xl text-[10px] text-slate-400 font-mono uppercase tracking-widest leading-relaxed hover:border-plasma-cyan/30 hover:text-white transition-all group"
    >
      <div className="flex items-center gap-2 mb-1">
        <Plus className="w-3 h-3 text-plasma-cyan opacity-50 group-hover:opacity-100" />
        <span className="text-[8px] font-bold text-plasma-cyan/50 uppercase group-hover:text-plasma-cyan">Neural Prompt</span>
      </div>
      {label}
    </button>
  );
}

function DiagnosticProgress({ label, value, percent, color }: { label: string, value: string, percent: number, color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1.5 font-medium">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-mono">{value}</span>
      </div>
      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          className="h-full rounded-full" 
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
    </div>
  );
}
