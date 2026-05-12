// STATUS-V2
import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { DATA_SOURCES } from '../services/DataService';

export function DataSourceStatus() {
  const [status, setStatus] = useState<"NIST LIVE" | "CACHED" | "BACKUP MODE" | "OFFLINE" | null>(null);
  const [cacheAge, setCacheAge] = useState<string>("Unknown");
  const [modalOpen, setModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>("Just now");
  const [mounted, setMounted] = useState(false);
  const lineCount = 145;
  const modalRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const formatAgo = (timestamp: number) => {
    const min = Math.floor((Date.now() - timestamp) / 60000);
    if (min < 60) return `${min}m ago`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getCacheInfo = () => {
    let newestCacheTime = 0;
    let fallbackAvailable = false;
    for (let i = 0; i < localStorage.length; i++) {
       const key = localStorage.key(i);
       if (key && key.startsWith("plasma-x-cache-")) {
          fallbackAvailable = true;
          try {
             const val = localStorage.getItem(key);
             if (val) {
                const parsed = JSON.parse(val);
                if (parsed && parsed.timestamp && parsed.timestamp > newestCacheTime) {
                   newestCacheTime = parsed.timestamp;
                }
             }
          } catch(e) {}
       }
    }
    return { newestCacheTime, fallbackAvailable };
  };

  const fetchStatus = async () => {
    setIsSyncing(true);
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      
      await fetch("https://physics.nist.gov/cgi-bin/ASD/lines1.pl", {
         method: 'HEAD',
         mode: 'no-cors',
         signal: controller.signal
      });
      clearTimeout(id);
      
      setStatus("NIST LIVE");
      setLastChecked("Just now");
    } catch (error) {
      const { newestCacheTime, fallbackAvailable } = getCacheInfo();
      if (fallbackAvailable && newestCacheTime > 0) {
         const ageMs = Date.now() - newestCacheTime;
         if (ageMs < 24 * 60 * 60 * 1000) {
            setStatus("CACHED");
            setCacheAge(formatAgo(newestCacheTime));
         } else {
            setStatus("BACKUP MODE");
         }
      } else {
         setStatus("OFFLINE");
      }
      setLastChecked("Just now");
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node) &&
          badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setModalOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    if (modalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [modalOpen]);

  if (!status) return null;

  const getConfig = () => {
    switch (status) {
      case "NIST LIVE":
        return {
          textColor: "text-[#00ff88]",
          dotColor: "bg-[#00ff88]",
          bgColor: "bg-[#00ff88]/5",
          borderColor: "border-[#00ff88]/20",
          text: "NIST LIVE",
          tooltip: "Data Source: NIST Live\nLast checked: " + lastChecked + "\nLines available: Full\nClick for details"
        };
      case "CACHED":
        return {
          textColor: "text-[#ffcc00]",
          dotColor: "bg-[#ffcc00]",
          bgColor: "bg-[#ffcc00]/5",
          borderColor: "border-[#ffcc00]/20",
          text: `CACHED ${cacheAge}`,
          tooltip: "Data Source: Local Cache\nLast sync: " + cacheAge + "\nClick for details"
        };
      case "BACKUP MODE":
        return {
          textColor: "text-[#ff8800]",
          dotColor: "bg-[#ff8800]",
          bgColor: "bg-[#ff8800]/5",
          borderColor: "border-[#ff8800]/20",
          text: "BACKUP MODE",
          tooltip: "Data Source: GitHub Vault\nNIST is unreachable\nClick for details"
        };
      case "OFFLINE":
      default:
        return {
          textColor: "text-[#ff3333]",
          dotColor: "bg-[#ff3333]",
          bgColor: "bg-[#ff3333]/5",
          borderColor: "border-[#ff3333]/20",
          text: "OFFLINE 145 lines",
          tooltip: "Data Source: Bundled Offline Data\nLines available: 145\nClick for details"
        };
    }
  };

  const config = getConfig();

  return (
    <div className="fixed bottom-5 right-5 z-[9999] font-mono flex flex-col items-end">
      {/* Tooltip */}
      <div className="group relative flex justify-end">
        <div className="absolute bottom-full right-0 mb-3 w-max max-w-[250px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
           <div className="bg-[#0a0a0f]/80 backdrop-blur-md rounded-xl border border-white/10 p-3 text-[11px] text-slate-300 shadow-2xl leading-relaxed whitespace-pre-wrap text-left">
              {config.tooltip}
           </div>
        </div>

        {/* Badge */}
        <button
          ref={badgeRef}
          onClick={() => setModalOpen(!modalOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 max-w-[180px] h-[28px] border",
            "bg-[#0a0a0f]/80 backdrop-blur-[10px]",
            "hover:scale-[1.02]",
            config.borderColor,
            !mounted && "translate-y-10 opacity-0",
            mounted && "translate-y-0 opacity-100"
          )}
          style={{ backgroundColor: 'rgba(10, 10, 15, 0.8)' }} // Base bg, utility will add the tint
        >
          {/* We use relative inside to overlay tint and base bg neatly */}
          <div className={cn("absolute inset-0 rounded-full", config.bgColor)} />
          <div className={cn("w-1.5 h-1.5 rounded-full relative z-10 animate-status-pulse", config.dotColor)} />
          <span className={cn("text-[11px] font-medium whitespace-nowrap relative z-10", config.textColor)}>
            {config.text}
          </span>
        </button>
      </div>

      {modalOpen && (
        <div 
          ref={modalRef}
          className="absolute bottom-[40px] right-0 w-[320px] rounded-xl border border-white/5 shadow-2xl overflow-hidden origin-bottom-right animate-in zoom-in-95 fade-in duration-150"
          style={{ backgroundColor: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(20px)' }}
        >
          <div className="flex items-center justify-between p-3 border-b border-white/5">
            <h3 className="text-[12px] font-bold text-white tracking-widest uppercase">Database Status</h3>
            <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4 flex flex-col gap-4 text-[12px]">
            <div className="flex gap-3">
              <div className="mt-1">
                {status === "NIST LIVE" ? "🟢" : "🔴"}
              </div>
              <div>
                <div className="font-bold text-white">NIST API {status === "NIST LIVE" ? "Online" : "Offline"}</div>
                <div className="text-slate-400 mt-0.5">Last checked: {lastChecked}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1">
                {status === "BACKUP MODE" ? "🟢" : "🟠"}
              </div>
              <div>
                <div className="font-bold text-white">GitHub Backup Ready</div>
                <div className="text-slate-400 mt-0.5">github.com/plasma-x-db</div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1">🟢</div>
              <div>
                <div className="font-bold text-white">Local Cache {lineCount} lines</div>
                <div className="text-slate-400 mt-0.5">H, He, Ar, N, O, Ne...</div>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-white/5 flex gap-2">
            <button 
              onClick={fetchStatus}
              disabled={isSyncing}
              className="flex-1 bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 rounded py-2 text-[12px] font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              Force Sync
            </button>
            <button 
              onClick={() => setModalOpen(false)}
              className="flex-1 bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 rounded py-2 text-[12px] font-medium text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
