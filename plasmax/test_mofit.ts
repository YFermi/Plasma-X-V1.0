import {
  N2_SECOND_POSITIVE_BANDS,
  N2_SPECTROSCOPIC_CONSTANTS,
  C2_SWAN_BANDS,
  C2_SPECTROSCOPIC_CONSTANTS,
  CN_VIOLET_BANDS,
  CN_SPECTROSCOPIC_CONSTANTS,
} from './src/data/molecular_constants';

const getWavelengthRange = (molecule) => {
  switch (molecule) {
    case 'N2': return [296, 400];
    case 'C2': return [470, 570];
    case 'CN': return [350, 395];
  }
};

const getBands = (molecule) => {
  switch (molecule) {
    case 'N2': return N2_SECOND_POSITIVE_BANDS;
    case 'C2': return C2_SWAN_BANDS;
    case 'CN': return CN_VIOLET_BANDS;
  }
};

const getConstants = (molecule) => {
  switch (molecule) {
    case 'N2': return N2_SPECTROSCOPIC_CONSTANTS;
    case 'C2': return C2_SPECTROSCOPIC_CONSTANTS;
    case 'CN': return CN_SPECTROSCOPIC_CONSTANTS;
  }
};

const generateWavelengthAxis = (range, points = 500) => {
  const step = (range[1] - range[0]) / (points - 1);
  return Array.from({ length: points }, (_, i) => range[0] + i * step);
};

const generateSyntheticSpectrum = (
  molecule,
  Trot,
  Tvib,
  fwhm,
  wavelengths
) => {
  const kB = 0.695039;
  const spectrum = new Array(wavelengths.length).fill(0);
  const bands = getBands(molecule);
  const constants = getConstants(molecule);
  
  const Q_rot = kB * Trot / constants.Be_upper;
  const effective_fwhm = fwhm + (Trot * 0.0002);
  const sigma = effective_fwhm / (2 * Math.sqrt(2 * Math.log(2)));
  
  bands.forEach(band => {
    const E_vib = band.v_upper * constants.we_upper;
    const pop_vib = Math.exp(-E_vib / (kB * Tvib));
    const band_intensity = (band.FCF * pop_vib) / Q_rot;
    
    wavelengths.forEach((wl, i) => {
      const delta = wl - band.wavelength_nm;
      if (Math.abs(delta) < 15) {
        spectrum[i] += band_intensity * 
          Math.exp(-(delta * delta) / (2 * sigma * sigma));
      }
    });
  });
  
  const maxVal = Math.max(...spectrum);
  return maxVal > 0 
    ? spectrum.map(v => v / maxVal) 
    : spectrum;
};

const calculateRMSE = (exp, syn) => {
  let sumsq = 0;
  for(let i = 0; i < exp.length; i++) {
    sumsq += Math.pow(exp[i] - syn[i], 2);
  }
  return Math.sqrt(sumsq / exp.length);
};

const normalizeArray = (arr) => {
  const maxVal = Math.max(...arr);
  return maxVal > 0 ? arr.map(v => v / maxVal) : arr;
};

const runFitTest = (molecule, expTrot, expTvib) => {
  const range = getWavelengthRange(molecule);
  const wavelengths = generateWavelengthAxis(range, 400);
  const fwhmNm = 0.5;
  const synth = generateSyntheticSpectrum(molecule, expTrot, expTvib, fwhmNm, wavelengths);
  
  const experimentalSpectrum = wavelengths.map((wl, i) => {
    const noise = 0; // (Math.random() * 0.04 - 0.02);
    let noisyIntensity = synth[i] + noise;
    if (noisyIntensity < 0) noisyIntensity = 0;
    return { wavelength: wl, intensity: noisyIntensity };
  });

  const normExp = normalizeArray(experimentalSpectrum.map(p => p.intensity));

  let bestTrot = 500;
  let bestTvib = 3000;
  let bestRMSE = Infinity;

  // coarse
  for (let Trot = 300; Trot <= 5000; Trot += 200) {
    for (let Tvib = 500; Tvib <= 20000; Tvib += 500) {
      const syn = generateSyntheticSpectrum(molecule, Trot, Tvib, fwhmNm, wavelengths);
      const rmse = calculateRMSE(normExp, syn);
      if (rmse < bestRMSE) {
        bestRMSE = rmse; bestTrot = Trot; bestTvib = Tvib;
      }
    }
  }

  // fine
  let fineBestTrot = bestTrot;
  let fineBestTvib = bestTvib;
  let fineBestRMSE = Infinity;
  for (let Trot = bestTrot - 200; Trot <= bestTrot + 200; Trot += 20) {
    if (Trot < 50) continue;
    for (let Tvib = bestTvib - 500; Tvib <= bestTvib + 500; Tvib += 50) {
      if (Tvib < 50) continue;
      const syn = generateSyntheticSpectrum(molecule, Trot, Tvib, fwhmNm, wavelengths);
      const rmse = calculateRMSE(normExp, syn);
      if (rmse < fineBestRMSE) {
        fineBestRMSE = rmse; fineBestTrot = Trot; fineBestTvib = Tvib;
      }
    }
  }

  console.log(`Molecule: ${molecule}`);
  console.log(`Expected Trot=${expTrot}, Tvib=${expTvib}`);
  console.log(`Fit Result: Trot=${fineBestTrot}, Tvib=${fineBestTvib}`);
  console.log(`RMSE: ${fineBestRMSE.toFixed(5)}`);
};

runFitTest('N2', 500, 4000);
runFitTest('C2', 3000, 6000);
