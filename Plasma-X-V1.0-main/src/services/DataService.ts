import { SpectralLine } from '../data/nist_samples';
import { SAMPLE_DATA } from '../data/nist_samples'; // Using this as the local JSON fallback

export const DATA_SOURCES = {
  NIST_LIVE: "nist-live",
  CLOUDFLARE_CACHE: "cloudflare-cache",
  GITHUB_BACKUP: "github-backup",
  LOCAL_JSON: "local-json"
};

const CACHE_PREFIX = "plasma-x-cache-";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const WORKER_URL = "https://nist-proxy.your-worker.workers.dev/api/lines";
const GITHUB_BASE_URL = "https://raw.githubusercontent.com/plasma-x-org/plasma-x-database/main/atomic/by_element";

interface FetchResult {
  lines: SpectralLine[];
  source: string;
  cached: boolean;
  timestamp: string;
  warning?: string;
}

export async function fetchSpectralLines(
  element: string,
  ion: string,
  wavelengthMin?: number,
  wavelengthMax?: number
): Promise<FetchResult> {
  const cacheKey = `${CACHE_PREFIX}${element}-${ion}-${wavelengthMin || 'any'}-${wavelengthMax || 'any'}`;
  
  // LAYER 0: Browser Local Storage Cache
  const cachedDataStr = localStorage.getItem(cacheKey);
  if (cachedDataStr) {
    try {
      const cached = JSON.parse(cachedDataStr);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return {
          lines: cached.lines,
          source: cached.source || DATA_SOURCES.CLOUDFLARE_CACHE,
          cached: true,
          timestamp: new Date(cached.timestamp).toISOString()
        };
      }
    } catch (e) {
      console.warn("Failed to parse cache entry", e);
    }
  }

  const cacheAndReturn = (lines: SpectralLine[], source: string, warning?: string) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        lines,
        source,
        timestamp: Date.now()
      }));
      localStorage.setItem("plasma-x-last-sync", new Date().toISOString());
    } catch (e) {
      console.warn("Failed to save to local storage (quota exceeded?)", e);
    }
    return {
      lines,
      source,
      cached: false,
      timestamp: new Date().toISOString(),
      warning
    };
  };

  // Build params for API
  const params = new URLSearchParams({
    element,
    ion: ion === 'ALL' ? 'all' : ion
  });
  if (wavelengthMin) params.append('wavelength_min', wavelengthMin.toString());
  if (wavelengthMax) params.append('wavelength_max', wavelengthMax.toString());

  // LAYER 1: Cloudflare Worker
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${WORKER_URL}?${params.toString()}`, {
      signal: controller.signal
    });
    clearTimeout(id);

    if (response.ok) {
      const data = await response.json();
      return cacheAndReturn(data.lines, data.source || DATA_SOURCES.NIST_LIVE);
    }
  } catch (error) {
    console.warn(`Layer 1 (Worker) failed for ${element}:`, error);
  }

  // LAYER 2: GitHub Backup
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${GITHUB_BASE_URL}/${element}.json`, {
      signal: controller.signal
    });
    clearTimeout(id);

    if (response.ok) {
      const data: SpectralLine[] = await response.json();
      // Need to manually filter backup data
      const filtered = data.filter(line => {
        const matchIon = ion === 'ALL' || ion === 'all' || line.ion === ion;
        const matchWMin = wavelengthMin ? line.wavelength >= wavelengthMin : true;
        const matchWMax = wavelengthMax ? line.wavelength <= wavelengthMax : true;
        return matchIon && matchWMin && matchWMax;
      });
      return cacheAndReturn(filtered, DATA_SOURCES.GITHUB_BACKUP, "Using backup data. May not include latest NIST updates.");
    }
  } catch (error) {
    console.warn(`Layer 2 (GitHub) failed for ${element}:`, error);
  }

  // LAYER 3: Local JSON Fallback
  const filteredLocal = SAMPLE_DATA.filter(line => {
    const matchElem = line.element === element;
    const matchIon = ion === 'ALL' || ion === 'all' || line.ion === ion;
    const matchWMin = wavelengthMin ? line.wavelength >= wavelengthMin : true;
    const matchWMax = wavelengthMax ? line.wavelength <= wavelengthMax : true;
    return matchElem && matchIon && matchWMin && matchWMax;
  });

  return {
    lines: filteredLocal,
    source: DATA_SOURCES.LOCAL_JSON,
    cached: false,
    timestamp: new Date().toISOString(),
    warning: "Offline mode. Using bundled database." // (145 lines) removed due to dynamic size of sample data, but fits intent
  };
}

export async function checkDataSourceStatus(): Promise<{
  nist_api: "online" | "offline" | "unknown",
  cloudflare_worker: "online" | "offline" | "unknown",
  github_backup: "online" | "offline" | "unknown",
  local_json: "ready",
  active_source: string,
  last_successful_fetch: string
}> {
  const status: {
    nist_api: "online" | "offline" | "unknown",
    cloudflare_worker: "online" | "offline" | "unknown",
    github_backup: "online" | "offline" | "unknown",
    local_json: "ready",
    active_source: string,
    last_successful_fetch: string
  } = {
    nist_api: "unknown" as const,
    cloudflare_worker: "unknown" as const,
    github_backup: "unknown" as const,
    local_json: "ready" as const,
    active_source: DATA_SOURCES.LOCAL_JSON,
    last_successful_fetch: getLastSyncTime() || "Never"
  };

  // Test Cloudflare Worker
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    // Simple fast query to check worker
    const response = await fetch(`${WORKER_URL}?element=H&ion=I&wavelength_min=400&wavelength_max=700`, { signal: controller.signal });
    clearTimeout(id);
    if (response.ok) {
      status.cloudflare_worker = "online";
      const data = await response.json();
      if (data.source === 'nist-live') {
        status.nist_api = "online";
        status.active_source = DATA_SOURCES.NIST_LIVE;
      } else if (data.source === 'github-fallback') {
        status.nist_api = "offline";
        status.active_source = DATA_SOURCES.GITHUB_BACKUP;
      } else {
        status.nist_api = "unknown";
        status.active_source = DATA_SOURCES.CLOUDFLARE_CACHE;
      }
    } else {
      status.cloudflare_worker = "offline";
      status.nist_api = "unknown";
    }
  } catch (e) {
    status.cloudflare_worker = "offline";
    status.nist_api = "unknown";
  }

  // Test GitHub Backup
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${GITHUB_BASE_URL}/H.json`, { method: 'HEAD', signal: controller.signal });
    clearTimeout(id);
    if (response.ok) {
      status.github_backup = "online";
      if (status.cloudflare_worker === "offline") {
        status.active_source = DATA_SOURCES.GITHUB_BACKUP;
      }
    } else {
      status.github_backup = "offline";
    }
  } catch (e) {
    status.github_backup = "offline";
  }

  return status;
}

export function clearLocalCache(): void {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

export function getLocalCacheSize(): number {
  let size = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      const item = localStorage.getItem(key);
      if (item) size += item.length;
    }
  }
  return size; // Approximate size in bytes (UTF-16 encoding technically means size * 2)
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem("plasma-x-last-sync");
}
