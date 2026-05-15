
import { DiagnosticType } from './types';

export interface SystemConfig {
  id: string;
  gas: string;
  label: string;
  range: [number, number];
  type: DiagnosticType;
  transitions: Record<string, { lambda: number, energy: number, factor: number, stark_coeff?: number, k_ion?: number }>;
}

export interface MolecularConstants {
  we: number;
  wexe: number;
  weye?: number;
  Be: number;
  alphae: number;
  De?: number;
}

export interface DiatomicSystem {
  id: string;
  name: string;
  mass: number;
  upper: MolecularConstants;
  lower: MolecularConstants;
  v00: number; // Electronic origin (cm-1)
  defaultRange: [number, number];
  dege: number; // Electronic degeneracy
  bands: { v_up: number, v_lo: number, q_vv: number }[];
}

export const PHYSICS = {
  KBOLTZ: 1.380658e-23,
  PLANCK: 6.626075e-34,
  C_LIGHT: 2.9979e8,
  HC: 1.4388, // hc/k in cm*K
  HC_KB: 1.4388,
  RYDBERG_EV: 13.60569,
  EPSILON_0: 8.854187817e-12,
  E_CHARGE: 1.60217733e-19,
  E_MASS: 0.91093897e-30,
  PI: 3.141592654,
};

export const SYSTEMS: SystemConfig[] = [
  {
    id: 'h2_fulcher',
    gas: 'H2',
    label: 'H2 Fulcher-Alpha (Q1, Q2, Q4, Q6)',
    range: [600, 610],
    type: 'molecular',
    transitions: {
      'Q1': { lambda: 601.83, energy: 48.60, factor: 4.5 },
      'Q2': { lambda: 602.38, energy: 169.59, factor: 2.5 },
      'Q4': { lambda: 604.27, energy: 585.01, factor: 4.5 },
      'Q6': { lambda: 607.20, energy: 1231.74, factor: 6.5 }
    }
  },
  {
    id: 'ar_i',
    gas: 'Ar I',
    label: 'Ar I (4p–4s) 695 - 850 nm',
    range: [695, 850],
    type: 'atomic',
    transitions: {
      'Ar 706.7': { lambda: 706.72, energy: 107496, factor: 0.111 * 1e8 },
      'Ar 738.3': { lambda: 738.39, energy: 107290, factor: 0.247 * 1e8 },
      'Ar 763.5': { lambda: 763.51, energy: 106237, factor: 0.245 * 1e8 },
      'Ar 811.5': { lambda: 811.53, energy: 105463, factor: 0.331 * 1e8 }
    }
  }
];

export const STARK_SYSTEMS: SystemConfig[] = [
  {
    id: 'h_alpha',
    gas: 'Hydrogen',
    label: 'H-alpha (656.3 nm)',
    range: [650, 665],
    type: 'atomic',
    transitions: {
      'H-alpha': { lambda: 656.28, energy: 12.087, factor: 0, stark_coeff: 1.0e-17, k_ion: 0.1 }
    }
  },
  {
    id: 'h_beta',
    gas: 'Hydrogen',
    label: 'H-beta (486.1 nm)',
    range: [480, 490],
    type: 'atomic',
    transitions: {
      'H-beta': { lambda: 486.13, energy: 12.748, factor: 0, stark_coeff: 1.0e-16, k_ion: 0.12 }
    }
  },
  {
    id: 'ar_603',
    gas: 'Argon',
    label: 'Ar I (603.2 nm)',
    range: [600, 608],
    type: 'atomic',
    transitions: {
      'Ar 603.2': { lambda: 603.21, energy: 13.08, factor: 0, stark_coeff: 0, k_ion: 0 }
    }
  }
];

export const DIATOMIC_MODELS: DiatomicSystem[] = [
  {
    id: 'n2_sps',
    name: 'N2 Second Positive (C-B)',
    mass: 28.01,
    v00: 29653.0, // Calibrated for air-head @ 337.13 nm
    defaultRange: [365.0, 382.0], // User requested range 365-382 nm
    dege: 1.0,
    upper: { we: 2047.59, wexe: 28.445, Be: 1.8259, alphae: 0.0187 },
    lower: { we: 1733.39, wexe: 14.122, Be: 1.6374, alphae: 0.0179 },
    bands: [
      { v_up: 0, v_lo: 2, q_vv: 0.134 }, // ~380.5 nm
      { v_up: 1, v_lo: 3, q_vv: 0.174 }, // ~375.5 nm
      { v_up: 2, v_lo: 4, q_vv: 0.144 }, // ~371.1 nm
      { v_up: 3, v_lo: 5, q_vv: 0.092 }, // ~367.2 nm
      { v_up: 0, v_lo: 0, q_vv: 0.448 }, // 337.13 nm (outside range but needed for model)
    ]
  },
  {
    id: 'c2_swan',
    name: 'C2 Swan System (d-a)',
    mass: 24.02,
    v00: 19378.4,
    defaultRange: [512.0, 517.0],
    dege: 3.0,
    upper: { we: 1788.22, wexe: 16.44, Be: 1.7527, alphae: 0.0160 },
    lower: { we: 1641.35, wexe: 11.67, Be: 1.6326, alphae: 0.0166 },
    bands: [
      { v_up: 0, v_lo: 0, q_vv: 0.725 },
      { v_up: 1, v_lo: 1, q_vv: 0.220 }
    ]
  },
  {
    id: 'cn_violet',
    name: 'CN Violet System (B-X)',
    mass: 26.02,
    v00: 25725.0, // Calibrated for air-head @ 388.3 nm
    defaultRange: [385.0, 389.0],
    dege: 2.0,
    upper: { we: 2163.9, wexe: 20.20, Be: 1.973, alphae: 0.022 },
    lower: { we: 2068.59, wexe: 13.08, Be: 1.899, alphae: 0.017 },
    bands: [
      { v_up: 0, v_lo: 0, q_vv: 0.920 }, // 388.34 nm
      { v_up: 1, v_lo: 1, q_vv: 0.730 }, // 387.14 nm
      { v_up: 2, v_lo: 2, q_vv: 0.480 }  // 386.19 nm
    ]
  }
];
