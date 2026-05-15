
import { PHYSICS, MolecularConstants } from '../constants';

/**
 * Port of KVOIGT from RAYLIGHT_COMMON_routines
 * Computes the Voigt function V(x, y) using Humlicek's 4-region approximation.
 */
const RI = new Float64Array(15).map((_, i) => -(i + 1) / 2.0);
const XN = new Float64Array([10, 9, 8, 8, 7, 6, 5, 4, 3, 3, 3, 3, 3, 3, 3]);
const YN = new Float64Array([0.6, 0.6, 0.6, 0.5, 0.4, 0.4, 0.3, 0.3, 0.3, 0.3, 1.0, 0.9, 0.8, 0.7, 0.7]);
const H_STEP = 0.201;
const HH = new Float64Array([0.2562121, 0.02588268, 0.2820948]);
const XX = new Float64Array([0.5246476, 1.65068, 0.7071068]);
const NBY2 = new Float64Array([9.5, 9.0, 8.5, 8.0, 7.5, 7.0, 6.5, 6.0, 5.5, 5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5]);
const C_POLY = new Float64Array([
  0.7093602e-7, -0.2518434e-6, 0.8566874e-6, -0.2787638e-5, 0.8660740e-5,
  -0.2565551e-4, 0.7228775e-4, -0.1933631e-3, 0.4899520e-3, -0.1173267e-2,
  0.2648762e-2, -0.5623190e-2, 0.1119601e-1, -0.2084976e-1, 0.3621573e-1,
  -0.5851412e-1, 0.8770816e-1, -0.1216640, 0.15584, -0.184, 0.2
]);

const D0 = new Float64Array(25);
const D1 = new Float64Array(25);
const D2 = new Float64Array(25);
const D3 = new Float64Array(25);
const D4 = new Float64Array(25);
const HN_TABLE = new Float64Array(25);

let isInitialized = false;
function initializeVoigtTables() {
  if (isInitialized) return;
  for (let i = 0; i < 25; i++) {
    HN_TABLE[i] = H_STEP * (i + 0.5);
    const c0 = 4.0 * HN_TABLE[i] * HN_TABLE[i] / 25.0 - 2.0;
    const b = new Float64Array(23);
    for (let j = 1; j < 21; j++) {
      b[j + 1] = c0 * b[j] - b[j - 1] + C_POLY[j];
    }
    D0[i] = HN_TABLE[i] * (b[22] - b[21]) / 5.0;
    D1[i] = 1.0 - 2.0 * HN_TABLE[i] * D0[i];
    D2[i] = (HN_TABLE[i] * D1[i] + D0[i]) / RI[1];
    D3[i] = (HN_TABLE[i] * D2[i] + D1[i]) / RI[2];
    D4[i] = (HN_TABLE[i] * D3[i] + D2[i]) / RI[3];
  }
  isInitialized = true;
}

export function voigtFunction(x: number, y: number): number {
  initializeVoigtTables();
  const absX = Math.abs(x);
  const y2 = y * y;
  if (absX < 5.0 && y > 1.0 && absX <= (1.85 * (3.6 - y))) {
    const idxI = Math.floor(y >= 1.45 ? y * 2 : 11.0 * y);
    const idxJ = Math.floor(absX * 2 + 1.85);
    const max = Math.floor(XN[idxJ] * YN[idxI] + 0.46);
    const min = Math.min(16, 21 - 2 * max);
    let uu = y, vv = absX;
    for (let j = min; j <= 18; j++) {
      const u = NBY2[j] / (uu * uu + vv * vv);
      uu = y + u * uu;
      vv = absX - u * vv;
    }
    return (uu / (uu * uu + vv * vv)) / 1.772454;
  }
  if (absX < 5.0 && y <= 1.0 && (absX + y) < 5.0) {
    const n = Math.floor(absX / H_STEP);
    const dx = absX - HN_TABLE[n];
    const u = (((D4[n] * dx + D3[n]) * dx + D2[n]) * dx + D1[n]) * dx + D0[n];
    const v = 1.0 - 2.0 * absX * u;
    let vv = Math.exp(y2 - absX * absX) * Math.cos(2.0 * absX * y) / 1.128379 - y * v, uu = -y;
    const max = Math.floor(5.0 + (12.5 - absX) * 0.8 * y);
    for (let i = 1; i < max; i += 2) {
      const u_i = (absX * v + u) / RI[i];
      const v_i = (absX * u_i + v) / RI[i + 1];
      uu = -uu * y2;
      vv = vv + v_i * uu;
    }
    return 1.128379 * vv;
  }
  if (((absX < 5.0 && y > 1.0 && absX >= (1.85 * (3.6 - y)))) || (absX >= 5.0 && y >= (11.0 - 0.6875 * absX))) {
    const u = absX - XX[2], v = absX + XX[2];
    return y * (HH[2] / (y2 + u * u) + HH[2] / (y2 + v * v));
  }
  const u1 = absX - XX[0], v1 = absX + XX[0], u2 = absX - XX[1], v2 = absX + XX[1];
  return y * (HH[0] / (y2 + u1 * u1) + HH[0] / (y2 + v1 * v1) + HH[1] / (y2 + u2 * u2) + HH[1] / (y2 + v2 * v2));
}

export function fPlanckNu(temp: number, nu: number): number {
  const exponent = (PHYSICS.HC * nu) / (PHYSICS.KBOLTZ * temp);
  const factor = (2.0 * PHYSICS.PLANCK * Math.pow(nu, 3)) / Math.pow(PHYSICS.C_LIGHT, 2);
  return factor / (Math.exp(exponent) - 1.0);
}

export function fPlanckCM(temp: number, sigma: number): number {
  const exponent = (PHYSICS.HC * sigma) / temp;
  const factor = 2.0 * PHYSICS.PLANCK * Math.pow(sigma, 3) * Math.pow(PHYSICS.C_LIGHT, 2) * 1e8;
  return factor / (Math.exp(exponent) - 1.0);
}

export function fPlanckLambda(temp: number, wavelength: number, unit: 'm' | 'cm' | 'mu' | 'nm' | 'a' = 'nm'): number {
  let wave_m = 0;
  switch (unit) {
    case 'm': wave_m = wavelength; break;
    case 'cm': wave_m = wavelength * 1e-2; break;
    case 'mu': wave_m = wavelength * 1e-6; break;
    case 'nm': wave_m = wavelength * 1e-9; break;
    case 'a': wave_m = wavelength * 1e-10; break;
    default: wave_m = wavelength * 1e-6;
  }
  const exponent = (PHYSICS.HC / 100.0) / (temp * wave_m);
  const numerator = 2.0 * PHYSICS.PLANCK * Math.pow(PHYSICS.C_LIGHT, 2) * Math.pow(wave_m, -5);
  return numerator / (Math.exp(exponent) - 1.0);
}

export function calculateDebyeRadius(ne: number, te: number, ni: number, tg: number): number {
  if (ne <= 0 || te <= 0) return 1e-4;
  const den = (ne / te) + (ni / tg);
  const numerator = PHYSICS.EPSILON_0 * PHYSICS.KBOLTZ;
  const denominator = Math.pow(PHYSICS.E_CHARGE, 2) * den;
  return Math.sqrt(numerator / (denominator || 1e-99));
}

export function calculateIonizationLowering(debyeRadius: number, charge: number): number {
  if (debyeRadius <= 0) return 0;
  const factor = Math.pow(PHYSICS.E_CHARGE, 2) / (8 * PHYSICS.PI * PHYSICS.EPSILON_0 * debyeRadius);
  const deltaE_Joules = 2 * factor * (charge + 1);
  return deltaE_Joules / PHYSICS.E_CHARGE;
}

export function calculateY00(c: MolecularConstants): number {
  return (c.Be / 4) + (c.alphae * c.we) / (12 * c.Be) + 
         (Math.pow(c.alphae, 2) * Math.pow(c.we, 2)) / (144 * Math.pow(c.Be, 3)) - 
         (c.wexe / 4);
}

export function calculateDiatomicPartition(
  trot: number, 
  tvib: number, 
  telec: number, 
  model: { upper: MolecularConstants, dege: number, v00: number }
): number {
  const c = model.upper;
  const y00 = calculateY00(c);
  const groundEnergy = y00 + (c.we / 2) - (c.wexe / 4);
  let Q = 0;
  const vmax = 10; 
  const jmax = 100;
  for (let v = 0; v <= vmax; v++) {
    const Gv = y00 + c.we * (v + 0.5) - c.wexe * Math.pow(v + 0.5, 2) - groundEnergy;
    let Qr = 0;
    const Bv = c.Be - c.alphae * (v + 0.5);
    for (let J = 0; J <= jmax; J++) {
      const Er = Bv * J * (J + 1);
      Qr += (2 * J + 1) * Math.exp(-(PHYSICS.HC * Er) / Math.max(1, trot));
    }
    Q += Qr * Math.exp(-(PHYSICS.HC * Gv) / Math.max(1, tvib));
  }
  // Normalize by electronic degeneracy if provided
  return (model.dege || 1.0) * Q;
}

export function calculateAtomicPartition(te: number, ionizationPotential: number, lowering: number): number {
  const tK = te; 
  const effectiveIP = ionizationPotential - lowering;
  let Q = 1.0;
  const rydberg = PHYSICS.RYDBERG_EV;
  const nLimit = Math.sqrt(rydberg / (effectiveIP || 0.1));
  for (let n = 2; n <= Math.min(nLimit, 100); n++) {
    const gn = 2 * n * n;
    const En = rydberg * (1 - 1 / (n * n));
    Q += gn * Math.exp(-(En * PHYSICS.E_CHARGE) / (PHYSICS.KBOLTZ * tK));
  }
  return Q;
}
