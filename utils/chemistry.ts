
export interface AnalyzedSpecies {
  name: string;
  molWt: number;
  ion: number;
  isMolecule: boolean;
  numAtoms: number;
}

const ELEMENT_DATA: Record<string, number> = {
  'H': 1.008e-3,
  'He': 4.0026e-3,
  'C': 12.011e-3,
  'N': 14.007e-3,
  'O': 15.999e-3,
  'Ar': 39.948e-3,
  'Cu': 63.546e-3,
  'Al': 26.981e-3,
  'e-': 5.485e-7 * 1e-3 // Electron mass from Fortran atm_wt
};

/**
 * Port of Fortran ANALYZE_SPECIES
 * Detects ions (+, -), atoms count, and molar mass
 */
export function analyzeSpecies(name: string): AnalyzedSpecies {
  let molWt = 0;
  let ion = 0;
  let numAtoms = 0;
  
  // Clean ion suffixes
  const nameOnly = name.replace(/[+-]/g, (match) => {
    if (match === '+') ion++;
    if (match === '-') ion--;
    return '';
  });

  // Extract elements and numbers (e.g., N2, CO2, OH)
  const regex = /([A-Z][a-z]?)([0-9]*)/g;
  let match;
  
  while ((match = regex.exec(nameOnly)) !== null) {
    const symbol = match[1];
    const count = parseInt(match[2] || '1');
    const atomicWt = ELEMENT_DATA[symbol] || 0;
    
    molWt += atomicWt * count;
    numAtoms += count;
  }

  // Final molar weight adjustment for electron loss/gain
  // mol_wt = mol_wt - ion * element(0)%atm_wt
  molWt -= ion * (ELEMENT_DATA['e-'] || 0);

  return {
    name,
    molWt,
    ion,
    isMolecule: numAtoms > 1,
    numAtoms
  };
}
