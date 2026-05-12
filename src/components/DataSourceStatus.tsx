import React, { useState, useEffect } from 'react'; // STATUS-COMPONENT
import { DATA_SOURCES, checkDataSourceStatus, getLastSyncTime } from '../services/DataService'; // STATUS-COMPONENT
import { Activity, Database, Server, WifiOff, RefreshCw, X, ExternalLink, HelpCircle } from 'lucide-react'; // STATUS-COMPONENT
import { cn } from '../lib/utils'; // STATUS-COMPONENT

export function DataSourceStatus() { // STATUS-COMPONENT
  const [status, setStatus] = useState<any>(null); // STATUS-COMPONENT
  const [modalOpen, setModalOpen] = useState(false); // STATUS-COMPONENT
  const [isSyncing, setIsSyncing] = useState(false); // STATUS-COMPONENT
  const [lastSync, setLastSync] = useState<string | null>(getLastSyncTime()); // STATUS-COMPONENT

  const fetchStatus = async () => { // STATUS-COMPONENT
    setIsSyncing(true); // STATUS-COMPONENT
    try { // STATUS-COMPONENT
      const currentStatus = await checkDataSourceStatus(); // STATUS-COMPONENT
      setStatus(currentStatus); // STATUS-COMPONENT
      setLastSync(currentStatus.last_successful_fetch); // STATUS-COMPONENT
    } catch (error) { // STATUS-COMPONENT
      console.error(error); // STATUS-COMPONENT
    } // STATUS-COMPONENT
    setIsSyncing(false); // STATUS-COMPONENT
  }; // STATUS-COMPONENT

  useEffect(() => { // STATUS-COMPONENT
    fetchStatus(); // STATUS-COMPONENT
    const interval = setInterval(fetchStatus, 60000); // STATUS-COMPONENT
    return () => clearInterval(interval); // STATUS-COMPONENT
  }, []); // STATUS-COMPONENT

  if (!status) return null; // STATUS-COMPONENT

  const renderBadgeContent = () => { // STATUS-COMPONENT
    switch (status.active_source) { // STATUS-COMPONENT
      case DATA_SOURCES.NIST_LIVE: // STATUS-COMPONENT
        return { // STATUS-COMPONENT
          color: 'text-[#00ff88]', // STATUS-COMPONENT
          borderColor: 'border-[#00ff88]/30', // STATUS-COMPONENT
          bgColor: 'bg-[#00ff88]/10', // STATUS-COMPONENT
          icon: <Activity className="w-3.5 h-3.5" />, // STATUS-COMPONENT
          label: 'NIST LIVE', // STATUS-COMPONENT
          subtext: lastSync && lastSync !== 'Never' ? `Last sync: ${(Date.now() - new Date(lastSync).getTime()) < 60000 ? 'Just now' : Math.floor((Date.now() - new Date(lastSync).getTime()) / 60000) + ' min ago'}` : '' // STATUS-COMPONENT
        }; // STATUS-COMPONENT
      case DATA_SOURCES.CLOUDFLARE_CACHE: // STATUS-COMPONENT
        return { // STATUS-COMPONENT
          color: 'text-[#ffcc00]', // STATUS-COMPONENT
          borderColor: 'border-[#ffcc00]/30', // STATUS-COMPONENT
          bgColor: 'bg-[#ffcc00]/10', // STATUS-COMPONENT
          icon: <Database className="w-3.5 h-3.5" />, // STATUS-COMPONENT
          label: 'CACHED', // STATUS-COMPONENT
          subtext: lastSync && lastSync !== 'Never' ? `Updated: ${new Date(lastSync).toLocaleDateString()}` : '' // STATUS-COMPONENT
        }; // STATUS-COMPONENT
      case DATA_SOURCES.GITHUB_BACKUP: // STATUS-COMPONENT
        return { // STATUS-COMPONENT
          color: 'text-[#ff8800]', // STATUS-COMPONENT
          borderColor: 'border-[#ff8800]/30', // STATUS-COMPONENT
          bgColor: 'bg-[#ff8800]/10', // STATUS-COMPONENT
          icon: <Server className="w-3.5 h-3.5" />, // STATUS-COMPONENT
          label: 'BACKUP MODE', // STATUS-COMPONENT
          subtext: 'Using github.com/plasma-x-database' // STATUS-COMPONENT
        }; // STATUS-COMPONENT
      default: // STATUS-COMPONENT
        return { // STATUS-COMPONENT
          color: 'text-[#ff3333]', // STATUS-COMPONENT
          borderColor: 'border-[#ff3333]/30', // STATUS-COMPONENT
          bgColor: 'bg-[#ff3333]/10', // STATUS-COMPONENT
          icon: <WifiOff className="w-3.5 h-3.5" />, // STATUS-COMPONENT
          label: 'OFFLINE', // STATUS-COMPONENT
          subtext: '145 lines available' // STATUS-COMPONENT
        }; // STATUS-COMPONENT
    } // STATUS-COMPONENT
  }; // STATUS-COMPONENT

  const badgeContent = renderBadgeContent(); // STATUS-COMPONENT

  return ( // STATUS-COMPONENT
    <> // STATUS-COMPONENT
      <div className="relative z-50"> // STATUS-COMPONENT
        <button // STATUS-COMPONENT
          onClick={() => setModalOpen(true)} // STATUS-COMPONENT
          className={cn( // STATUS-COMPONENT
            "flex flex-col items-start px-3 py-1.5 rounded bg-black/60 backdrop-blur-md border text-left transition-all hover:bg-black/80", // STATUS-COMPONENT
            badgeContent.borderColor, // STATUS-COMPONENT
            isSyncing && "animate-pulse" // STATUS-COMPONENT
          )} // STATUS-COMPONENT
        > // STATUS-COMPONENT
          <div className={cn("flex items-center gap-2 text-[10px] font-bold tracking-widest", badgeContent.color)}> // STATUS-COMPONENT
            {badgeContent.icon} {badgeContent.label} // STATUS-COMPONENT
          </div> // STATUS-COMPONENT
          {badgeContent.subtext && ( // STATUS-COMPONENT
            <div className="text-[9px] font-mono text-slate-400 mt-0.5"> // STATUS-COMPONENT
              {badgeContent.subtext} // STATUS-COMPONENT
            </div> // STATUS-COMPONENT
          )} // STATUS-COMPONENT
        </button> // STATUS-COMPONENT
      </div> // STATUS-COMPONENT

      {modalOpen && ( // STATUS-COMPONENT
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"> // STATUS-COMPONENT
          <div className="bg-slate-900 border border-white/10 rounded-xl max-w-md w-full overflow-hidden flex flex-col"> // STATUS-COMPONENT
            <div className="flex items-center justify-between p-4 border-b border-white/10"> // STATUS-COMPONENT
              <h2 className="text-sm font-display tracking-widest text-white uppercase flex items-center gap-2"> // STATUS-COMPONENT
                <Database className="w-4 h-4 text-plasma-cyan" /> Data Source Status // STATUS-COMPONENT
              </h2> // STATUS-COMPONENT
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"> // STATUS-COMPONENT
                <X className="w-4 h-4" /> // STATUS-COMPONENT
              </button> // STATUS-COMPONENT
            </div> // STATUS-COMPONENT
            
            <div className="p-6 space-y-6"> // STATUS-COMPONENT
              <div className="space-y-3"> // STATUS-COMPONENT
                <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest">Active Data Tier</h3> // STATUS-COMPONENT
                <div className={cn("flex items-center gap-3 p-4 rounded-lg border", badgeContent.bgColor, badgeContent.borderColor)}> // STATUS-COMPONENT
                  <div className={cn("p-2 rounded-full", badgeContent.bgColor)}> // STATUS-COMPONENT
                    {React.cloneElement(badgeContent.icon as React.ReactElement, { className: "w-5 h-5 " + badgeContent.color })} // STATUS-COMPONENT
                  </div> // STATUS-COMPONENT
                  <div> // STATUS-COMPONENT
                    <div className={cn("text-sm font-bold tracking-widest", badgeContent.color)}>{badgeContent.label}</div> // STATUS-COMPONENT
                    <div className="text-xs font-mono text-slate-400 mt-1">{badgeContent.subtext}</div> // STATUS-COMPONENT
                  </div> // STATUS-COMPONENT
                </div> // STATUS-COMPONENT
              </div> // STATUS-COMPONENT

              <div className="space-y-4"> // STATUS-COMPONENT
                <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest">Connection Diagnostics</h3> // STATUS-COMPONENT
                
                <div className="space-y-2"> // STATUS-COMPONENT
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/5"> // STATUS-COMPONENT
                    <div className="text-xs font-mono text-slate-300">NIST ASD Endpoint</div> // STATUS-COMPONENT
                    <div className={cn("text-xs font-bold uppercase", status.nist_api === 'online' ? 'text-[#00ff88]' : status.nist_api === 'offline' ? 'text-[#ff3333]' : 'text-slate-500')}>{status.nist_api}</div> // STATUS-COMPONENT
                  </div> // STATUS-COMPONENT
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/5"> // STATUS-COMPONENT
                    <div className="flex flex-col"> // STATUS-COMPONENT
                      <span className="text-xs font-mono text-slate-300">Cloudflare Proxy</span> // STATUS-COMPONENT
                      <span className="text-[9px] font-mono text-slate-500">Global edge cache</span> // STATUS-COMPONENT
                    </div> // STATUS-COMPONENT
                    <div className={cn("text-xs font-bold uppercase", status.cloudflare_worker === 'online' ? 'text-[#00ff88]' : status.cloudflare_worker === 'offline' ? 'text-[#ff3333]' : 'text-slate-500')}>{status.cloudflare_worker}</div> // STATUS-COMPONENT
                  </div> // STATUS-COMPONENT
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/5"> // STATUS-COMPONENT
                    <div className="flex flex-col"> // STATUS-COMPONENT
                      <span className="text-xs font-mono text-slate-300">GitHub Vault Backup</span> // STATUS-COMPONENT
                      <a href="https://github.com/plasma-x-database" target="_blank" rel="noreferrer" className="text-[9px] font-mono text-plasma-cyan flex items-center gap-1 hover:underline"><ExternalLink className="w-2.5 h-2.5" /> plasma-x-database</a> // STATUS-COMPONENT
                    </div> // STATUS-COMPONENT
                    <div className={cn("text-xs font-bold uppercase", status.github_backup === 'online' ? 'text-[#00ff88]' : status.github_backup === 'offline' ? 'text-[#ff3333]' : 'text-slate-500')}>{status.github_backup}</div> // STATUS-COMPONENT
                  </div> // STATUS-COMPONENT
                </div> // STATUS-COMPONENT
              </div> // STATUS-COMPONENT

              <div className="bg-plasma-cyan/5 border border-plasma-cyan/20 p-4 rounded-lg flex items-start gap-3"> // STATUS-COMPONENT
                <HelpCircle className="w-4 h-4 text-plasma-cyan shrink-0 mt-0.5" /> // STATUS-COMPONENT
                <div className="text-[10px] text-slate-300 font-mono leading-relaxed"> // STATUS-COMPONENT
                  <strong className="text-plasma-cyan block mb-1">What is this?</strong> // STATUS-COMPONENT
                  PLASMA-X automatically routes requests to ensure you always have data. It prefers the live NIST database, falls back to a global cache, then to our GitHub backup vault, and finally to an offline 145-line bundle. // STATUS-COMPONENT
                </div> // STATUS-COMPONENT
              </div> // STATUS-COMPONENT
              
              <button // STATUS-COMPONENT
                onClick={fetchStatus} // STATUS-COMPONENT
                disabled={isSyncing} // STATUS-COMPONENT
                className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded font-bold text-xs uppercase tracking-widest text-white transition-colors disabled:opacity-50" // STATUS-COMPONENT
              > // STATUS-COMPONENT
                <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} /> {isSyncing ? 'Syncing...' : 'Force Sync'} // STATUS-COMPONENT
              </button> // STATUS-COMPONENT
            </div> // STATUS-COMPONENT
          </div> // STATUS-COMPONENT
        </div> // STATUS-COMPONENT
      )} // STATUS-COMPONENT
    </> // STATUS-COMPONENT
  ); // STATUS-COMPONENT
} // STATUS-COMPONENT
