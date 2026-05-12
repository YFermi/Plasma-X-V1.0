/**
 * Cloudflare Worker: NIST ASD Proxy for PLASMA-X
 * 
 * Proxies requests to the NIST Atomic Spectra Database, parses the ASCII output
 * into clean JSON, caches the results in Cloudflare KV, and provides a fallback
 * to the GitHub data vault if NIST is offline.
 */

const GITHUB_VAULT_BASE_URL = 'https://raw.githubusercontent.com/plasma-x-org/plasma-x-database/main/atomic/by_element';
const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: getCorsHeaders(),
      });
    }

    try {
      const url = new URL(request.url);
      
      if (url.pathname !== '/api/lines') {
        return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
          status: 404,
          headers: getCorsHeaders(),
        });
      }

      // 1. Extract and validate parameters
      const params = extractParams(url);
      if (params.error) {
        return new Response(JSON.stringify({ error: params.error }), {
          status: 400,
          headers: getCorsHeaders(),
        });
      }

      const { element, ion, w_min, w_max, unit } = params;
      const cacheKey = `${element}_${ion}_${w_min}_${w_max}`;

      // 2. Check Cache
      if (env.NIST_CACHE) {
        const cachedData = await env.NIST_CACHE.get(cacheKey, { type: 'json' });
        if (cachedData) {
          return createJsonResponse({
            source: 'cache',
            fetched_at: new Date().toISOString(),
            element,
            ion,
            count: cachedData.length,
            lines: cachedData
          }, getCorsHeaders());
        }
      }

      // 3. Fetch from NIST
      let lines = null;
      let source = 'nist-live';
      
      try {
        const nistUrl = buildNistUrl(element, ion, w_min, w_max, unit);
        const nistResponse = await fetch(nistUrl, {
          headers: {
            'User-Agent': 'PLASMA-X-Bot/1.0 (https://plasma-x.org)',
          },
          // 10 second timeout for NIST to fail fast if it's struggling
          signal: AbortSignal.timeout(10000)
        });

        if (!nistResponse.ok) {
          throw new Error(`NIST returned ${nistResponse.status}`);
        }

        const asciiData = await nistResponse.text();
        lines = parseNistAscii(asciiData, element, ion);
        
      } catch (nistError) {
        // 5. Fallback to GitHub Vault
        console.error('NIST fetch failed, using fallback:', nistError);
        source = 'github-fallback';
        
        try {
          const fallbackUrl = `${GITHUB_VAULT_BASE_URL}/${element}.json`;
          const fallbackResponse = await fetch(fallbackUrl);
          
          if (!fallbackResponse.ok) {
             throw new Error('Fallback data not found');
          }
          
          const fallbackData = await fallbackResponse.json();
          // Filter fallback data by ion and wavelength range
          lines = fallbackData.filter(line => 
            (ion === 'all' || line.ion === ion) &&
            line.wavelength >= w_min && 
            line.wavelength <= w_max
          );
        } catch (fallbackError) {
           return new Response(JSON.stringify({ 
             error: 'Failed to fetch line data from both NIST and Fallback',
             details: { nist: nistError.message, fallback: fallbackError.message }
           }), { 
             status: 502, 
             headers: getCorsHeaders() 
           });
        }
      }

      // 4. Store in Cache (Background)
      if (env.NIST_CACHE && lines && source === 'nist-live') {
        ctx.waitUntil(
          env.NIST_CACHE.put(cacheKey, JSON.stringify(lines), { expirationTtl: CACHE_TTL })
        );
      }

      // 6. Return Clean JSON
      const responseHeaders = getCorsHeaders();
      if (source === 'github-fallback') {
        responseHeaders['X-Data-Source'] = 'github-fallback';
      }

      return createJsonResponse({
        source,
        fetched_at: new Date().toISOString(),
        element,
        ion,
        count: lines.length,
        lines
      }, responseHeaders);

    } catch (error) {
      // 7. Handle errors gracefully
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }), {
        status: 500,
        headers: getCorsHeaders()
      });
    }
  }
};

// --- Helper Functions ---

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

function createJsonResponse(body, headers) {
  return new Response(JSON.stringify(body), { headers });
}

function extractParams(url) {
  const element = url.searchParams.get('element');
  const ion = url.searchParams.get('ion') || 'I';
  const wavelength_min = url.searchParams.get('wavelength_min');
  const wavelength_max = url.searchParams.get('wavelength_max');
  const unit = url.searchParams.get('unit') || 'nm'; // Assume nm for simplicity

  if (!element || !wavelength_min || !wavelength_max) {
    return { error: 'Missing required parameters: element, wavelength_min, wavelength_max' };
  }

  const w_min = parseFloat(wavelength_min);
  const w_max = parseFloat(wavelength_max);

  if (isNaN(w_min) || isNaN(w_max)) {
     return { error: 'wavelength_min and wavelength_max must be valid numbers' };
  }

  return { element, ion, w_min, w_max, unit };
}

function buildNistUrl(element, ion, w_min, w_max, unit) {
  // Map our generic 'unit' to NIST unit codes: 0 = Å, 1 = nm, 2 = µm
  const unitCode = unit.toLowerCase() === 'nm' ? 1 : (unit.toLowerCase() === 'a' ? 0 : 1);
  const spectra = ion === 'all' ? element : `${element} ${ion}`;
  
  const params = new URLSearchParams({
    spectra: spectra,
    low_w: w_min,
    upp_w: w_max,
    unit: unitCode,
    submit: 'Retrieve Data',
    format: 1, // 0 = default HTML, 1 = ASCII format
    line_out: 0, // 0 = all lines
    en_unit: 0, // energy unit: 0 = cm-1
    output: 0, // output info: 0 = all info
    // Additional parameters to ensure predictable pipe-delimited output
    bibrefs: 1,
    show_obs_wl: 1,
    show_calc_wl: 1,
    order_out: 0,
    max_low_enrg: '',
    show_av: 2,
    max_upp_enrg: '',
    tsb_value: 0,
    min_str: '',
    A_out: 0,
    intens_out: 'on',
    max_str: '',
    allowed_out: 1,
    forbid_out: 1,
    min_accur: '',
    min_intens: '',
    conf_out: 'on',
    term_out: 'on',
    enrg_out: 'on',
    J_out: 'on',
    g_out: 'on'
  });

  return `https://physics.nist.gov/cgi-bin/ASD/lines1.pl?${params.toString()}`;
}

function parseNistAscii(asciiData, queryElement, queryIon) {
  const lines = asciiData.split('\n');
  const parsedLines = [];
  
  // Find where the actual data table starts (usually after "------")
  let dataStartIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('-----')) {
      dataStartIndex = i + 1;
      break;
    }
  }

  for (let i = dataStartIndex; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith('=') || rawLine.startsWith('-')) continue;

    const parts = rawLine.split('|').map(p => p.trim());
    if (parts.length < 10) continue; // Skip malformed lines

    try {
      // Column mappings (approximate, based on standard NIST ASCII format 1)
      // Note: Actual column indices can vary based on the specific NIST query flags,
      // so robust parsing might be needed in a true production scenario.
      // Assuming a standardized output format here based on the params passed above.
      
      let elementStr = parts[0]?.replace(/[^a-zA-Z]/g, '') || queryElement;
      let ionStr = parts[0]?.replace(/[a-zA-Z\s]/g, '') || queryIon;
      
      // If the first column doesn't contain element info, use query params
      if (!elementStr) elementStr = queryElement;
      if (!ionStr) ionStr = queryIon;

      const wavelengthInfo = parts[1] || parts[0]; 
      // Extract numeric wavelength, strip symbols like *, etc.
      const rawWl = wavelengthInfo.replace(/[^0-9.]/g, ''); 
      const wavelength = parseFloat(rawWl);
      
      if (isNaN(wavelength)) continue;

      // Extract Aki (Transition Probability)
      let aki = 0;
      const akiStr = parts[2] || parts[3]; 
      if (akiStr) {
         aki = parseFloat(akiStr.replace(/[^e0-9.-]/g, ''));
      }

      // Extract Energies
      const energyLowStr = parts[6] || parts[7];
      const energyHighStr = parts[8] || parts[9];
      const energyLow = energyLowStr ? parseFloat(energyLowStr) : 0;
      const energyHigh = energyHighStr ? parseFloat(energyHighStr) : 0;

      // Configurations, Terms, J
      const confLow = parts[10] || '';
      const confHigh = parts[11] || '';
      const termLow = parts[12] || '';
      const termHigh = parts[13] || '';
      const jLow = parts[14] || '';
      const jHigh = parts[15] || '';
      
      const gLowStr = parts[16];
      const gHighStr = parts[17];
      const gi = gLowStr ? parseFloat(gLowStr) : 0;
      const gk = gHighStr ? parseFloat(gHighStr) : 0;
      
      const accuracy = parts[4] || '';

      if (isNaN(wavelength)) continue;

      parsedLines.push({
        wavelength,
        element: elementStr,
        ion: ionStr,
        aki: isNaN(aki) ? 0 : aki,
        gk: isNaN(gk) ? 0 : gk,
        gi: isNaN(gi) ? 0 : gi,
        accuracy,
        energyLow: isNaN(energyLow) ? 0 : energyLow,
        energyHigh: isNaN(energyHigh) ? 0 : energyHigh,
        confLow,
        confHigh,
        termLow,
        termHigh,
        jLow,
        jHigh
      });
    } catch (e) {
      console.warn('Failed to parse line:', rawLine, e);
    }
  }

  return parsedLines;
}
