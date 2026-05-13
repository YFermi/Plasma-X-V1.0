import * as fs from 'fs';
async function test() {
  const nistUrl = "https://physics.nist.gov/cgi-bin/ASD/lines1.pl?spectra=Ar+I&low_w=696&upp_w=697&unit=1&submit=Retrieve+Data&format=1&line_out=1&en_unit=1&output=0&bibrefs=1&page_size=500&show_obs_wl=1&show_calc_wl=1&unc_out=1&order_out=0&show_av=2&A_out=1&intens_out=on&tsb_value=0&min_str=&max_low_enrg=&max_upp_enrg=&allowed_out=1&forbid_out=1&enrg_out=on&conf_out=on&term_out=on&J_out=on";
  const nistResponse = await fetch(nistUrl);
  const text = await nistResponse.text();
  
  const preMatch = text.match(/<pre>([\s\S]*?)<\/pre>/i);
  const linesStr = preMatch ? preMatch[1].split('\n') : [];
  for (const line of linesStr) {
    if (!line.trim() || line.startsWith('---') || line.startsWith('===') || line.includes('No lines') || line.includes('Obs.')) continue;
    const cols = line.split('|').map(c => c.trim().replace(/<[^>]+>/g, ''));
    console.log("Len:", cols.length, cols);
  }
}
test();
