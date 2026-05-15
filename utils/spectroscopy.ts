
import { MolecularConstants, DiatomicSystem, PHYSICS } from '../constants';

/**
 * Fast Pseudo-Voigt Profile
 * Efficiently computes the line broadening profile
 */
export function fastVoigtProfile(dx: number, fwhm: number): number {
  if (fwhm <= 0) return dx === 0 ? 1 : 0;
  const sigma = fwhm / 2.35482;
  const gamma = fwhm / 2.0;
  const dx2 = dx * dx;
  const g = Math.exp(-dx2 / (2 * sigma * sigma));
  const l = (gamma * gamma) / (dx2 + gamma * gamma);
  // Standard 70% Gaussian / 30% Lorentzian mixing for plasma OES
  return 0.7 * g + 0.3 * l;
}

/**
 * Dunham expansion for diatomic energy levels (cm-1)
 */
export function calculateEnergy(v: number, J: number, c: MolecularConstants): number {
  const Gv = c.we * (v + 0.5) - c.wexe * Math.pow(v + 0.5, 2);
  const Bv = c.Be - c.alphae * (v + 0.5);
  return Gv + (Bv * J * (J + 1));
}

export interface SynthesisParams {
  trot: number;
  tvib: number;
  inst: number;
  shift: number;
  model: DiatomicSystem;
  targetAxis: number[] | Float32Array;
  clipBounds: { low: number; high: number };
}

/**
 * High-performance Diatomic Synthesis Engine
 * Iterates through quantum numbers to generate a synthetic spectrum manifold.
 */
export function generateSyntheticManifold(params: SynthesisParams): Float32Array {
  const { trot, tvib, inst, shift, model, targetAxis, clipBounds } = params;
  const n = targetAxis.length;
  const synth = new Float32Array(n);
  
  if (n === 0) return synth;

  const hc_k = PHYSICS.HC; 
  const g0Upper = calculateEnergy(0, 0, model.upper);
  const g0Lower = calculateEnergy(0, 0, model.lower);
  
  // Broadening window optimization
  const windowSize = Math.max(0.1, inst * 6);

  // N2 Triplet Splitting Offsets (nm) - standard for SPS C-B transitions
  // These small shifts contribute to the 'shoulders' and 'two maximums' within heads
  const isN2 = model.id === 'n2_sps';
  const subHeadOffsets = isN2 ? [0, -0.085, -0.175] : [0];
  const subHeadWeights = isN2 ? [1.0, 0.92, 0.85] : [1.0];

  model.bands.forEach(band => {
    // Pre-calculate vibrational population (Upper State)
    const Ev_up = calculateEnergy(band.v_up, 0, model.upper) - g0Upper;
    const popVib = Math.exp(-(hc_k * Ev_up) / Math.max(300, tvib));

    // Higher J limit for high-Tg CN/C2/N2 tails
    for (let J_up = 0; J_up < 180; J_up++) {
      // NUCLEAR SPIN DEGENERACY (g_nucl)
      // N2 (SPS) follows 2:1 intensity ratio for Even:Odd J levels (I=1 boson symmetry)
      let g_nucl = 1.0;
      if (isN2) {
        g_nucl = (J_up % 2 === 0) ? 2.0 : 1.0;
      }
      
      const Er_up = calculateEnergy(band.v_up, J_up, model.upper) - calculateEnergy(band.v_up, 0, model.upper);
      const popRot = (2 * J_up + 1) * g_nucl * Math.exp(-(hc_k * Er_up) / Math.max(300, trot));

      const deltaJs = [-1, 0, 1];
      for (let d = 0; d < 3; d++) {
        const deltaJ = deltaJs[d];
        const J_lo = J_up + deltaJ;
        if (J_lo < 0) continue;

        let sJJ = 0.1;
        // Honl-London approximations for Pi-Pi transitions (SPS/Swan/Violet)
        if (deltaJ === 1) sJJ = (J_up + 1); // R-branch
        else if (deltaJ === -1) sJJ = J_up; // P-branch
        else sJJ = (2 * J_up + 1) / (J_up * (J_up + 1) || 1); // Q-branch

        const sigma = model.v00 + 
                     (calculateEnergy(band.v_up, J_up, model.upper) - g0Upper) - 
                     (calculateEnergy(band.v_lo, J_lo, model.lower) - g0Lower);
        
        if (sigma <= 0) continue;
        
        const baseLineCenter = (1e7 / sigma) + shift;
        const lineIntensity = band.q_vv * sJJ * popRot * popVib * Math.pow(sigma, 4);
        
        if (lineIntensity < 1e-45) continue;

        // Apply Multi-Head splitting (Physical Triplet Components)
        for (let k = 0; k < subHeadOffsets.length; k++) {
          const lineCenter = baseLineCenter + subHeadOffsets[k];
          const intensity = lineIntensity * subHeadWeights[k];

          if (lineCenter < clipBounds.low - windowSize || lineCenter > clipBounds.high + windowSize) continue;

          // Binary search for optimized convolution start index
          let low = 0, high = n - 1;
          let startIdx = -1;
          while (low <= high) {
            let mid = (low + high) >> 1;
            if (targetAxis[mid] >= lineCenter - windowSize) {
              startIdx = mid;
              high = mid - 1;
            } else low = mid + 1;
          }

          if (startIdx !== -1) {
            for (let i = startIdx; i < n; i++) {
              const wl = targetAxis[i];
              const dx = wl - lineCenter;
              if (dx > windowSize) break;
              synth[i] += intensity * fastVoigtProfile(dx, inst);
            }
          }
        }
      }
    }
  });

  return synth;
}
