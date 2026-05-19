import {
  PlasmaSourceId,
  GasId,
  GoalId,
  WavelengthRangeId,
  PlasmaSource,
  WorkingGas,
  MeasurementGoal,
  WavelengthRange,
  SpectrometerRec,
  DiagnosticLineRec,
  OpticalSetupRec,
  TechniqueRec,
  PLASMA_SOURCES,
  WORKING_GASES,
  MEASUREMENT_GOALS,
  WAVELENGTH_RANGES,
  SPECTROMETERS,
  DIAGNOSTIC_LINES,
  OPTICAL_SETUPS,
  TECHNIQUES
} from '../data/advisor_database';

// ─────────────────────────────────────────────
// USER SELECTION
// ─────────────────────────────────────────────

export interface AdvisorSelection {
  source:    PlasmaSourceId | null;
  gas:       GasId | null;
  goals:     GoalId[];
  wlRange:   WavelengthRangeId | null;
}

// ─────────────────────────────────────────────
// RECOMMENDATION OUTPUT
// ─────────────────────────────────────────────

export interface AdvisorWarning {
  level: 'info' | 'caution' | 'warning';
  message: string;
}

export interface RecommendedLine {
  line: DiagnosticLineRec;
  score: number;
  inRange: boolean;
  reason: string;
}

export interface RecommendedSpectrometer {
  spec: SpectrometerRec;
  score: number;
  reasons: string[];
}

export interface AdvisorResult {
  source:          PlasmaSource | null;
  gas:             WorkingGas | null;
  goals:           MeasurementGoal[];
  wlRange:         WavelengthRange | null;
  warnings:        AdvisorWarning[];
  techniques:      TechniqueRec[];
  lines:           RecommendedLine[];
  spectrometers:   RecommendedSpectrometer[];
  opticalSetup:    OpticalSetupRec[];
  resolutionNeeded_nm: number;
  summary:         string;
  plasmaParams:    {
    label: string;
    value: string;
    color: string;
  }[];
}

// ─────────────────────────────────────────────
// MAIN ENGINE FUNCTION
// ─────────────────────────────────────────────

export function runAdvisor(
  sel: AdvisorSelection
): AdvisorResult | null {

  // Need at least source + goal to give advice
  if (!sel.source || sel.goals.length === 0) {
    return null;
  }

  const source  = PLASMA_SOURCES.find(
    s => s.id === sel.source
  ) ?? null;
  const gas     = sel.gas
    ? WORKING_GASES.find(g => g.id === sel.gas) ?? null
    : null;
  const goals   = MEASUREMENT_GOALS.filter(
    g => sel.goals.includes(g.id)
  );
  const wlRange = sel.wlRange
    ? WAVELENGTH_RANGES.find(w => w.id === sel.wlRange) ?? null
    : null;

  if (!source) return null;

  const warnings: AdvisorWarning[] = [];

  // ── WARNINGS ──────────────────────────────

  // Stark broadening feasibility check
  if (sel.goals.includes('ne')) {
    const neMax = source.ne_range[1];
    if (neMax < 1e13) {
      warnings.push({
        level: 'warning',
        message:
          `Electron density in ${source.name} is typically ` +
          `below 10¹³ cm⁻³. Stark broadening of Hα may be ` +
          `too small to measure reliably. Consider Thomson ` +
          `scattering or microwave interferometry instead.`
      });
    }
    if (sel.wlRange === 'nir') {
      warnings.push({
        level: 'caution',
        message:
          'NIR range misses Hα (656nm) and Hβ (486nm). ' +
          'Switch to VIS range for Stark broadening.'
      });
    }
  }

  // OH requires UV optics
  if (sel.goals.includes('Tgas') &&
      (sel.gas === 'air' || sel.gas === 'ar_h2' ||
       sel.gas === 'n2_h2') &&
      sel.wlRange === 'vis') {
    warnings.push({
      level: 'caution',
      message:
        'OH rotational temperature (306nm) requires UV ' +
        'optics and UV-grade fiber. Your selected VIS range ' +
        'misses OH. Consider N2 SPS (337nm) instead, or ' +
        'extend range to include UV.'
    });
  }

  // Arc plasma Te warning
  if (sel.source === 'arc' && sel.goals.includes('Te')) {
    warnings.push({
      level: 'info',
      message:
        'Arc plasma is near LTE. Boltzmann plot gives ' +
        'excitation temperature, not true Tₑ. ' +
        'Consider Saha equation approach for LTE plasmas.'
    });
  }

  // DBD ne warning
  if (sel.source === 'dbd' && sel.goals.includes('ne')) {
    warnings.push({
      level: 'caution',
      message:
        'DBD electron density is typically 10¹¹-10¹⁴ cm⁻³. ' +
        'Hα Stark width will be very small (<0.05nm). ' +
        'You need a high-resolution spectrometer (>1m focal ' +
        'length or echelle) to measure it reliably.'
    });
  }

  // Molecular gas + Te warning
  if (sel.goals.includes('Te') &&
      (sel.gas === 'n2' || sel.gas === 'air' ||
       sel.gas === 'o2') &&
      !sel.goals.includes('ne')) {
    warnings.push({
      level: 'info',
      message:
        'Boltzmann plot for Te works best with atomic lines ' +
        '(Ar I, He I). In N₂/air plasma, Te measurement ' +
        'from atomic lines is difficult. ' +
        'Consider adding Ar as a tracer gas (1-5%).'
    });
  }

  // ── TECHNIQUES ────────────────────────────

  // Always recommend OES first
  const techniques = TECHNIQUES.filter(t =>
    t.bestFor.some(g => sel.goals.includes(g))
  ).sort((a, b) => {
    // OES always first
    if (a.acronym === 'OES') return -1;
    if (b.acronym === 'OES') return 1;
    // Non-laser before laser
    if (!a.requiresLaser && b.requiresLaser) return -1;
    if (a.requiresLaser && !b.requiresLaser) return 1;
    return 0;
  });

  // ── DIAGNOSTIC LINES ──────────────────────

  const wlMin = wlRange?.min_nm ?? 200;
  const wlMax = wlRange?.max_nm ?? 1100;

  const scoredLines: RecommendedLine[] = DIAGNOSTIC_LINES
    .filter(line => sel.goals.includes(line.goal))
    .map(line => {
      const inRange =
        line.wavelength_nm >= wlMin &&
        line.wavelength_nm <= wlMax;

      let score = 0;
      let reasons: string[] = [];

      // Priority score
      if (line.priority === 'primary') {
        score += 30;
        reasons.push('primary diagnostic');
      }
      else if (line.priority === 'secondary') {
        score += 15;
        reasons.push('secondary diagnostic');
      }
      else {
        score += 5;
        reasons.push('backup option');
      }

      // In range bonus
      if (inRange) {
        score += 20;
        reasons.push('within your wavelength range');
      } else {
        score -= 20;
        reasons.push('outside your wavelength range');
      }

      // Gas compatibility
      if (gas) {
        const gasLines = [
          ...gas.keyEmissions,
          ...gas.molecularSystems
        ].join(' ').toLowerCase();

        const lineLower = line.line.toLowerCase();
        if (gasLines.includes('ha') &&
            lineLower.includes('h')) {
          score += 15;
          reasons.push('matches your gas');
        }
        if (gasLines.includes('n2') &&
            lineLower.includes('n2')) {
          score += 15;
          reasons.push('matches your gas');
        }
        if (gasLines.includes('oh') &&
            lineLower.includes('oh')) {
          score += 15;
          reasons.push('matches your gas');
        }
        if (gasLines.includes('ar') &&
            lineLower.includes('ar')) {
          score += 15;
          reasons.push('matches your gas');
        }
        if (gasLines.includes('he') &&
            lineLower.includes('he')) {
          score += 15;
          reasons.push('matches your gas');
        }
        if (gasLines.includes('h2') &&
            lineLower.includes('h2')) {
          score += 15;
          reasons.push('matches your gas');
        }
      }

      // Source compatibility for ne
      if (line.goal === 'ne') {
        const neMin = source.ne_range[0];
        const neMax = source.ne_range[1];
        if (neMax >= 1e14) {
          score += 10;
          reasons.push('ne high enough for Stark');
        }
        if (neMin < 1e13) {
          score -= 10;
          reasons.push('ne may be too low for Stark');
        }
      }

      return {
        line,
        score,
        inRange,
        reason: reasons.slice(0, 2).join(', ')
      };
    })
    .sort((a, b) => b.score - a.score);

  // ── SPECTROMETERS ─────────────────────────

  // Determine minimum resolution needed
  let resolutionNeeded = 0.1; // default nm

  if (sel.goals.includes('ne')) {
    resolutionNeeded = 0.03;
  }
  if (sel.goals.includes('Tgas') ||
      sel.goals.includes('Tvib')) {
    resolutionNeeded = Math.min(
      resolutionNeeded, 0.05
    );
  }
  if (sel.goals.includes('Te')) {
    resolutionNeeded = Math.min(
      resolutionNeeded, 0.1
    );
  }

  const scoredSpecs: RecommendedSpectrometer[] =
    SPECTROMETERS.map(spec => {
      let score = 0;
      const reasons: string[] = [];

      // Resolution match
      if (spec.resolution_nm <= resolutionNeeded) {
        score += 30;
        reasons.push(
          `Resolution ${spec.resolution_nm}nm ` +
          `meets your need of ${resolutionNeeded}nm`
        );
      } else {
        score -= 20;
        reasons.push(
          `Resolution ${spec.resolution_nm}nm ` +
          `may be insufficient (need ${resolutionNeeded}nm)`
        );
      }

      // Goal match
      sel.goals.forEach(goal => {
        if (spec.bestFor.includes(goal)) {
          score += 15;
          reasons.push(`suited for ${goal} measurement`);
        }
      });

      // Price class weight
      if (spec.priceClass === 'budget') score += 5;
      if (spec.priceClass === 'mid')    score += 10;

      return { spec, score, reasons };
    })
    .sort((a, b) => b.score - a.score);

  // ── OPTICAL SETUP ─────────────────────────

  const opticalSetup = wlRange
    ? OPTICAL_SETUPS[wlRange.id] ?? OPTICAL_SETUPS.vis
    : OPTICAL_SETUPS.vis;

  // ── PLASMA PARAMETERS ─────────────────────

  const plasmaParams = [
    {
      label: 'Tₑ range',
      value: `${source.Te_eV_range[0]}–${source.Te_eV_range[1]} eV`,
      color: '#00f0ff'
    },
    {
      label: 'nₑ range',
      value: formatNeRange(source.ne_range),
      color: '#00f0ff'
    },
    {
      label: 'Tgas range',
      value: `${source.Tgas_range[0]}–${source.Tgas_range[1]} K`,
      color: '#ff6b35'
    },
    {
      label: 'Pressure',
      value: source.pressureRange,
      color: '#b400ff'
    },
    {
      label: 'Equilibrium',
      value: source.isEquilibrium ? 'LTE / thermal' : 'Non-equilibrium',
      color: source.isEquilibrium ? '#ff6b35' : '#00f0ff'
    }
  ];

  // ── SUMMARY TEXT ──────────────────────────

  const goalNames = goals.map(g => g.name).join(', ');
  const gasName   = gas ? gas.name : 'your gas';
  const topLine   = scoredLines[0]?.line.line ?? 'OES survey';
  const topSpec   = scoredSpecs[0]?.spec.name ?? 'iHR 320';

  const summary =
    `For ${source.fullName} with ${gasName}, ` +
    `measuring ${goalNames}: ` +
    `Use OES with ${topLine} as primary diagnostic. ` +
    `Recommended spectrometer: ${topSpec}.`;

  return {
    source,
    gas,
    goals,
    wlRange,
    warnings,
    techniques,
    lines: scoredLines.slice(0, 6),
    spectrometers: scoredSpecs.slice(0, 4),
    opticalSetup,
    resolutionNeeded_nm: resolutionNeeded,
    summary,
    plasmaParams
  };
}

// ─────────────────────────────────────────────
// HELPER: format ne range for display
// ─────────────────────────────────────────────

function formatNeRange(
  range: [number, number]
): string {
  const fmt = (n: number): string => {
    const exp = Math.floor(Math.log10(n));
    const man = n / Math.pow(10, exp);
    return `${man.toFixed(0)}×10${expStr(exp)}`;
  };
  const expStr = (e: number): string => {
    const sup: Record<string, string> = {
      '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴',
      '5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'
    };
    return String(e).split('').map(
      c => sup[c] ?? c
    ).join('');
  };
  return `${fmt(range[0])} – ${fmt(range[1])} cm⁻³`;
}

// ─────────────────────────────────────────────
// HELPER: check if selection is complete
// ─────────────────────────────────────────────

export function isSelectionComplete(
  sel: AdvisorSelection
): boolean {
  return (
    sel.source !== null &&
    sel.goals.length > 0 &&
    sel.wlRange !== null
  );
}

// ─────────────────────────────────────────────
// HELPER: get tool navigation key for a goal
// ─────────────────────────────────────────────

export function getToolLink(
  toolLink: string | undefined
): string | null {
  const map: Record<string, string> = {
    'boltzmann':  'boltzmann',
    'stark':      'stark',
    'molfit':     'molfit',
    'h2temp':     'h2temp',
    'nist_search':'nist_search'
  };
  return toolLink ? (map[toolLink] ?? null) : null;
}
