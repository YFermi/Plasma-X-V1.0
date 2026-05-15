import React from 'react';
import { motion } from 'motion/react';
import { PeriodicTable } from './PeriodicTable';
import { ElementMetadata } from '../data/nist_samples';
import { SkeletonLoader } from './LoadingSkeleton';
import { 
  Zap, 
  LineChart, 
  Search, 
  Atom, 
  Activity, 
  Database,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardProps {
  onNavigate: (view: string) => void;
  onElementSelect?: (symbol: string) => void; // FIX-2
}

export function Dashboard({ onNavigate, onElementSelect }: DashboardProps) { // FIX-2
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <div className="space-y-8"><SkeletonLoader type="chart" /></div>;
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden pt-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <h2 className="text-4xl font-display font-black text-white glow-text-cyan tracking-tight italic">ATOMIC DATA EXPLORER</h2>
            <p className="text-slate-400 font-mono text-sm mt-2 tracking-widest uppercase opacity-70">NIST Atomic Spectra Data Repository Access v3000.1</p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-plasma-cyan px-4 py-2 glass-panel border-plasma-cyan/20">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span>CORE QUANTUM SYNC: ACTIVE</span>
          </div>
        </div>

        <PeriodicTable onElementClick={(el) => { // FIX-2
          onElementSelect?.(el.symbol); // FIX-2
          onNavigate('search'); // FIX-2
        }} /> {/* FIX-2 */}
      </motion.section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: <Search className="w-6 h-6 text-plasma-cyan" />, title: "Line Finder", desc: "Identify elements from wavelengths in spectral records", tab: 'search' },
          { icon: <Atom className="w-6 h-6 text-plasma-cyan" />, title: "Molecules", desc: "Diatomic spectral bands (OH, N2, CN, etc.)", tab: 'molecules' },
          { icon: <LineChart className="w-6 h-6 text-plasma-magenta" />, title: "Boltzmann Plot", desc: "Analyze Te from relative intensities", tab: 'boltzmann' },
          { icon: <Zap className="w-6 h-6 text-plasma-amber" />, title: "Spectrum Synth", desc: "Simulate real-time LTE plasma emission", tab: 'simulator' },
          { icon: <Activity className="w-6 h-6 text-green-400" />, title: "Diagnostics", desc: "Advanced Te and ne measurement advisors", tab: 'diagnostics' }
        ].map((item, i) => (
          <QuickActionCard 
            key={i}
            icon={item.icon}
            title={item.title}
            description={item.desc}
            onClick={() => onNavigate(item.tab)}
            index={i}
          />
        ))}
      </section>

      {/* Recent Activity */}
      <motion.section 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="glass-panel p-6 border-white/5"
      >
        <h3 className="text-xs font-display text-slate-500 tracking-[0.3em] uppercase mb-6 flex items-center gap-3">
          <Database className="w-4 h-4" />
          Recent Spectral Queries
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <motion.div 
               key={i}
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.8 + i * 0.1 }}
               className="flex items-center justify-between p-3 border border-white/5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-black/40 border border-white/10 text-plasma-cyan font-mono text-xs shadow-inner">
                  480.602 nm
                </div>
                <div>
                  <div className="text-sm font-bold text-white uppercase tracking-tight">Argon II Transition</div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">3s23p4(3P)4s 4P → 3s23p4(3P)4p 4P°</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <span className="text-[10px] font-mono text-slate-600">2026-05-08 17:22</span>
                 <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-plasma-cyan transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

function QuickActionCard({ icon, title, description, onClick, index }: { icon: React.ReactNode, title: string, description: string, onClick: () => void, index: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 + index * 0.1, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="glass-panel p-6 border-white/5 cursor-pointer flex flex-col items-center text-center group"
    >
      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-4 group-hover:border-plasma-cyan/30 transition-colors shadow-inner">
        {icon}
      </div>
      <h3 className="font-display text-white mb-2 tracking-wide text-sm">{title}</h3>
      <p className="text-xs text-slate-400 line-clamp-2 px-2 leading-relaxed">{description}</p>
      
      <div className="mt-6 w-8 h-8 rounded-full border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="w-3 h-3 text-plasma-cyan" />
      </div>
    </motion.div>
  );
}
