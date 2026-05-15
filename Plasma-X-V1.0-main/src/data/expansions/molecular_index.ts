import molecularData from './molecular_database.json';

export interface MolecularBand {
  molecule: string;
  system: string;
  bandHead_nm: number;
  transition: string;
  v_upper: number;
  v_lower: number;
  upperState: string;
  lowerState: string;
  type: string;
  intensity: string;
  Trot_sensitive: boolean;
  diagnosticUse: string;
  plasmaType: string;
  reference: string;
}

export const MOLECULAR_DATA: MolecularBand[] = molecularData as MolecularBand[];

export function searchMolecularBands(
  wavelength: number,
  tolerance: number,
  molecule?: string
): MolecularBand[] {
  return MOLECULAR_DATA.filter((band) => {
    const matchesWavelength = Math.abs(band.bandHead_nm - wavelength) <= tolerance;
    const matchesMolecule = molecule ? band.molecule.toLowerCase() === molecule.toLowerCase() : true;
    return matchesWavelength && matchesMolecule;
  }).sort((a, b) => Math.abs(a.bandHead_nm - wavelength) - Math.abs(b.bandHead_nm - wavelength));
}

const uniqueMolecules = new Set(MOLECULAR_DATA.map((b) => b.molecule));

export const MOLECULAR_STATS = {
  totalBands: MOLECULAR_DATA.length,
  moleculesPresent: Array.from(uniqueMolecules),
  TrotSensitiveBands: MOLECULAR_DATA.filter((b) => b.Trot_sensitive).length,
};
