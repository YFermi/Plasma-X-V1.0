import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Atom } from 'lucide-react';

export function SkeletonLoader({ type = 'card', className }: { type?: 'card' | 'table' | 'chart', className?: string }) {
  const messages = [
    "Scanning quantum states...",
    "Resolving fine structure...",
    "Calibrating wavelengths...",
    "Coupling radiation transport...",
    "Initializing Boltzmann solver..."
  ];
  
  const [msgIdx, setMsgIdx] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setMsgIdx(prev => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={cn("glass-panel p-8 min-h-[300px] flex flex-col items-center justify-center space-y-6 relative overflow-hidden", className)}>
      <div className="absolute inset-0 skeleton-shimmer pointer-events-none" />
      
      <motion.div
        animate={{ 
          rotate: 360,
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      >
        <Atom className="w-16 h-16 text-plasma-cyan" />
      </motion.div>

      <div className="space-y-3 text-center z-10">
        <p className="text-xs font-display text-white uppercase tracking-[0.3em] scanning-text">
          {messages[msgIdx]}
        </p>
        <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden mx-auto">
          <motion.div 
            className="h-full bg-plasma-cyan"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>

      {type === 'table' && (
        <div className="w-full space-y-4 pt-8">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-4">
              <div className="flex-1 h-3 bg-white/5 rounded-full" />
              <div className="w-24 h-3 bg-white/5 rounded-full" />
              <div className="w-12 h-3 bg-white/5 rounded-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
