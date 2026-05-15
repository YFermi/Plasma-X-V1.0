import * as fs from 'fs';
async function test() {
  const nistUrl = "https://physics.nist.gov/cgi-bin/ASD/lines1.pl?spectra=Ar+I&low_w=696&upp_w=697&unit=1&submit=Retrieve+Data&format=1&line_out=1&en_unit=1&output=0&bibrefs=1&page_size=500&show_obs_wl=1&show_calc_wl=1&unc_out=1&order_out=0&show_av=2&A_out=1&intens_out=on&tsb_value=0&min_str=&max_low_enrg=&max_upp_enrg=&allowed_out=1&forbid_out=1&enrg_out=on&conf_out=on&term_out=on&J_out=on";
  const nistResponse = await fetch(nistUrl);
  const rawText = await nistResponse.text();
  
  const preMatch = rawText.match(/<pre>([\s\S]*?)<\/pre>/i);
  const linesStr = preMatch ? preMatch[1].split('\n') : rawText.split('\n');
  const parsedLines = [];

  for (const line of linesStr) {
    if (!line.trim()) continue;
    if (line.startsWith('---') || line.startsWith('===')) continue;
    if (line.includes('No lines') || line.includes('Obs.')) continue;

    const cols = line.split('|').map(c => c.trim().replace(/<[^>]+>/g, ''));
    let confLowIdx = 6;
    let termLowIdx = 7;
    let jLowIdx = 8;
    let confHighIdx = 9;
    let termHighIdx = 10;
    let jHighIdx = 11;
    
    if (cols.length >= 13 && cols[6] === '' && cols[7] !== '') {
       confLowIdx = 7;
       termLowIdx = 8;
       jLowIdx = 9;
       confHighIdx = 10;
       termHighIdx = 11;
       jHighIdx = 12;
    }
    
    if (cols.length <= Math.max(jLowIdx, jHighIdx)) {
      console.log("SKIP: Too short", cols.length);
      continue; 
    }
    if (cols[0] === 'Wavelength' || cols[0] === 'Air (nm)' || cols[0] === '') {
      continue;
    }

    let wavelengthStr = cols[0];
    if (!wavelengthStr || isNaN(parseFloat(wavelengthStr))) wavelengthStr = cols[1];
    const wavelength = parseFloat(wavelengthStr);
    if (isNaN(wavelength)) {
      console.log("SKIP: NaN Wavelength", JSON.stringify(cols[0]), JSON.stringify(cols[1]));
      continue;
    }

    console.log("SUCCESS:", wavelength);
  }
}
test();
