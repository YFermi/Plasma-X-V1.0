import { MERGED_DATA, DATABASE_STATS } from './expansions/index'; // CHANGED

export const ION_STAGES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export interface SpectralLine {
  wavelength: number;
  element: string;
  ion: string;
  lowerLevel?: string;
  upperLevel?: string;
  aki: number;
  fik?: number;
  gk: number;
  gi: number;
  accuracy: string;
  energyLow: number; // eV
  energyHigh: number; // eV
  confLow: string;
  confHigh: string;
  termLow: string;
  termHigh: string;
  jLow: string;
  jHigh: string;
}

export const SAMPLE_DATA: SpectralLine[] = MERGED_DATA as any as SpectralLine[]; // CHANGED
export { DATABASE_STATS }; // CHANGED

export interface ElementMetadata {
  symbol: string;
  name: string;
  number: number;
  levels: number;
  lines: number;
  ions: number;
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export const ELEMENTS: ElementMetadata[] = [
  { symbol: 'H', name: 'Hydrogen', number: 1, levels: 142, lines: 890, ions: 1, quality: 'Excellent' },
  { symbol: 'He', name: 'Helium', number: 2, levels: 98, lines: 450, ions: 2, quality: 'Excellent' },
  { symbol: 'Li', name: 'Lithium', number: 3, levels: 45, lines: 120, ions: 3, quality: 'Good' },
  { symbol: 'Be', name: 'Beryllium', number: 4, levels: 32, lines: 90, ions: 4, quality: 'Good' },
  { symbol: 'B', name: 'Boron', number: 5, levels: 28, lines: 75, ions: 5, quality: 'Fair' },
  { symbol: 'C', name: 'Carbon', number: 6, levels: 85, lines: 340, ions: 6, quality: 'Excellent' },
  { symbol: 'N', name: 'Nitrogen', number: 7, levels: 92, lines: 410, ions: 7, quality: 'Excellent' },
  { symbol: 'O', name: 'Oxygen', number: 8, levels: 105, lines: 480, ions: 8, quality: 'Excellent' },
  { symbol: 'Ne', name: 'Neon', number: 10, levels: 78, lines: 320, ions: 10, quality: 'Excellent' },
  { symbol: 'Ar', name: 'Argon', number: 18, levels: 110, lines: 520, ions: 18, quality: 'Excellent' },
  { symbol: 'Kr', name: 'Krypton', number: 36, levels: 150, lines: 850, ions: 36, quality: 'Good' },
  { symbol: 'Xe', name: 'Xenon', number: 54, levels: 180, lines: 1100, ions: 54, quality: 'Good' },
  { symbol: 'Fe', name: 'Iron', number: 26, levels: 450, lines: 2500, ions: 26, quality: 'Excellent' },
  { symbol: 'Cu', name: 'Copper', number: 29, levels: 120, lines: 600, ions: 29, quality: 'Good' },
  { symbol: 'W', name: 'Tungsten', number: 74, levels: 850, lines: 12000, ions: 74, quality: 'Fair' },
];
