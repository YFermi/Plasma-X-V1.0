export interface StateConstants {
  we: number;
  wexe: number;
  Be: number;
  alphae: number;
}

export interface BandData {
  v_up: number;
  v_lo: number;
  q_vv: number;
}

export interface MolecularModel {
  name: string;
  v00: number;
  upper: StateConstants;
  lower: StateConstants;
  bands: BandData[];
  subHeadOffsets: number[];
  subHeadWeights: number[];
  wavelength_range_nm: [number, number];
  fit_range_nm: [number, number];
}

export const N2_SPS_MODEL: MolecularModel = {
  name: 'N2',
  v00: 29653.0,
  upper: { we: 2047.59, wexe: 28.445, Be: 1.8259, alphae: 0.0187 },
  lower: { we: 1733.39, wexe: 14.122, Be: 1.6374, alphae: 0.0179 },
  bands: [
    { v_up: 0, v_lo: 2, q_vv: 0.134 },
    { v_up: 1, v_lo: 3, q_vv: 0.174 },
    { v_up: 2, v_lo: 4, q_vv: 0.144 },
    { v_up: 3, v_lo: 5, q_vv: 0.092 },
    { v_up: 0, v_lo: 0, q_vv: 0.448 }
  ],
  subHeadOffsets: [0, -0.085, -0.175],
  subHeadWeights: [1.0, 0.92, 0.85],
  wavelength_range_nm: [300, 400],
  fit_range_nm: [366, 376]
};

export const C2_SWAN_MODEL: MolecularModel = {
  name: 'C2',
  v00: 19378.4,
  upper: { we: 1788.22, wexe: 16.44, Be: 1.7527, alphae: 0.0160 },
  lower: { we: 1641.35, wexe: 11.67, Be: 1.6326, alphae: 0.0166 },
  bands: [
    { v_up: 0, v_lo: 0, q_vv: 0.725 },
    { v_up: 1, v_lo: 1, q_vv: 0.220 }
  ],
  subHeadOffsets: [0],
  subHeadWeights: [1],
  wavelength_range_nm: [470, 570],
  fit_range_nm: [512, 517]
};

export const CN_VIOLET_MODEL: MolecularModel = {
  name: 'CN',
  v00: 25797.9,
  upper: { we: 2163.9, wexe: 20.20, Be: 1.973, alphae: 0.022 },
  lower: { we: 2068.59, wexe: 13.08, Be: 1.899, alphae: 0.017 },
  bands: [
    { v_up: 0, v_lo: 0, q_vv: 0.920 },
    { v_up: 1, v_lo: 1, q_vv: 0.730 },
    { v_up: 2, v_lo: 2, q_vv: 0.480 }
  ],
  subHeadOffsets: [0],
  subHeadWeights: [1],
  wavelength_range_nm: [350, 395],
  fit_range_nm: [385, 389]
};

export function calculateEnergy(
  v: number,
  J: number,
  state: {
    we: number;
    wexe: number;
    Be: number;
    alphae: number;
  }
): number {
  const Gv = state.we * (v + 0.5) - 
             state.wexe * Math.pow(v + 0.5, 2);
  const Bv = state.Be - state.alphae * (v + 0.5);
  return Gv + Bv * J * (J + 1);
}

export function fastVoigtProfile(
  dx: number,
  fwhm: number
): number {
  const sigma = fwhm / (2 * Math.sqrt(2 * Math.log(2)));
  const gamma = fwhm / 2;
  const g = Math.exp(-(dx * dx) / (2 * sigma * sigma));
  const l = 1 / (1 + (dx * dx) / (gamma * gamma));
  return 0.7 * g + 0.3 * l;
}

export function generateSyntheticManifold(params: {
  trot: number;
  tvib: number;
  inst: number;    // instrumental FWHM in nm
  shift: number;   // wavelength shift in nm
  model: MolecularModel;
  targetAxis: number[];
  clipBounds: { low: number; high: number };
}): Float32Array {

  const { trot, tvib, inst, shift, model, 
          targetAxis, clipBounds } = params;
  
  const n = targetAxis.length;
  const synth = new Float32Array(n);
  const hc_k = 1.4388;  // hc/kB in cm·K
  const windowSize = Math.max(0.1, 6 * inst);
  const isN2 = model.name === 'N2';

  // Pre-calculate ground state energies
  const g0Upper = calculateEnergy(0, 0, model.upper);
  const g0Lower = calculateEnergy(0, 0, model.lower);

  model.bands.forEach(band => {
    
    // Vibrational population
    const Ev_up = calculateEnergy(band.v_up, 0, model.upper) 
                  - g0Upper;
    const popVib = Math.exp(
      -(hc_k * Ev_up) / Math.max(300, tvib)
    );

    // Rotational loop
    for (let J_up = 0; J_up < 180; J_up++) {
      
      // Nuclear spin statistical weight (N2 only)
      const g_nucl = isN2 
        ? (J_up % 2 === 0 ? 2.0 : 1.0) 
        : 1.0;

      // Rotational energy of upper state
      const Er_up = calculateEnergy(band.v_up, J_up, model.upper)
                  - calculateEnergy(band.v_up, 0, model.upper);
      
      // Rotational population (Boltzmann)
      const popRot = (2 * J_up + 1) * g_nucl * 
        Math.exp(-(hc_k * Er_up) / Math.max(300, trot));

      // P, Q, R branches (deltaJ = -1, 0, +1)
      for (const deltaJ of [-1, 0, 1]) {
        // CN is a Sigma-Sigma transition, so Q-branch is forbidden (deltaJ = 0)
        if (model.name === 'CN' && deltaJ === 0) continue;
        
        const J_lo = J_up + deltaJ;
        if (J_lo < 0) continue;

        // Hönl-London factors
        let sJJ: number;
        if (deltaJ === 1) {
          sJJ = J_up + 1;                              // R-branch
        } else if (deltaJ === -1) {
          sJJ = J_up;                                  // P-branch
        } else {
          sJJ = (2 * J_up + 1) / 
                (J_up * (J_up + 1) || 1);              // Q-branch
        }

        // Transition wavenumber
        const sigma = model.v00 +
          (calculateEnergy(band.v_up, J_up, model.upper) - g0Upper) -
          (calculateEnergy(band.v_lo, J_lo, model.lower) - g0Lower);
        
        if (sigma <= 0) continue;
        
        // Convert to wavelength + apply shift
        const baseLineCenter = (1e7 / sigma) + shift;
        
        // Line intensity (σ⁴ factor from Einstein A)
        const lineIntensity = band.q_vv * sJJ * 
          popRot * popVib * Math.pow(sigma, 4);
        
        if (lineIntensity < 1e-45) continue;

        // Apply sub-head splitting (triplet structure)
        for (let k = 0; k < model.subHeadOffsets.length; k++) {
          const lineCenter = baseLineCenter + 
            model.subHeadOffsets[k];
          const intensity = lineIntensity * 
            model.subHeadWeights[k];

          // Skip if outside window
          if (lineCenter < clipBounds.low - windowSize || 
              lineCenter > clipBounds.high + windowSize) continue;

          // Binary search for start index
          let low = 0, high = n - 1, startIdx = -1;
          while (low <= high) {
            const mid = (low + high) >> 1;
            if (targetAxis[mid] >= lineCenter - windowSize) {
              startIdx = mid;
              high = mid - 1;
            } else {
              low = mid + 1;
            }
          }

          // Apply Voigt profile to spectrum
          if (startIdx !== -1) {
            for (let i = startIdx; i < n; i++) {
              const dx = targetAxis[i] - lineCenter;
              if (dx > windowSize) break;
              synth[i] += intensity * 
                fastVoigtProfile(dx, inst);
            }
          }
        }
      }
    }
  });

  return synth;
}
