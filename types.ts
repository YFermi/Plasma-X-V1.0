
export interface SpectralPoint {
  wavelength: number;
  intensity: number;
}

export interface SpectrumData {
  id: string;
  name: string;
  timestamp: string;
  points: SpectralPoint[];
  metadata?: {
    exposureTime?: number;
    grating?: string;
    centerWavelength?: number;
  };
}

export type GasType = 'h2' | 'argon' | 'custom';
export type DiagnosticType = 'molecular' | 'atomic' | 'atomic-ii' | 'thermo' | 'ai-consult';

export interface PlasmaParameters {
  // Kinetic State
  electronTemperature?: number; 
  electronDensity?: number; 
  gasTemperature?: number;
  vibrationalTemperature?: number;
  
  // Thermodynamic State
  debyeLength?: number; // m
  ionizationLowering?: number; // eV
  plasmaParameter?: number; // Dimensionless
  
  // Fitting Stats
  fitSlope?: number;
  fitIntercept?: number;
  fitQuality?: number; 
  selectedGas?: GasType;
  
  // AI Insights
  aiInsights?: string;
}

export interface ProjectState {
  spectra: SpectrumData[];
  selectedSpectrumId: string | null;
  results: Record<string, PlasmaParameters>;
  globalEnv: {
    pressure: number;
    multiMol: number;
    multiAtm: number;
    isEquilibrium: boolean;
  };
}

export interface PeakResult {
  intensity: number;
  background: number;
  detectedWavelength: number;
}
