export interface AtomicData {
  element: string;
  ionizationStage: string;
  wavelength: number;
  unit: 'nm' | 'Å' | 'cm-1';
  type: 'AIR' | 'VACUUM';
  transitionProbability?: number;
  accuracyRating?: string;
  upperLevel?: string;
  lowerLevel?: string;
  configuration?: string;
  termSymbol?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  solverResult?: {
    type: string;
    data: any;
  };
}

export interface PlasmaParameters {
  te: number; // Electron temperature in eV
  ne: number; // Electron density in cm-3
  species: string[];
}
