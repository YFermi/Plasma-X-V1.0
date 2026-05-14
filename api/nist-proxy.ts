export const config = {
  runtime: 'edge'
};

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const { searchParams } = new URL(request.url);
  const element = searchParams.get('element');
  const ion = searchParams.get('ion') || "";
  const unit = searchParams.get('unit') || "nm";
  
  const timestamp = new Date().toISOString();

  if (!element || !/^[a-zA-Z]{1,3}$/.test(element)) {
    return new Response(JSON.stringify({
      success: false,
      error: "Invalid element symbol",
      timestamp
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  let wavelengthMin = 200;
  let wavelengthMax = 1000;

  const wMinStr = searchParams.get('wavelengthMin');
  if (wMinStr) {
    const val = parseFloat(wMinStr);
    if (!isNaN(val)) wavelengthMin = val;
  }
  
  const wMaxStr = searchParams.get('wavelengthMax');
  if (wMaxStr) {
    const val = parseFloat(wMaxStr);
    if (!isNaN(val)) wavelengthMax = val;
  }

  if (wavelengthMin < 10 || wavelengthMin > 100000) {
    wavelengthMin = 200;
  }
  if (wavelengthMax <= wavelengthMin) {
    wavelengthMax = wavelengthMin + 800;
  }

  const spectra = ion ? `${element} ${ion}` : element;
  const maxLines = searchParams.get('maxLines') || "500";
  
  const urlParams = new URLSearchParams();
  urlParams.set("spectra", spectra);
  urlParams.set("low_w", wavelengthMin.toString());
  urlParams.set("upp_w", wavelengthMax.toString());
  urlParams.set("unit", "1");
  urlParams.set("submit", "Retrieve Data");
  urlParams.set("format", "1");
  urlParams.set("line_out", "0");
  urlParams.set("en_unit", "0");
  urlParams.set("output", "0");
  urlParams.set("bibrefs", "1");
  urlParams.set("page_size", maxLines);
  urlParams.set("show_obs_wl", "1");
  urlParams.set("show_calc_wl", "1");
  urlParams.set("unc_out", "1");
  urlParams.set("order_out", "0");
  urlParams.set("show_av", "2");
  urlParams.set("A_out", "0");
  urlParams.set("intens_out", "on");
  urlParams.set("tsb_value", "0");
  urlParams.set("min_str", "");
  urlParams.set("max_low_enrg", "");
  urlParams.set("max_upp_enrg", "");
  urlParams.set("allowed_out", "1");
  urlParams.set("forbid_out", "1");
  urlParams.set("enrg_out", "on");
  urlParams.set("conf_out", "on");
  urlParams.set("term_out", "on");
  urlParams.set("J_out", "on");

  const nistUrl = "https://physics.nist.gov/cgi-bin/ASD/lines1.pl?" + urlParams.toString();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const nistResponse = await fetch(nistUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!nistResponse.ok) {
      throw new Error(`NIST returned ${nistResponse.status}`);
    }

    const rawText = await nistResponse.text();
    const preMatch = rawText.match(/<pre>([\s\S]*?)<\/pre>/i);
    const linesStr = preMatch ? preMatch[1].split('\n') : rawText.split('\n');
    const parsedLines = [];

    let observedWlIdx = 1;
    let ritzWlIdx = 2;
    let uncIdx = 3;
    let relIntIdx = 4;
    let akiIdx = 5;
    let accIdx = 6;
    let energyIdx = 7;
    let confLowIdx = 8;
    let termLowIdx = 9;
    let jLowIdx = 10;
    let confHighIdx = 11;
    let termHighIdx = 12;
    let jHighIdx = 13;
    let typeIdx = 14;
    let tpRefIdx = 15;
    let lineRefIdx = 16;
    let headerParsed = false;
    let currentIon = ion || "";

    for (const line of linesStr) {
      if (!line.trim()) continue;
      if (line.startsWith('---') || line.startsWith('===')) continue;

      const cols = line.split('|').map(c => c.trim().replace(/<[^>]+>/g, ''));
      
      // Parse header line to determine column indices dynamically
      if (!headerParsed && cols.includes('Observed') && cols.includes('Ritz')) {
        const getIdx = (name: string) => cols.findIndex(c => c.includes(name));
        const obsIdx = getIdx('Observed');
        const ritzIdx = getIdx('Ritz');
        const unIdx = getIdx('Unc.');
        const relId = getIdx('Rel.');
        const akiId = getIdx('Aki') !== -1 ? getIdx('Aki') : getIdx('gA');
        const accId = getIdx('Acc.');
        const eiEkId = getIdx('Ei');
        const lowerId = getIdx('Lower level');
        
        if (obsIdx !== -1) observedWlIdx = obsIdx;
        if (ritzIdx !== -1) ritzWlIdx = ritzIdx;
        if (unIdx !== -1) uncIdx = unIdx;
        if (relId !== -1) relIntIdx = relId;
        if (akiId !== -1) akiIdx = akiId;
        if (accId !== -1) accIdx = accId;
        if (eiEkId !== -1) energyIdx = eiEkId;
        
        if (lowerId !== -1) {
          confLowIdx = lowerId;
          termLowIdx = lowerId + 1;
          jLowIdx = lowerId + 2;
          confHighIdx = lowerId + 3;
          termHighIdx = lowerId + 4;
          jHighIdx = lowerId + 5;
          typeIdx = lowerId + 6;
          tpRefIdx = lowerId + 7;
          lineRefIdx = lowerId + 8;
        }
        
        headerParsed = true;
        continue;
      }
      
      if (line.includes('No lines') || line.includes('Obs.')) continue;
      if (cols.length <= Math.max(jLowIdx, jHighIdx)) {
        continue;
      }
      // Ignore header lines that passed through
      if (cols[0] === 'Wavelength' || cols[0] === 'Air (nm)' || cols[0] === 'Spectrum') {
        continue;
      }

      // Handle the extra empty column that sometimes appears in configuration fields
      let cLow = confLowIdx;
      let tLow = termLowIdx;
      let jL = jLowIdx;
      let cHigh = confHighIdx;
      let tHigh = termHighIdx;
      let jH = jHighIdx;
      let tyIdx = typeIdx;
      let tpIdx = tpRefIdx;
      let lrIdx = lineRefIdx;
      
      if (cols.length >= jH + 2 && cols[cLow] === '' && cols[tLow] !== '') {
          cLow++; tLow++; jL++; cHigh++; tHigh++; jH++; tyIdx++; tpIdx++; lrIdx++;
      }

      let wavelengthStr = cols[observedWlIdx];
      if (!wavelengthStr || isNaN(parseFloat(wavelengthStr))) wavelengthStr = cols[ritzWlIdx];
      const wavelength = parseFloat(wavelengthStr);
      if (isNaN(wavelength)) {
        continue;
      }

      let obsWavelength: number | null = cols[observedWlIdx] ? parseFloat(cols[observedWlIdx]) : null;
      if (obsWavelength !== null && isNaN(obsWavelength)) obsWavelength = null;

      let ritzWavelength: number | null = cols[ritzWlIdx] ? parseFloat(cols[ritzWlIdx]) : null;
      if (ritzWavelength !== null && isNaN(ritzWavelength)) ritzWavelength = null;

      let unc = cols[uncIdx] || "";
      let relInt = cols[relIntIdx] || "";

      let akiStr = cols[akiIdx].replace(/[^0-9.eE+-]/g, '');
      let aki: number | null = akiStr ? parseFloat(akiStr) : null;
      if (aki !== null && isNaN(aki)) aki = null;

      const accuracy = cols[accIdx] || "";

      let energyLow: string = "";
      let energyHigh: string = "";
      if (cols[energyIdx]) {
         const eParts = cols[energyIdx].split('-');
         if (eParts.length > 0) {
           energyLow = eParts[0].trim().replace(/^\[|\]$/g, '');
         }
         if (eParts.length > 1) {
           energyHigh = eParts[1].trim().replace(/^\[|\]$/g, '');
         }
      }

      const confLow = cols[cLow] || "";
      const confHigh = cols[cHigh] || "";
      const termLow = cols[tLow] || "";
      const termHigh = cols[tHigh] || "";
      const jLow = cols[jL] || "";
      const jHigh = cols[jH] || "";
      const type = cols[tyIdx] || "";
      const tpRef = cols[tpIdx] || "";
      const lineRef = cols[lrIdx] || "";

      if (cols[0] && cols[0] !== '') {
         currentIon = cols[0];
      }

      parsedLines.push({
        element,
        ion: currentIon,
        wavelength,
        obsWavelength,
        ritzWavelength,
        unc,
        relInt,
        aki,
        accuracy,
        energyLow,
        energyHigh,
        confLow,
        confHigh,
        termLow,
        termHigh,
        jLow,
        jHigh,
        type,
        tpRef,
        lineRef
      });
    }

    const payload = {
      success: true,
      source: "nist-live",
      timestamp: new Date().toISOString(),
      element,
      ion: ion || "",
      query: {
        wavelengthMin,
        wavelengthMax,
        unit
      },
      count: parsedLines.length,
      lines: parsedLines
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      source: "nist-unreachable",
      error: "NIST server did not respond within 8 seconds",
      timestamp: new Date().toISOString()
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
