import rawData from '../spectral_database.json';
import blockHHe from './block_H_He.json'; // ADD THIS
import blockArExtended from './block_Ar_extended.json'; // ADD THIS
import blockNO from './block_N_O.json';
import blockNOExtended from './block_N_O_extended.json'; // ADD THIS
import blockNeKrExtended from './block_Ne_Kr_extended.json'; // ADD THIS
import blockFeCExtended from './block_Fe_C_extended.json'; // ADD THIS
import blockXeExtended from './block_Xe_extended.json'; // ADD THIS

export interface SpectralLine {
  wavelength: number;
  element: string;
  ion: string;
  aki: number;
  gk: number;
  gi: number;
  accuracy: string;
  energyLow: number;
  energyHigh: number;
  confLow: string;
  confHigh: string;
  termLow: string;
  termHigh: string;
  jLow: string;
  jHigh: string;
}

export function mergeSpectralData(...arrays: SpectralLine[][]): SpectralLine[] {
  const combined = arrays.flat();
  const unique: SpectralLine[] = [];

  for (const line of combined) {
    // Check for duplicates: same element, same ion, wavelength within 0.005nm
    const isDuplicate = unique.find(
      (u) =>
        u.element === line.element &&
        u.ion === line.ion &&
        Math.abs(u.wavelength - line.wavelength) <= 0.005
    );

    if (!isDuplicate) {
      unique.push(line);
    }
  }

  // Sort by wavelength ascending
  return unique.sort((a, b) => a.wavelength - b.wavelength);
}

// Ensure the original JSON data conforms to the interface
const originalData: SpectralLine[] = rawData as any as SpectralLine[];
const hHeData: SpectralLine[] = blockHHe as any as SpectralLine[]; // ADD THIS
const arExtendedData: SpectralLine[] = blockArExtended as any as SpectralLine[]; // ADD THIS
const noData: SpectralLine[] = blockNO as any as SpectralLine[];
const noExtendedData: SpectralLine[] = blockNOExtended as any as SpectralLine[]; // ADD THIS
const neKrExtendedData: SpectralLine[] = blockNeKrExtended as any as SpectralLine[]; // ADD THIS
const feCExtendedData: SpectralLine[] = blockFeCExtended as any as SpectralLine[]; // ADD THIS
const xeExtendedData: SpectralLine[] = blockXeExtended as any as SpectralLine[]; // ADD THIS

export const MERGED_DATA = mergeSpectralData(originalData, hHeData, arExtendedData, noData, noExtendedData, neKrExtendedData, feCExtendedData, xeExtendedData); // ADD THIS

const uniqueElements = new Set(MERGED_DATA.map((d) => d.element));

export const DATABASE_STATS = {
  totalLines: MERGED_DATA.length,
  elementCount: uniqueElements.size,
  coveragePercent: parseFloat(((uniqueElements.size / 118) * 100).toFixed(2)), // Based on 118 known elements
  lastUpdated: new Date().toISOString().split('T')[0],
};
