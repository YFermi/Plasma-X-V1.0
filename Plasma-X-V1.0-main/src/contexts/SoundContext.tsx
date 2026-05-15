import React, { createContext, useContext, useCallback } from 'react';

interface SoundContextType {
  playClick: () => void;
  playData: () => void;
  playSuccess: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const playSound = useCallback((freq: number, type: OscillatorType, duration: number, gainValue: number = 0.1) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gainNode.gain.setValueAtTime(gainValue, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  }, []);

  const playClick = useCallback(() => playSound(800, 'sine', 0.1, 0.05), [playSound]);
  const playData = useCallback(() => {
    playSound(400, 'sine', 0.2, 0.05);
    setTimeout(() => playSound(600, 'sine', 0.2, 0.05), 50);
  }, [playSound]);
  const playSuccess = useCallback(() => {
    playSound(523.25, 'sine', 0.3, 0.05); // C5
    setTimeout(() => playSound(659.25, 'sine', 0.3, 0.05), 100); // E5
  }, [playSound]);

  return (
    <SoundContext.Provider value={{ playClick, playData, playSuccess }}>
      {children}
    </SoundContext.Provider>
  );
}

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) throw new Error("useSound must be used within SoundProvider");
  return context;
};
