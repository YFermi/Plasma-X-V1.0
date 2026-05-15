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
  element: string;
  ion: string;
  wavelength: number;
  obsWavelength: number | null;
  ritzWavelength: number | null;
  unc: string;
  relInt: string;
  aki: number | null;
  accuracy: string;
  energyLow: string;
  energyHigh: string;
  confLow: string;
  confHigh: string;
  termLow: string;
  termHigh: string;
  jLow: string;
  jHigh: string;
  type: string;
  tpRef: string;
  lineRef: string;
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
  const urlParams = new URLSearchParams();
  urlParams.set("element", params.element);
  if (params.ion) urlParams.set("ion", params.ion);
  if (params.wavelengthMin !== undefined) urlParams.set("wavelengthMin", params.wavelengthMin.toString());
  if (params.wavelengthMax !== undefined) urlParams.set("wavelengthMax", params.wavelengthMax.toString());
  if (params.unit) urlParams.set("unit", params.unit);
  if (params.maxLines !== undefined) urlParams.set("maxLines", params.maxLines.toString());
  
  return "/api/nist-proxy?" + urlParams.toString();
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
    const key = `plasma-x-nist-v3-${params.element.toLowerCase()}-${(params.ion || 'all').toLowerCase()}-${params.wavelengthMin || 'none'}-${params.wavelengthMax || 'none'}`;
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
    const key = `plasma-x-nist-v3-${params.element.toLowerCase()}-${(params.ion || 'all').toLowerCase()}-${params.wavelengthMin || 'none'}-${params.wavelengthMax || 'none'}`;
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
        obsWavelength: line.wavelength,
        ritzWavelength: line.wavelength,
        unc: "",
        relInt: "",
        element: line.element,
        ion: line.ion,
        aki: line.aki,
        accuracy: line.accuracy,
        energyLow: line.energyLow?.toString() || "",
        energyHigh: line.energyHigh?.toString() || "",
        confLow: line.confLow,
        confHigh: line.confHigh,
        termLow: line.termLow,
        termHigh: line.termHigh,
        jLow: line.jLow,
        jHigh: line.jHigh,
        type: "",
        tpRef: "",
        lineRef: ""
      } as NistLine;
    })
    .slice(0, params.maxLines || 100);
}

export async function isNistAvailable(): Promise<boolean> {
  try {
    const response = await fetch( // PROXY-FIX
      `/api/nist-proxy?element=Ar&ion=I&wavelengthMin=696&wavelengthMax=697&_bust=${Date.now()}`, // PROXY-FIX
      { signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined } // PROXY-FIX
    ); // PROXY-FIX
    return response.ok && (await response.json()).success; // PROXY-FIX
  } catch (e) {
    return false;
  }
}

export async function fetchNistData(params: NistSearchParams): Promise<NistResponse> {
  // LAYER 1 — Try fetching from NIST directly via proxy
  try {
    const proxyUrl = `/api/nist-proxy?` + new URLSearchParams({ // PROXY-FIX
      element: params.element, // PROXY-FIX
      ion: params.ion || '', // PROXY-FIX
      wavelengthMin: String(params.wavelengthMin || 200), // PROXY-FIX
      wavelengthMax: String(params.wavelengthMax || 1000), // PROXY-FIX
      unit: params.unit || 'nm', // PROXY-FIX
      _bust: String(Date.now())
    }); // PROXY-FIX
    const response = await fetch(proxyUrl); // PROXY-FIX
    const data = await response.json(); // PROXY-FIX
    
    if (data.success) { // PROXY-FIX
      const lines = data.lines;
      
      // Cache successful result in localStorage
      cacheResult(params, lines);
      
      return {
        source: "nist-live", // PROXY-FIX
        timestamp: data.timestamp, // PROXY-FIX
        element: params.element,
        ion: params.ion || "all",
        count: data.count, // PROXY-FIX
        lines: data.lines // PROXY-FIX
      };
    }
  } catch (error) {
    console.warn("NIST proxy fetch failed:", error);
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
