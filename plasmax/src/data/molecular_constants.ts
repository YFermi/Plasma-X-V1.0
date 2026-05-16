// ═══════════════════════════════════════
// H₂ FULCHER-α BAND SYSTEM
// d³Πᵤ → a³Σg⁺ (600-640nm)
// ═══════════════════════════════════════
export interface H2FulcherLine {
  J: number;              // rotational quantum number
  wavelength_nm: number;  // Q-branch line wavelength
  E_upper_cm1: number;    // upper state energy in cm⁻¹
  S_J: number;            // line strength = J for Q-branch
}

export const H2_FULCHER_QBRANCH: H2FulcherLine[] = [
  { J: 1, wavelength_nm: 601.8299, E_upper_cm1: 48.60, S_J: 4.5 },
  { J: 2, wavelength_nm: 602.3757, E_upper_cm1: 169.59, S_J: 2.5 },
  { J: 3, wavelength_nm: 603.1909, E_upper_cm1: 340.28, S_J: 10.5 },
  { J: 4, wavelength_nm: 604.2716, E_upper_cm1: 585.01, S_J: 4.5 },
  { J: 5, wavelength_nm: 605.6091, E_upper_cm1: 855.96, S_J: 16.5 },
  { J: 6, wavelength_nm: 607.2045, E_upper_cm1: 1231.74, S_J: 6.5 },
  { J: 7, wavelength_nm: 609.0573, E_upper_cm1: 1640.16, S_J: 22.5 }
];

export const H2_FULCHER_CONSTANTS = {
  system: "d³Πᵤ → a³Σg⁺",
  wavelength_range_nm: [600, 610] as [number, number],
  B_upper: 0,
  B_lower: 0,
  description: "Fulcher-α band. Q-branch used for Tgas measurement."
};

// ═══════════════════════════════════════
// N₂ SECOND POSITIVE SYSTEM
// C³Πᵤ → B³Πg (300-400nm)
// ═══════════════════════════════════════
export interface N2BandHead {
  v_upper: number;
  v_lower: number;
  wavelength_nm: number;
  FCF: number;           // Franck-Condon factor
  relative_intensity: number;
}

export const N2_SECOND_POSITIVE_BANDS: N2BandHead[] = [
  { v_upper: 0, v_lower: 2, wavelength_nm: 380.5, FCF: 0.134, relative_intensity: 1 },
  { v_upper: 1, v_lower: 3, wavelength_nm: 375.5, FCF: 0.174, relative_intensity: 1 },
  { v_upper: 2, v_lower: 4, wavelength_nm: 371.1, FCF: 0.144, relative_intensity: 1 },
  { v_upper: 3, v_lower: 5, wavelength_nm: 367.2, FCF: 0.092, relative_intensity: 1 },
  { v_upper: 0, v_lower: 0, wavelength_nm: 337.13, FCF: 0.448, relative_intensity: 1 }
];

export const N2_SPECTROSCOPIC_CONSTANTS = {
  system: "C³Πᵤ → B³Πg",
  wavelength_range_nm: [365, 382] as [number, number],
  Be_upper: 1.8259,
  Be_lower: 1.6374,
  we_upper: 2047.59,
  we_lower: 1733.39,
  Te: 29653.0,
};

// ═══════════════════════════════════════
// C₂ SWAN BANDS
// d³Πg → a³Πᵤ (470-570nm)
// ═══════════════════════════════════════
export interface C2BandHead {
  v_upper: number;
  v_lower: number;
  wavelength_nm: number;
  FCF: number;
}

export const C2_SWAN_BANDS: C2BandHead[] = [
  { v_upper: 0, v_lower: 0, wavelength_nm: 516.52, FCF: 0.725 },
  { v_upper: 1, v_lower: 1, wavelength_nm: 512.9, FCF: 0.220 }
];

export const C2_SPECTROSCOPIC_CONSTANTS = {
  system: "d³Πg → a³Πᵤ (Swan bands)",
  wavelength_range_nm: [512, 517] as [number, number],
  Be_upper: 1.7527,
  Be_lower: 1.6326,
  we_upper: 1788.22,
  we_lower: 1641.35,
};

// ═══════════════════════════════════════
// CN VIOLET SYSTEM
// B²Σ⁺ → X²Σ⁺ (350-390nm)
// ═══════════════════════════════════════
export interface CNBandHead {
  v_upper: number;
  v_lower: number;
  wavelength_nm: number;
  FCF: number;
}

export const CN_VIOLET_BANDS: CNBandHead[] = [
  { v_upper: 0, v_lower: 0, wavelength_nm: 388.34, FCF: 0.920 },
  { v_upper: 1, v_lower: 1, wavelength_nm: 387.14, FCF: 0.730 },
  { v_upper: 2, v_lower: 2, wavelength_nm: 386.19, FCF: 0.480 }
];

export const CN_SPECTROSCOPIC_CONSTANTS = {
  system: "B²Σ⁺ → X²Σ⁺ (Violet system)",
  wavelength_range_nm: [385, 389] as [number, number],
  Be_upper: 1.973,
  Be_lower: 1.899,
  we_upper: 2163.9,
  we_lower: 2068.59,
};
