import * as fs from 'fs';
async function test() {
  const nistUrl = "https://physics.nist.gov/cgi-bin/ASD/lines1.pl?spectra=Ar+I&low_w=696&upp_w=697&unit=1&submit=Retrieve+Data&format=1&line_out=1&en_unit=1&output=0&bibrefs=1&page_size=500&show_obs_wl=1&show_calc_wl=1&unc_out=1&order_out=0&show_av=2&A_out=1&f_out=on&S_out=on&intens_out=on&tsb_value=0&min_str=&max_low_enrg=&max_upp_enrg=&allowed_out=1&forbid_out=1";
  const nistResponse = await fetch(nistUrl);
  const text = await nistResponse.text();
  console.log("FORMAT=1:");
  console.log(text.substring(0, 300));
}
test();
