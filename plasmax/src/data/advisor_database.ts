// ─────────────────────────────────────────────
// PLASMA-X PRO — Advisor Knowledge Base
// All expert knowledge encoded as TypeScript
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// PLASMA SOURCES
// ─────────────────────────────────────────────

export type PlasmaSourceId =
  | 'dbd'
  | 'icp'
  | 'ccp'
  | 'arc'
  | 'appj'
  | 'ecr'
  | 'microwave'
  | 'libs'
  | 'hollow_cathode'
  | 'flame'
  | 'dc_glow';

export interface PlasmaSource {
  id: PlasmaSourceId;
  name: string;
  fullName: string;
  pressure: 'low' | 'mid' | 'high' | 'any';
  pressureRange: string;
  powerRange: string;
  Te_eV_range: [number, number];
  ne_range: [number, number];
  Tgas_range: [number, number];
  isEquilibrium: boolean;
  icon: string;
  description: string;
  typicalApplications: string[];
}

export const PLASMA_SOURCES: PlasmaSource[] = [
  {
    id: 'dbd',
    name: 'DBD',
    fullName: 'Dielectric Barrier Discharge',
    pressure: 'high',
    pressureRange: '1 atm',
    powerRange: '1 W – 10 kW',
    Te_eV_range: [1, 10],
    ne_range: [1e11, 1e14],
    Tgas_range: [300, 600],
    isEquilibrium: false,
    icon: '⚡',
    description: 'Non-equilibrium atmospheric plasma. Cold gas, hot electrons.',
    typicalApplications: [
      'Surface treatment',
      'Ozone generation',
      'Biomedical plasma',
      'Plasma agriculture'
    ]
  },
  {
    id: 'icp',
    name: 'ICP',
    fullName: 'Inductively Coupled Plasma',
    pressure: 'low',
    pressureRange: '1 mTorr – 100 mTorr',
    powerRange: '100 W – 5 kW',
    Te_eV_range: [2, 6],
    ne_range: [1e11, 1e12],
    Tgas_range: [300, 1000],
    isEquilibrium: false,
    icon: '🌀',
    description: 'High-density low-pressure plasma. Uniform and stable.',
    typicalApplications: [
      'Semiconductor etching',
      'Thin film deposition',
      'Ion source',
      'Material processing'
    ]
  },
  {
    id: 'ccp',
    name: 'CCP',
    fullName: 'Capacitively Coupled Plasma',
    pressure: 'low',
    pressureRange: '10 mTorr – 1 Torr',
    powerRange: '10 W – 1 kW',
    Te_eV_range: [1, 4],
    ne_range: [1e9, 1e11],
    Tgas_range: [300, 500],
    isEquilibrium: false,
    icon: '📡',
    description: 'RF driven between parallel plates. Standard etch reactor.',
    typicalApplications: [
      'Silicon etching',
      'PECVD deposition',
      'Photoresist stripping'
    ]
  },
  {
    id: 'arc',
    name: 'Arc',
    fullName: 'Thermal Arc Plasma',
    pressure: 'high',
    pressureRange: '1 atm – 10 atm',
    powerRange: '1 kW – 1 MW',
    Te_eV_range: [0.5, 2],
    ne_range: [1e16, 1e19],
    Tgas_range: [3000, 20000],
    isEquilibrium: true,
    icon: '🔥',
    description: 'High temperature thermal plasma. Near LTE conditions.',
    typicalApplications: [
      'Plasma spraying',
      'Waste treatment',
      'Metallurgy',
      'Plasma cutting'
    ]
  },
  {
    id: 'appj',
    name: 'APPJ',
    fullName: 'Atmospheric Pressure Plasma Jet',
    pressure: 'high',
    pressureRange: '1 atm',
    powerRange: '1 W – 100 W',
    Te_eV_range: [1, 5],
    ne_range: [1e11, 1e14],
    Tgas_range: [300, 400],
    isEquilibrium: false,
    icon: '💨',
    description: 'Cold plasma jet at atmospheric pressure. Very gentle.',
    typicalApplications: [
      'Wound healing',
      'Cancer treatment',
      'Dental treatment',
      'Decontamination'
    ]
  },
  {
    id: 'ecr',
    name: 'ECR',
    fullName: 'Electron Cyclotron Resonance',
    pressure: 'low',
    pressureRange: '0.1 mTorr – 10 mTorr',
    powerRange: '100 W – 2 kW',
    Te_eV_range: [3, 15],
    ne_range: [1e11, 1e13],
    Tgas_range: [300, 600],
    isEquilibrium: false,
    icon: '🧲',
    description: 'Microwave plasma with magnetic confinement at 2.45 GHz.',
    typicalApplications: [
      'Ion beam sources',
      'Precision etching',
      'Diamond deposition',
      'Space propulsion'
    ]
  },
  {
    id: 'microwave',
    name: 'Microwave',
    fullName: 'Microwave Plasma (Surfatron/MWPJ)',
    pressure: 'any',
    pressureRange: '0.1 Torr – 1 atm',
    powerRange: '100 W – 10 kW',
    Te_eV_range: [0.5, 5],
    ne_range: [1e13, 1e16],
    Tgas_range: [500, 6000],
    isEquilibrium: false,
    icon: '📶',
    description: 'Electrodeless microwave discharge. Clean and stable.',
    typicalApplications: [
      'Hydrogen production',
      'Gas reforming',
      'Plasma chemistry',
      'Lighting'
    ]
  },
  {
    id: 'libs',
    name: 'LIBS',
    fullName: 'Laser-Induced Breakdown Spectroscopy',
    pressure: 'any',
    pressureRange: 'Any',
    powerRange: 'Pulsed laser (mJ – J)',
    Te_eV_range: [0.5, 3],
    ne_range: [1e16, 1e20],
    Tgas_range: [3000, 30000],
    isEquilibrium: false,
    icon: '🔆',
    description: 'Laser-created plasma. Pulsed, very hot, fast cooling.',
    typicalApplications: [
      'Elemental analysis',
      'Cultural heritage',
      'Mars exploration',
      'Industrial QC'
    ]
  },
  {
    id: 'hollow_cathode',
    name: 'Hollow Cathode',
    fullName: 'Hollow Cathode Discharge',
    pressure: 'low',
    pressureRange: '0.1 Torr – 10 Torr',
    powerRange: '1 W – 500 W',
    Te_eV_range: [1, 5],
    ne_range: [1e12, 1e15],
    Tgas_range: [300, 1000],
    isEquilibrium: false,
    icon: '⭕',
    description: 'High-pressure glow in hollow geometry. Good for spectroscopy.',
    typicalApplications: [
      'Sputtering sources',
      'Reference lamps',
      'Atomic spectroscopy',
      'Ion lasers'
    ]
  },
  {
    id: 'flame',
    name: 'Flame',
    fullName: 'Combustion Flame Plasma',
    pressure: 'high',
    pressureRange: '1 atm',
    powerRange: 'Fuel-controlled',
    Te_eV_range: [0.1, 0.3],
    ne_range: [1e9, 1e13],
    Tgas_range: [1500, 3000],
    isEquilibrium: true,
    icon: '🕯️',
    description: 'Weakly ionized combustion plasma. Near thermal equilibrium.',
    typicalApplications: [
      'Combustion diagnostics',
      'Pollution monitoring',
      'Engine research',
      'Burner development'
    ]
  },
  {
    id: 'dc_glow',
    name: 'DC Glow',
    fullName: 'DC Glow Discharge',
    pressure: 'low',
    pressureRange: '0.1 Torr – 10 Torr',
    powerRange: '1 W – 1 kW',
    Te_eV_range: [1, 5],
    ne_range: [1e8, 1e12],
    Tgas_range: [300, 600],
    isEquilibrium: false,
    icon: '💡',
    description: 'Classic DC discharge between electrodes. Well-understood.',
    typicalApplications: [
      'Plasma nitriding',
      'Sputtering',
      'Neon signs',
      'Plasma research'
    ]
  }
];

// ─────────────────────────────────────────────
// WORKING GASES
// ─────────────────────────────────────────────

export type GasId =
  | 'ar'
  | 'n2'
  | 'air'
  | 'he'
  | 'h2'
  | 'o2'
  | 'ch4'
  | 'co2'
  | 'ar_h2'
  | 'n2_h2'
  | 'ar_n2';

export interface WorkingGas {
  id: GasId;
  name: string;
  formula: string;
  icon: string;
  keyEmissions: string[];
  molecularSystems: string[];
  atomicMass_amu: number;
}

export const WORKING_GASES: WorkingGas[] = [
  {
    id: 'ar',
    name: 'Argon',
    formula: 'Ar',
    icon: '🔵',
    keyEmissions: ['Ar I 696nm', 'Ar I 706nm',
      'Ar I 727nm', 'Ar I 738nm',
      'Ar I 751nm', 'Ar II 488nm'],
    molecularSystems: [],
    atomicMass_amu: 39.948
  },
  {
    id: 'n2',
    name: 'Nitrogen',
    formula: 'N₂',
    icon: '🟣',
    keyEmissions: ['N I 742nm', 'N I 744nm',
      'N I 747nm'],
    molecularSystems: ['N2 SPS (337nm)',
      'N2+ FNS (391nm)'],
    atomicMass_amu: 28.014
  },
  {
    id: 'air',
    name: 'Air',
    formula: 'Air',
    icon: '💨',
    keyEmissions: ['N I 742nm', 'O I 777nm',
      'O I 844nm'],
    molecularSystems: ['N2 SPS (337nm)',
      'N2+ FNS (391nm)',
      'OH (306nm)',
      'NO Beta (226nm)'],
    atomicMass_amu: 28.8
  },
  {
    id: 'he',
    name: 'Helium',
    formula: 'He',
    icon: '⚪',
    keyEmissions: ['He I 587nm', 'He I 667nm',
      'He I 706nm', 'He I 728nm'],
    molecularSystems: [],
    atomicMass_amu: 4.003
  },
  {
    id: 'h2',
    name: 'Hydrogen',
    formula: 'H₂',
    icon: '🔴',
    keyEmissions: ['Ha 656nm', 'Hb 486nm',
      'Hg 434nm'],
    molecularSystems: ['H2 Fulcher (600-640nm)'],
    atomicMass_amu: 2.016
  },
  {
    id: 'o2',
    name: 'Oxygen',
    formula: 'O₂',
    icon: '🟠',
    keyEmissions: ['O I 777nm', 'O I 844nm',
      'O I 926nm'],
    molecularSystems: [],
    atomicMass_amu: 32.0
  },
  {
    id: 'ch4',
    name: 'Methane mix',
    formula: 'CH₄/Ar',
    icon: '🟤',
    keyEmissions: ['Ha 656nm', 'C II 426nm'],
    molecularSystems: ['C2 Swan (516nm)',
      'CH (431nm)',
      'CN Violet (388nm)'],
    atomicMass_amu: 16.04
  },
  {
    id: 'co2',
    name: 'CO₂',
    formula: 'CO₂',
    icon: '⬛',
    keyEmissions: ['O I 777nm', 'C II 426nm'],
    molecularSystems: ['CO Angstrom (450-600nm)'],
    atomicMass_amu: 44.01
  },
  {
    id: 'ar_h2',
    name: 'Ar/H₂ mix',
    formula: 'Ar+H₂',
    icon: '🔴',
    keyEmissions: ['Ha 656nm', 'Hb 486nm',
      'Ar I 696nm'],
    molecularSystems: ['H2 Fulcher (600-640nm)'],
    atomicMass_amu: 2.016
  },
  {
    id: 'n2_h2',
    name: 'N₂/H₂ mix',
    formula: 'N₂+H₂',
    icon: '🟣',
    keyEmissions: ['Ha 656nm', 'N I 742nm'],
    molecularSystems: ['N2 SPS (337nm)',
      'NH (336nm)',
      'H2 Fulcher (600-640nm)'],
    atomicMass_amu: 2.016
  },
  {
    id: 'ar_n2',
    name: 'Ar/N₂ mix',
    formula: 'Ar+N₂',
    icon: '🔵',
    keyEmissions: ['Ar I 696nm', 'N I 742nm'],
    molecularSystems: ['N2 SPS (337nm)'],
    atomicMass_amu: 28.014
  }
];

// ─────────────────────────────────────────────
// MEASUREMENT GOALS
// ─────────────────────────────────────────────

export type GoalId =
  | 'Te'
  | 'ne'
  | 'Tgas'
  | 'Tvib'
  | 'species'
  | 'chemistry';

export interface MeasurementGoal {
  id: GoalId;
  name: string;
  symbol: string;
  icon: string;
  description: string;
  unit: string;
}

export const MEASUREMENT_GOALS: MeasurementGoal[] = [
  {
    id: 'Te',
    name: 'Electron Temperature',
    symbol: 'Tₑ',
    icon: '⚡',
    description: 'Energy of free electrons in the plasma',
    unit: 'eV'
  },
  {
    id: 'ne',
    name: 'Electron Density',
    symbol: 'nₑ',
    icon: '🔢',
    description: 'Number density of free electrons',
    unit: 'cm⁻³'
  },
  {
    id: 'Tgas',
    name: 'Gas Temperature',
    symbol: 'Tgas',
    icon: '🌡️',
    description: 'Heavy particle kinetic temperature',
    unit: 'K'
  },
  {
    id: 'Tvib',
    name: 'Vibrational Temperature',
    symbol: 'Tvib',
    icon: '〰️',
    description: 'Internal vibrational excitation of molecules',
    unit: 'K'
  },
  {
    id: 'species',
    name: 'Species Identification',
    symbol: 'ID',
    icon: '🔍',
    description: 'Identify which atoms and molecules are present',
    unit: ''
  },
  {
    id: 'chemistry',
    name: 'Plasma Chemistry',
    symbol: 'Chem',
    icon: '⚗️',
    description: 'Track radical production and chemical reactions',
    unit: ''
  }
];

// ─────────────────────────────────────────────
// WAVELENGTH RANGES
// ─────────────────────────────────────────────

export type WavelengthRangeId =
  | 'uv'
  | 'vis'
  | 'nir'
  | 'full';

export interface WavelengthRange {
  id: WavelengthRangeId;
  name: string;
  range: string;
  min_nm: number;
  max_nm: number;
  requiresQuartz: boolean;
  note: string;
}

export const WAVELENGTH_RANGES: WavelengthRange[] = [
  {
    id: 'uv',
    name: 'UV',
    range: '200–400 nm',
    min_nm: 200,
    max_nm: 400,
    requiresQuartz: true,
    note: 'Requires quartz optics and UV fiber'
  },
  {
    id: 'vis',
    name: 'Visible',
    range: '400–700 nm',
    min_nm: 400,
    max_nm: 700,
    requiresQuartz: false,
    note: 'Standard glass optics and fiber'
  },
  {
    id: 'nir',
    name: 'Near-IR',
    range: '700–1100 nm',
    min_nm: 700,
    max_nm: 1100,
    requiresQuartz: false,
    note: 'NIR-enhanced detector recommended'
  },
  {
    id: 'full',
    name: 'Full range',
    range: '200–1100 nm',
    min_nm: 200,
    max_nm: 1100,
    requiresQuartz: true,
    note: 'Echelle spectrometer or multiple gratings'
  }
];

// ─────────────────────────────────────────────
// SPECTROMETER RECOMMENDATIONS
// ─────────────────────────────────────────────

export interface SpectrometerRec {
  name: string;
  manufacturer: string;
  type: string;
  focalLength_mm: number;
  resolution_nm: number;
  wavelength_range: string;
  detector: string;
  bestFor: string[];
  priceClass: 'budget' | 'mid' | 'high';
  note: string;
}

export const SPECTROMETERS: SpectrometerRec[] = [
  {
    name: 'HR4000',
    manufacturer: 'Ocean Insight',
    type: 'Grating (compact)',
    focalLength_mm: 101,
    resolution_nm: 0.02,
    wavelength_range: '200–1100 nm',
    detector: 'CCD 3648 pixels',
    bestFor: ['species', 'chemistry', 'Te'],
    priceClass: 'budget',
    note: 'Best value compact spectrometer. Good for survey.'
  },
  {
    name: 'iHR 320',
    manufacturer: 'Horiba',
    type: 'Czerny-Turner',
    focalLength_mm: 320,
    resolution_nm: 0.04,
    wavelength_range: '185–900 nm',
    detector: 'CCD or ICCD',
    bestFor: ['Te', 'ne', 'Tgas', 'Tvib'],
    priceClass: 'mid',
    note: 'Excellent for molecular fitting. High resolution.'
  },
  {
    name: 'iHR 550',
    manufacturer: 'Horiba',
    type: 'Czerny-Turner',
    focalLength_mm: 550,
    resolution_nm: 0.02,
    wavelength_range: '185–900 nm',
    detector: 'CCD or ICCD',
    bestFor: ['ne', 'Tgas', 'Tvib', 'Te'],
    priceClass: 'high',
    note: 'Best for Stark broadening. Resolves Hα wings.'
  },
  {
    name: 'IsoPlane 320',
    manufacturer: 'Princeton Instruments',
    type: 'Czerny-Turner (aberration-corrected)',
    focalLength_mm: 320,
    resolution_nm: 0.03,
    wavelength_range: '200–1000 nm',
    detector: 'EMCCD or ICCD',
    bestFor: ['ne', 'Te', 'Tgas'],
    priceClass: 'high',
    note: 'Flat-field design. Excellent for 2D imaging.'
  },
  {
    name: 'Shamrock 500i',
    manufacturer: 'Andor',
    type: 'Czerny-Turner',
    focalLength_mm: 500,
    resolution_nm: 0.015,
    wavelength_range: '200–1200 nm',
    detector: 'iCCD or Newton CCD',
    bestFor: ['ne', 'Tgas', 'Tvib', 'Te'],
    priceClass: 'high',
    note: 'Research grade. Best for time-resolved diagnostics.'
  },
  {
    name: 'AvaSpec-ULS2048',
    manufacturer: 'Avantes',
    type: 'Czerny-Turner (compact)',
    focalLength_mm: 75,
    resolution_nm: 0.05,
    wavelength_range: '200–1100 nm',
    detector: 'CCD 2048 pixels',
    bestFor: ['species', 'chemistry'],
    priceClass: 'budget',
    note: 'Fast readout. Good for emission survey measurements.'
  },
  {
    name: 'Jobin-Yvon HR 1000',
    manufacturer: 'Horiba',
    type: '1m Czerny-Turner',
    focalLength_mm: 1000,
    resolution_nm: 0.005,
    wavelength_range: '185–1000 nm',
    detector: 'CCD or PMT',
    bestFor: ['ne', 'Tgas'],
    priceClass: 'high',
    note: 'Ultra-high resolution. Ideal for Stark broadening.'
  }
];

// ─────────────────────────────────────────────
// DIAGNOSTIC LINE RECOMMENDATIONS
// Indexed by [goal][gas]
// ─────────────────────────────────────────────

export interface DiagnosticLineRec {
  line: string;
  wavelength_nm: number;
  goal: GoalId;
  method: string;
  priority: 'primary' | 'secondary' | 'backup';
  minResolution_nm: number;
  notes: string;
  toolLink?: string;
}

export const DIAGNOSTIC_LINES: DiagnosticLineRec[] = [
  // ── Te diagnostics ───────────────────────
  {
    line: 'Ar I multiplet',
    wavelength_nm: 720,
    goal: 'Te',
    method: 'Boltzmann plot',
    priority: 'primary',
    minResolution_nm: 0.1,
    notes: 'Use Ar I lines 696-811nm. Need 5+ lines.',
    toolLink: 'boltzmann'
  },
  {
    line: 'He I 587nm + 667nm',
    wavelength_nm: 587,
    goal: 'Te',
    method: 'Line ratio or Boltzmann',
    priority: 'primary',
    minResolution_nm: 0.1,
    notes: 'He line ratios give Te in He plasma.',
    toolLink: 'boltzmann'
  },
  // ── ne diagnostics ───────────────────────
  {
    line: 'Hα 656nm',
    wavelength_nm: 656.3,
    goal: 'ne',
    method: 'Stark broadening (Gigosos)',
    priority: 'primary',
    minResolution_nm: 0.05,
    notes: 'Gold standard. Needs < 0.05nm resolution.',
    toolLink: 'stark'
  },
  {
    line: 'Hβ 486nm',
    wavelength_nm: 486.1,
    goal: 'ne',
    method: 'Stark broadening (Gigosos)',
    priority: 'secondary',
    minResolution_nm: 0.05,
    notes: 'Better at high ne where Hα is too broad.',
    toolLink: 'stark'
  },
  {
    line: 'He I 587nm',
    wavelength_nm: 587.6,
    goal: 'ne',
    method: 'Stark broadening',
    priority: 'secondary',
    minResolution_nm: 0.05,
    notes: 'Use in He plasma without H.',
    toolLink: 'stark'
  },
  // ── Tgas diagnostics ─────────────────────
  {
    line: 'OH A-X 306nm',
    wavelength_nm: 306,
    goal: 'Tgas',
    method: 'Rotational fitting',
    priority: 'primary',
    minResolution_nm: 0.05,
    notes: 'Trot = Tgas in atmospheric plasma. Need UV optics.',
    toolLink: 'molfit'
  },
  {
    line: 'N2 SPS 337nm',
    wavelength_nm: 337,
    goal: 'Tgas',
    method: 'Rotational fitting',
    priority: 'primary',
    minResolution_nm: 0.1,
    notes: 'Trot ~ Tgas at p > 10 Torr.',
    toolLink: 'molfit'
  },
  {
    line: 'H2 Fulcher 620nm',
    wavelength_nm: 620,
    goal: 'Tgas',
    method: 'Boltzmann Q-branch',
    priority: 'primary',
    minResolution_nm: 0.1,
    notes: 'Best for H2 and Ar/H2 plasma.',
    toolLink: 'h2temp'
  },
  {
    line: 'NH 336nm',
    wavelength_nm: 336,
    goal: 'Tgas',
    method: 'Rotational fitting',
    priority: 'secondary',
    minResolution_nm: 0.1,
    notes: 'Use in N2/H2 plasma.',
    toolLink: 'molfit'
  },
  // ── Tvib diagnostics ─────────────────────
  {
    line: 'N2 SPS 300-400nm',
    wavelength_nm: 337,
    goal: 'Tvib',
    method: 'Vibrational band fitting',
    priority: 'primary',
    minResolution_nm: 0.1,
    notes: 'Tvib from relative band head intensities.',
    toolLink: 'molfit'
  },
  {
    line: 'C2 Swan 516nm',
    wavelength_nm: 516,
    goal: 'Tvib',
    method: 'Vibrational band fitting',
    priority: 'primary',
    minResolution_nm: 0.1,
    notes: 'Use in hydrocarbon plasma.',
    toolLink: 'molfit'
  },
  // ── Species diagnostics ──────────────────
  {
    line: 'NIST database survey',
    wavelength_nm: 500,
    goal: 'species',
    method: 'Line identification',
    priority: 'primary',
    minResolution_nm: 0.1,
    notes: 'Survey full spectrum, match to NIST database.',
    toolLink: 'nist_search'
  },
  // ── Chemistry diagnostics ────────────────
  {
    line: 'OH 306nm + NO 226nm',
    wavelength_nm: 306,
    goal: 'chemistry',
    method: 'Radical emission monitoring',
    priority: 'primary',
    minResolution_nm: 0.1,
    notes: 'Track OH and NOx production in air plasma.',
    toolLink: 'molfit'
  }
];

// ─────────────────────────────────────────────
// OPTICAL SETUP RECOMMENDATIONS
// ─────────────────────────────────────────────

export interface OpticalSetupRec {
  component: string;
  specification: string;
  reason: string;
  forPressure: ('low' | 'mid' | 'high' | 'any')[];
}

export const OPTICAL_SETUPS: Record<
  WavelengthRangeId,
  OpticalSetupRec[]
> = {
  uv: [
    {
      component: 'Collection lens',
      specification: 'UV-grade fused silica, f=50-100mm, f/2-f/4',
      reason: 'Silica transmits down to 180nm. Glass blocks UV.',
      forPressure: ['any']
    },
    {
      component: 'Optical fiber',
      specification: 'UV-VIS solarization-resistant, 200μm core, NA=0.22',
      reason: 'Standard fibers absorb UV. Use OH-free silica.',
      forPressure: ['any']
    },
    {
      component: 'Slit width',
      specification: '25-100 μm',
      reason: 'Narrower slit = better resolution for OH and NO bands.',
      forPressure: ['any']
    }
  ],
  vis: [
    {
      component: 'Collection lens',
      specification: 'BK7 glass, f=75-150mm, f/3-f/6',
      reason: 'Standard glass works well for 400-700nm.',
      forPressure: ['any']
    },
    {
      component: 'Optical fiber',
      specification: 'VIS-NIR fiber, 400μm core, NA=0.22',
      reason: 'Good transmission in visible range.',
      forPressure: ['any']
    },
    {
      component: 'Slit width',
      specification: '50-200 μm',
      reason: 'Balance signal vs resolution for atomic lines.',
      forPressure: ['any']
    }
  ],
  nir: [
    {
      component: 'Collection lens',
      specification: 'BK7 or NIR-coated, f=100mm, f/4',
      reason: 'Standard glass works in NIR range.',
      forPressure: ['any']
    },
    {
      component: 'Optical fiber',
      specification: 'NIR fiber, 600μm core, NA=0.22',
      reason: 'Larger core for better NIR signal collection.',
      forPressure: ['any']
    },
    {
      component: 'Detector',
      specification: 'NIR-enhanced Si CCD or InGaAs',
      reason: 'Standard CCD sensitivity drops above 900nm.',
      forPressure: ['any']
    }
  ],
  full: [
    {
      component: 'Spectrometer type',
      specification: 'Echelle spectrometer',
      reason: 'Covers full range in one acquisition.',
      forPressure: ['any']
    },
    {
      component: 'Collection lens',
      specification: 'UV-grade fused silica, f=75mm, f/2',
      reason: 'Must transmit from 200nm for full range.',
      forPressure: ['any']
    },
    {
      component: 'Optical fiber',
      specification: 'UV-VIS-NIR solarization-resistant, 200μm, NA=0.22',
      reason: 'Covers full range without absorption cutoff.',
      forPressure: ['any']
    }
  ]
};

// ─────────────────────────────────────────────
// TECHNIQUE RECOMMENDATIONS
// ─────────────────────────────────────────────

export interface TechniqueRec {
  name: string;
  acronym: string;
  description: string;
  bestFor: GoalId[];
  requiresLaser: boolean;
  complexity: 'low' | 'medium' | 'high';
  note: string;
}

export const TECHNIQUES: TechniqueRec[] = [
  {
    name: 'Optical Emission Spectroscopy',
    acronym: 'OES',
    description: 'Passive collection of plasma emission',
    bestFor: ['Te', 'ne', 'Tgas', 'Tvib', 'species', 'chemistry'],
    requiresLaser: false,
    complexity: 'low',
    note: 'Always try OES first. No perturbation of plasma.'
  },
  {
    name: 'Laser-Induced Fluorescence',
    acronym: 'LIF',
    description: 'Laser excites specific species for detection',
    bestFor: ['species', 'chemistry', 'Tgas'],
    requiresLaser: true,
    complexity: 'high',
    note: 'Best for absolute density measurements of radicals.'
  },
  {
    name: 'Thomson Scattering',
    acronym: 'TS',
    description: 'Laser scattering from free electrons',
    bestFor: ['Te', 'ne'],
    requiresLaser: true,
    complexity: 'high',
    note: 'Most accurate Te and ne. Very complex setup.'
  },
  {
    name: 'Rayleigh Scattering',
    acronym: 'RS',
    description: 'Laser scattering from neutral gas',
    bestFor: ['Tgas'],
    requiresLaser: true,
    complexity: 'medium',
    note: 'Accurate Tgas from gas density measurement.'
  }
];
