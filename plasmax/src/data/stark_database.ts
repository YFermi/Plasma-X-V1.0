export interface StarkEntry {
  element: string;
  ion: string;
  wavelength_nm: number;
  line_name: string;
  stark_w_nm: number;
  stark_d_nm: number;
  ref_ne_cm3: number;
  ref_Te_eV: number;
  scaling: "gigosos" | "linear";
  uncertainty_percent: number;
  ne_min_cm3: number;
  ne_max_cm3: number;
  atomic_mass_amu: number;
  reference: string;
  notes: string;
}

export const STARK_DATABASE: StarkEntry[] = [
  {
    element: "H", ion: "I", wavelength_nm: 656.279,
    line_name: "Hα",
    stark_w_nm: 0.1832, stark_d_nm: -0.0154,
    ref_ne_cm3: 1e16, ref_Te_eV: 1.0,
    scaling: "gigosos", uncertainty_percent: 5,
    ne_min_cm3: 1e13, ne_max_cm3: 1e18,
    atomic_mass_amu: 1.008,
    reference: "Gigosos & Cardenoso, J.Phys.B 1996",
    notes: "Gold standard nₑ line. Scales as nₑ^0.668. Most used worldwide."
  },
  {
    element: "H", ion: "I", wavelength_nm: 486.133,
    line_name: "Hβ",
    stark_w_nm: 0.0891, stark_d_nm: -0.0082,
    ref_ne_cm3: 1e16, ref_Te_eV: 1.0,
    scaling: "gigosos", uncertainty_percent: 5,
    ne_min_cm3: 1e14, ne_max_cm3: 1e18,
    atomic_mass_amu: 1.008,
    reference: "Gigosos & Cardenoso, J.Phys.B 1996",
    notes: "Second Balmer line. Better at high densities where Hα is too broad."
  },
  {
    element: "H", ion: "I", wavelength_nm: 434.047,
    line_name: "Hγ",
    stark_w_nm: 0.0507, stark_d_nm: -0.0048,
    ref_ne_cm3: 1e16, ref_Te_eV: 1.0,
    scaling: "gigosos", uncertainty_percent: 7,
    ne_min_cm3: 1e15, ne_max_cm3: 1e18,
    atomic_mass_amu: 1.008,
    reference: "Gigosos & Cardenoso, J.Phys.B 1996",
    notes: "Use at very high densities. Combine with Hα and Hβ for overdetermined measurement."
  },
  {
    element: "H", ion: "I", wavelength_nm: 410.174,
    line_name: "Hδ",
    stark_w_nm: 0.0320, stark_d_nm: -0.0031,
    ref_ne_cm3: 1e16, ref_Te_eV: 1.0,
    scaling: "gigosos", uncertainty_percent: 8,
    ne_min_cm3: 1e15, ne_max_cm3: 1e18,
    atomic_mass_amu: 1.008,
    reference: "Gigosos & Cardenoso, J.Phys.B 1996",
    notes: "Fourth Balmer line. Cross-check with Hα Hβ Hγ for overdetermined system."
  },
  {
    element: "He", ion: "I", wavelength_nm: 587.562,
    line_name: "He D3",
    stark_w_nm: 0.0180, stark_d_nm: 0.0042,
    ref_ne_cm3: 1e16, ref_Te_eV: 2.0,
    scaling: "linear", uncertainty_percent: 15,
    ne_min_cm3: 1e14, ne_max_cm3: 1e17,
    atomic_mass_amu: 4.003,
    reference: "Griem, Spectral Line Broadening 1974",
    notes: "Best He line for nₑ. Red Stark shift. Common in He plasma."
  },
  {
    element: "He", ion: "I", wavelength_nm: 667.815,
    line_name: "He 667nm",
    stark_w_nm: 0.0071, stark_d_nm: 0.0012,
    ref_ne_cm3: 1e16, ref_Te_eV: 2.0,
    scaling: "linear", uncertainty_percent: 20,
    ne_min_cm3: 1e15, ne_max_cm3: 1e17,
    atomic_mass_amu: 4.003,
    reference: "Griem, Spectral Line Broadening 1974",
    notes: "Secondary He line. Use when D3 is unavailable or perturbed."
  },
  {
    element: "He", ion: "I", wavelength_nm: 706.519,
    line_name: "He 706nm",
    stark_w_nm: 0.0095, stark_d_nm: 0.0018,
    ref_ne_cm3: 1e16, ref_Te_eV: 2.0,
    scaling: "linear", uncertainty_percent: 20,
    ne_min_cm3: 1e15, ne_max_cm3: 1e17,
    atomic_mass_amu: 4.003,
    reference: "Griem, Spectral Line Broadening 1974",
    notes: "He I triplet line. Consistency check in helium plasma."
  },
  {
    element: "Ar", ion: "I", wavelength_nm: 696.543,
    line_name: "Ar I 696nm",
    stark_w_nm: 0.0043, stark_d_nm: 0.0008,
    ref_ne_cm3: 1e16, ref_Te_eV: 1.0,
    scaling: "linear", uncertainty_percent: 25,
    ne_min_cm3: 1e15, ne_max_cm3: 1e17,
    atomic_mass_amu: 39.948,
    reference: "Konjević et al., JPCRD 2002",
    notes: "Small Stark width. Doppler often dominates. Only reliable above 10¹⁵ cm⁻³."
  },
  {
    element: "Ar", ion: "I", wavelength_nm: 763.511,
    line_name: "Ar I 763nm",
    stark_w_nm: 0.0038, stark_d_nm: 0.0006,
    ref_ne_cm3: 1e16, ref_Te_eV: 1.0,
    scaling: "linear", uncertainty_percent: 25,
    ne_min_cm3: 1e15, ne_max_cm3: 1e17,
    atomic_mass_amu: 39.948,
    reference: "Konjević et al., JPCRD 2002",
    notes: "Use with Ar I 696nm for consistency check."
  },
  {
    element: "Ar", ion: "I", wavelength_nm: 811.531,
    line_name: "Ar I 811nm",
    stark_w_nm: 0.0041, stark_d_nm: 0.0007,
    ref_ne_cm3: 1e16, ref_Te_eV: 1.0,
    scaling: "linear", uncertainty_percent: 25,
    ne_min_cm3: 1e15, ne_max_cm3: 1e17,
    atomic_mass_amu: 39.948,
    reference: "Konjević et al., JPCRD 2002",
    notes: "Strong NIR Ar I line. Good for high density argon plasma."
  },
  {
    element: "Ar", ion: "II", wavelength_nm: 488.003,
    line_name: "Ar II 488nm",
    stark_w_nm: 0.0095, stark_d_nm: 0.0021,
    ref_ne_cm3: 1e16, ref_Te_eV: 2.0,
    scaling: "linear", uncertainty_percent: 20,
    ne_min_cm3: 1e14, ne_max_cm3: 1e17,
    atomic_mass_amu: 39.948,
    reference: "Konjević et al., JPCRD 2002",
    notes: "Best Ar-II line for nₑ in ICP plasma."
  },
  {
    element: "O", ion: "I", wavelength_nm: 777.194,
    line_name: "O I 777nm",
    stark_w_nm: 0.0021, stark_d_nm: 0.0003,
    ref_ne_cm3: 1e16, ref_Te_eV: 1.0,
    scaling: "linear", uncertainty_percent: 30,
    ne_min_cm3: 1e16, ne_max_cm3: 1e18,
    atomic_mass_amu: 15.999,
    reference: "Konjević et al., JPCRD 2002",
    notes: "Very small Stark width. Only reliable at very high densities. Check self-absorption."
  },
  {
    element: "N", ion: "I", wavelength_nm: 742.364,
    line_name: "N I 742nm",
    stark_w_nm: 0.0089, stark_d_nm: 0.0015,
    ref_ne_cm3: 1e16, ref_Te_eV: 1.0,
    scaling: "linear", uncertainty_percent: 25,
    ne_min_cm3: 1e15, ne_max_cm3: 1e17,
    atomic_mass_amu: 14.007,
    reference: "Konjević & Wiese, JPCRD 1990",
    notes: "N I triplet leader. Useful in air and nitrogen plasma."
  },
  {
    element: "C", ion: "II", wavelength_nm: 426.727,
    line_name: "C II 426nm",
    stark_w_nm: 0.0124, stark_d_nm: 0.0031,
    ref_ne_cm3: 1e16, ref_Te_eV: 2.0,
    scaling: "linear", uncertainty_percent: 20,
    ne_min_cm3: 1e14, ne_max_cm3: 1e17,
    atomic_mass_amu: 12.011,
    reference: "Griem, Spectral Line Broadening 1974",
    notes: "C II doublet. Good nₑ diagnostic in fusion edge and CVD plasma."
  },
  {
    element: "Fe", ion: "I", wavelength_nm: 404.581,
    line_name: "Fe I 404nm",
    stark_w_nm: 0.0056, stark_d_nm: 0.0011,
    ref_ne_cm3: 1e16, ref_Te_eV: 1.0,
    scaling: "linear", uncertainty_percent: 30,
    ne_min_cm3: 1e15, ne_max_cm3: 1e17,
    atomic_mass_amu: 55.845,
    reference: "Konjević & Wiese, JPCRD 1990",
    notes: "Most used Fe line. More useful in dense arc plasma."
  },
  {
    element: "Fe", ion: "II", wavelength_nm: 274.948,
    line_name: "Fe II 274nm",
    stark_w_nm: 0.0078, stark_d_nm: 0.0019,
    ref_ne_cm3: 1e16, ref_Te_eV: 2.0,
    scaling: "linear", uncertainty_percent: 25,
    ne_min_cm3: 1e14, ne_max_cm3: 1e17,
    atomic_mass_amu: 55.845,
    reference: "Konjević & Wiese, JPCRD 1990",
    notes: "Fe II has larger Stark widths. Useful in arc and laser-induced plasma."
  }
];

export function getStarkEntry(
  element: string,
  ion: string,
  wavelength: number
): StarkEntry | null {
  return STARK_DATABASE.find(entry =>
    entry.element.toLowerCase() === element.toLowerCase() &&
    entry.ion.toLowerCase() === ion.toLowerCase() &&
    Math.abs(entry.wavelength_nm - wavelength) < 0.1
  ) ?? null;
}

export function calculateDopplerFWHM(
  wavelength_nm: number,
  T_gas_K: number,
  M_atomic_amu: number
): number {
  return wavelength_nm * 7.16e-7 *
    Math.sqrt(T_gas_K / M_atomic_amu);
}

export function calculateStarkFWHM(
  W_total: number,
  W_instrumental: number,
  W_doppler: number
): number | null {
  const stark_squared =
    Math.pow(W_total, 2) -
    Math.pow(W_instrumental, 2) -
    Math.pow(W_doppler, 2);
  if (stark_squared <= 0) return null;
  return Math.sqrt(stark_squared);
}

export function calculateNe(
  entry: StarkEntry,
  W_stark: number
): {
  ne_cm3: number;
  ne_min: number;
  ne_max: number;
  reliable: boolean;
  warning: string | null;
} {
  let ne_cm3: number;
  if (entry.scaling === "gigosos") {
    ne_cm3 = entry.ref_ne_cm3 *
      Math.pow(W_stark / entry.stark_w_nm, 1 / 0.668);
  } else {
    ne_cm3 = entry.ref_ne_cm3 *
      (W_stark / entry.stark_w_nm);
  }
  const f = entry.uncertainty_percent / 100;
  const ne_min = ne_cm3 * (1 - f);
  const ne_max = ne_cm3 * (1 + f);
  const reliable =
    ne_cm3 >= entry.ne_min_cm3 &&
    ne_cm3 <= entry.ne_max_cm3;
  let warning: string | null = null;
  if (ne_cm3 < entry.ne_min_cm3) {
    warning = "nₑ below reliable range. " +
      "Doppler broadening likely dominates. " +
      "Consider using Hα instead.";
  } else if (ne_cm3 > entry.ne_max_cm3) {
    warning = "nₑ above reliable range. " +
      "Line may be optically thick or saturated.";
  }
  return { ne_cm3, ne_min, ne_max, reliable, warning };
}

export function formatNe(ne_cm3: number): string {
  if (!isFinite(ne_cm3) || ne_cm3 <= 0) return "—";
  const exp = Math.floor(Math.log10(ne_cm3));
  const mantissa = ne_cm3 / Math.pow(10, exp);
  const supMap: Record<string, string> = {
    '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴',
    '5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
    '-':'⁻'
  };
  const expStr = String(exp)
    .split('')
    .map(c => supMap[c] ?? c)
    .join('');
  return `${mantissa.toFixed(2)} × 10${expStr}`;
}

export function formatNeRange(
  ne_cm3: number,
  uncertainty_percent: number
): string {
  if (!isFinite(ne_cm3) || ne_cm3 <= 0) return "—";
  const f = uncertainty_percent / 100;
  const ne_min = ne_cm3 * (1 - f);
  const ne_max = ne_cm3 * (1 + f);
  return `${formatNe(ne_min)} – ${formatNe(ne_max)}`;
}
