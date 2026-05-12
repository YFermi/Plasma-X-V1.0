// NIST-LIVE-INTEGRATION
import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

export function NistStatusDot() {
  const [status, setStatus] = useState<"live" | "cache" | "offline" | null>(null);

  const checkStatus = async () => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      
      await fetch("https://physics.nist.gov/cgi-bin/ASD/lines1.pl", {
         method: 'HEAD',
         mode: 'no-cors',
         signal: controller.signal
      });
      clearTimeout(id);
      
      setStatus("live");
    } catch (error) {
      let fallbackAvailable = false;
      for (let i = 0; i < localStorage.length; i++) {
         const key = localStorage.key(i);
         if (key && key.startsWith("plasma-x-cache-") || key?.startsWith("plasma-x-nist-")) {
            fallbackAvailable = true;
            break;
         }
      }
      if (fallbackAvailable) {
         setStatus("cache");
      } else {
         setStatus("offline");
      }
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const dotColor = status === 'live' ? 'bg-[#00ff88] shadow-[0_0_8px_#00ff88]' : 
                   status === 'cache' ? 'bg-[#ffcc00] shadow-[0_0_8px_#ffcc00]' : 
                   'bg-[#ff3333] shadow-[0_0_8px_#ff3333]';

  return (
    <div className={cn("w-2 h-2 rounded-full", dotColor)} />
  );
}
