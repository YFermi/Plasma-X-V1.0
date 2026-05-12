import { SAMPLE_DATA, SpectralLine } from '../data/nist_samples';

export interface NistSearchParams {
  element: string;          // "Ar" or "Fe"
  ion?: string;             // "I", "II", "III" (optional)
  wavelengthMin?: number;   // in nm
  wavelengthMax?: number;   // in nm
  unit?: "nm" | "A" | "cm1";  // default nm
  maxLines?: number;        // default 100
  minAccuracy?: "AAA" | "A" | "B" | "C" | "D";  // filter
}

export interface NistLine {
  wavelength: number;
  wavelengthVac?: number;
  element: string;
  ion: string;
  aki: number | null;
  gk: number | null;
  gi: number | null;
  accuracy: string;
  energyLow: number | null;
  energyHigh: number | null;
  confLow: string;
  confHigh: string;
  termLow: string;
  termHigh: string;
  jLow: string;
  jHigh: string;
}

export interface NistResponse {
  source: "nist-live" | "github-backup" | "local-cache" | "fallback";
  timestamp: string;
  element: string;
  ion: string;
  count: number;
  lines: NistLine[];
  warning?: string;
}

export function buildNistUrl(params: NistSearchParams): string {
  const spectra = params.ion ? `${params.element}+${params.ion}` : params.element;
  
  const urlParams = new URLSearchParams();
  urlParams.set("spectra", spectra);
  if (params.wavelengthMin !== undefined) urlParams.set("low_w", params.wavelengthMin.toString());
  if (params.wavelengthMax !== undefined) urlParams.set("upp_w", params.wavelengthMax.toString());
  
  let unitCode = "1"; // Default nm
  if (params.unit === "A") unitCode = "2";
  if (params.unit === "cm1") unitCode = "3";
  
  urlParams.set("unit", unitCode);
  urlParams.set("submit", "Retrieve Data");
  urlParams.set("format", "3");
  urlParams.set("line_out", "1");
  urlParams.set("en_unit", "1");
  urlParams.set("output", "0");
  urlParams.set("bibrefs", "1");
  urlParams.set("page_size", (params.maxLines || 500).toString());
  urlParams.set("show_obs_wl", "1");
  urlParams.set("show_calc_wl", "1");
  urlParams.set("unc_out", "1");
  urlParams.set("order_out", "0");
  urlParams.set("A_out", "1");
  urlParams.set("f_out", "on");
  urlParams.set("S_out", "on");
  urlParams.set("intens_out", "on");
  urlParams.set("max_low_enrg", "");
  urlParams.set("max_upp_enrg", "");
  urlParams.set("tsb_value", "0");
  urlParams.set("min_str", "");
  urlParams.set("show_av", "2");

  return "https://physics.nist.gov/cgi-bin/ASD/lines1.pl?" + urlParams.toString();
}

export function parseNistAscii(responseText: string): NistLine[] {
  const lines: NistLine[] = [];
  const textLines = responseText.split('\n');

  for (const tLine of textLines) {
    if (!tLine.trim() || tLine.startsWith('-') || tLine.startsWith('=')) continue;
    if (tLine.toLowerCase().includes('observed') || tLine.toLowerCase().includes('element')) continue;

    const parts = tLine.split('|').map(s => s.trim());
    if (parts.length < 8) continue; // Basic check for data line
    if (parts[0] !== '') continue; // The line usually starts with a pipe, making parts[0] empty

    let elementStr = "Unknown";
    let ionStr = "";
    if (parts[1]) {
      const elParts = parts[1].replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/);
      if (elParts.length > 0) elementStr = elParts[0];
      if (elParts.length > 1) ionStr = elParts[1];
    }
    
    const obsWl = parseFloat(parts[2]);
    const ritzWl = parseFloat(parts[3]);
    const wavelength = !isNaN(obsWl) ? obsWl : (!isNaN(ritzWl) ? ritzWl : 0);

    if (wavelength === 0) continue;

    let aki: number | null = parseFloat(parts[5]?.replace(/[^0-9.eE+-]/g, ''));
    if (isNaN(aki)) aki = null;

    let accuracy = parts[6] || "";

    const energyParts = (parts[7] || "").split('-');
    let energyLow: number | null = parseFloat(energyParts[0]);
    let energyHigh: number | null = parseFloat(energyParts[1]);
    if (isNaN(energyLow)) energyLow = null;
    if (isNaN(energyHigh)) energyHigh = null;

    const confParts = (parts[8] || "").split('-');
    let confLow = confParts[0]?.trim() || "";
    let confHigh = confParts[1]?.trim() || "";
    
    const termParts = (parts[9] || "").split('-');
    let termLow = termParts[0]?.trim() || "";
    let termHigh = termParts[1]?.trim() || "";

    const jParts = (parts[10] || "").split('-');
    let jLow = jParts[0]?.trim() || "";
    let jHigh = jParts[1]?.trim() || "";

    const gParts = (parts[11] || "").split('-');
    let gi: number | null = parseFloat(gParts[0]);
    let gk: number | null = parseFloat(gParts[1]);
    if (isNaN(gi)) gi = null;
    if (isNaN(gk)) gk = null;

    lines.push({
      wavelength,
      element: elementStr,
      ion: ionStr,
      aki,
      gk,
      gi,
      accuracy,
      energyLow,
      energyHigh,
      confLow,
      confHigh,
      termLow,
      termHigh,
      jLow,
      jHigh
    });
  }

  return lines;
}

export function cacheResult(params: NistSearchParams, lines: NistLine[]): void {
  try {
    const key = `plasma-x-nist-${params.element.toLowerCase()}-${(params.ion || 'all').toLowerCase()}-${params.wavelengthMin || 'none'}-${params.wavelengthMax || 'none'}`;
    const data = {
      lines,
      timestamp: new Date().toISOString(),
      params
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to cache NIST data", e);
  }
}

export function getCachedResult(params: NistSearchParams): { lines: NistLine[], timestamp: string } | null {
  try {
    const key = `plasma-x-nist-${params.element.toLowerCase()}-${(params.ion || 'all').toLowerCase()}-${params.wavelengthMin || 'none'}-${params.wavelengthMax || 'none'}`;
    const val = localStorage.getItem(key);
    if (val) {
      return JSON.parse(val);
    }
  } catch (e) {
    console.error("Failed to read NIST cache", e);
  }
  return null;
}

export function isExpired(cached: { timestamp: string }): boolean {
  if (!cached || !cached.timestamp) return true;
  const ageMs = Date.now() - new Date(cached.timestamp).getTime();
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  return ageMs > maxAgeMs;
}

export function clearNistCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("plasma-x-nist-")) {
      keysToRemove.push(key);
    }
  }
  for (const k of keysToRemove) {
    localStorage.removeItem(k);
  }
}

export function getCacheSize(): number {
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("plasma-x-nist-")) {
      count++;
    }
  }
  return count;
}

export function filterLocalData(params: NistSearchParams): NistLine[] {
  return SAMPLE_DATA
    .filter(line => {
      if (line.element.toLowerCase() !== params.element.toLowerCase()) return false;
      if (params.ion && line.ion !== params.ion) return false;
      if (params.wavelengthMin !== undefined && line.wavelength < params.wavelengthMin) return false;
      if (params.wavelengthMax !== undefined && line.wavelength > params.wavelengthMax) return false;
      return true;
    })
    .map(line => {
      return {
        wavelength: line.wavelength,
        element: line.element,
        ion: line.ion,
        aki: line.aki,
        gk: line.gk,
        gi: line.gi,
        accuracy: line.accuracy,
        energyLow: line.energyLow,
        energyHigh: line.energyHigh,
        confLow: line.confLow,
        confHigh: line.confHigh,
        termLow: line.termLow,
        termHigh: line.termHigh,
        jLow: line.jLow,
        jHigh: line.jHigh,
      } as NistLine;
    })
    .slice(0, params.maxLines || 100);
}

export async function isNistAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    await fetch("https://physics.nist.gov/cgi-bin/ASD/lines1.pl", {
       method: 'HEAD',
       mode: 'no-cors',
       signal: controller.signal
    });
    clearTimeout(id);
    return true;
  } catch (e) {
    return false;
  }
}

export async function fetchNistData(params: NistSearchParams): Promise<NistResponse> {
  // LAYER 1 — Try fetching from NIST directly
  try {
    const url = buildNistUrl(params);
    const response = await fetch(url, { 
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
    });
    
    if (response.ok) {
      const text = await response.text();
      const lines = parseNistAscii(text);
      
      // Cache successful result in localStorage
      cacheResult(params, lines);
      
      return {
        source: "nist-live",
        timestamp: new Date().toISOString(),
        element: params.element,
        ion: params.ion || "all",
        count: lines.length,
        lines: lines
      };
    }
  } catch (error) {
    console.warn("NIST live fetch failed:", error);
  }

  // LAYER 2 — Check localStorage cache
  const cached = getCachedResult(params);
  if (cached && !isExpired(cached)) {
    return {
      source: "local-cache",
      timestamp: cached.timestamp,
      element: params.element,
      ion: params.ion || "all",
      count: cached.lines.length,
      lines: cached.lines,
      warning: "Using cached data. Internet may be unavailable."
    };
  }

  // LAYER 3 — Return what we have locally
  const localLines = filterLocalData(params);
  return {
    source: "fallback",
    timestamp: new Date().toISOString(),
    element: params.element,
    ion: params.ion || "all", 
    count: localLines.length,
    lines: localLines,
    warning: "NIST unreachable. Using local database (145 lines)."
  };
}
