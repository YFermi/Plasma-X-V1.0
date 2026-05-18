import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { 
  LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, 
  ReferenceLine, Line, ResponsiveContainer 
} from 'recharts';
import { ChevronDown, ChevronUp, Upload, FileText } from 'lucide-react';
import {
  STARK_DATABASE,
  StarkEntry,
  calculateDopplerFWHM,
  calculateStarkFWHM,
  calculateNe,
  formatNe
} from '../data/stark_database';

interface SavedMeasurement {
  id: string;
  line_name: string;
  measured_fwhm: number;
  inst_fwhm: number;
  T_gas: number;
  ne: number | null;
  uncertainty: number;
}

export default function StarkCalculator() {
  const { saveStarkResult, saveStarkSpectrum, addReportItem } = useProject();
  const [selectedEntry, setSelectedEntry] = useState<StarkEntry | null>(STARK_DATABASE[0]);
  
  const [starkAddedToReport, setStarkAddedToReport] = useState(false);
  const [starkReportLabel, setStarkReportLabel] = useState('');
  const [uploadAddedToReport, setUploadAddedToReport] = useState(false);
  const [uploadReportLabel, setUploadReportLabel] = useState('');
  
  // SECTION 4 Inputs with 300ms debounce
  const [totalFWHMInput, setTotalFWHMInput] = useState<string>("0.2");
  const [instFWHMInput, setInstFWHMInput] = useState<string>("0.02");
  const [tGasInput, setTGasInput] = useState<string>("300");
  const [atomicMassInput, setAtomicMassInput] = useState<string>("1.008");

  const [debouncedInputs, setDebouncedInputs] = useState({
    total: "0.2",
    inst: "0.02",
    tGas: "300",
    mass: "1.008"
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedInputs({
        total: totalFWHMInput,
        inst: instFWHMInput,
        tGas: tGasInput,
        mass: atomicMassInput
      });
    }, 300);
    return () => clearTimeout(t);
  }, [totalFWHMInput, instFWHMInput, tGasInput, atomicMassInput]);

  useEffect(() => {
    if (selectedEntry) {
      setAtomicMassInput(selectedEntry.atomic_mass_amu.toString());
    }
  }, [selectedEntry]);

  const [savedMeasurements, setSavedMeasurements] = useState<SavedMeasurement[]>([]);

  // ── Upload Stark Fitting state ──────────────
  const [uploadIsOpen, setUploadIsOpen] = 
    useState(false);
  const [uploadSpectrum, setUploadSpectrum] = 
    useState<{wl: number; int: number}[] | null>(null);
  const [uploadFileName, setUploadFileName] = 
    useState<string>('');
  const [uploadDetectedLine, setUploadDetectedLine] = 
    useState<StarkEntry | null>(null);
  const [uploadFitResult, setUploadFitResult] = 
    useState<{
      center_nm: number;
      fwhm_nm: number;
      amplitude: number;
      fitted: {wl: number; int: number}[];
    } | null>(null);
  const [uploadInstFWHM, setUploadInstFWHM] = 
    useState<string>('0.05');
  const [uploadTgas, setUploadTgas] = 
    useState<string>('500');
  const [uploadWindowHalf, setUploadWindowHalf] = 
    useState<string>('3.0');
  const [uploadIsFitting, setUploadIsFitting] = 
    useState(false);
  const [uploadNeResult, setUploadNeResult] = 
    useState<{
      ne_cm3: number;
      ne_min: number;
      ne_max: number;
      reliable: boolean;
      warning: string | null;
      w_doppler: number;
      w_stark: number;
    } | null>(null);
  const uploadFileRef = useRef<HTMLInputElement>(null);
  const [uploadWindowedData, setUploadWindowedData] =
    useState<{wl: number; raw: number; fit: number | null}[]>([]);
  const [uploadFitQuality, setUploadFitQuality] =
    useState<number>(0);

  const numTotalFWHM = parseFloat(debouncedInputs.total);
  const numInstFWHM = parseFloat(debouncedInputs.inst);
  const numTGas = parseFloat(debouncedInputs.tGas);
  const numAtomicMass = parseFloat(debouncedInputs.mass);

  const W_doppler = useMemo(() => {
    if (!selectedEntry || isNaN(numTGas) || isNaN(numAtomicMass) || numTGas <= 0 || numAtomicMass <= 0) return 0;
    return calculateDopplerFWHM(selectedEntry.wavelength_nm, numTGas, numAtomicMass);
  }, [selectedEntry, numTGas, numAtomicMass]);

  const W_stark = useMemo(() => {
    if (isNaN(numTotalFWHM) || isNaN(numInstFWHM) || isNaN(W_doppler)) return null;
    return calculateStarkFWHM(numTotalFWHM, numInstFWHM, W_doppler);
  }, [numTotalFWHM, numInstFWHM, W_doppler]);

  const neResult = useMemo(() => {
    if (!selectedEntry || W_stark === null || W_stark <= 0) return null;
    return calculateNe(selectedEntry, W_stark);
  }, [selectedEntry, W_stark]);

  const starkDopplerRatio = useMemo(() => {
    if (W_stark === null || W_doppler === 0) return 0;
    return W_stark / W_doppler;
  }, [W_stark, W_doppler]);

  useEffect(() => {
    if (!neResult || !selectedEntry || 
        W_stark === null || W_stark <= 0) return;
    saveStarkResult({
      ne_cm3: neResult.ne_cm3,
      ne_min: neResult.ne_min,
      ne_max: neResult.ne_max,
      line_used: selectedEntry.line_name,
      W_total_nm: numTotalFWHM,
      W_inst_nm: numInstFWHM,
      W_doppler_nm: W_doppler,
      W_stark_nm: W_stark,
      uncertainty_percent: selectedEntry.uncertainty_percent,
      reliable: neResult.reliable,
      method: 'manual',
      timestamp: new Date().toISOString()
    });
  }, [neResult, selectedEntry]);

  const addMeasurement = () => {
    if (!selectedEntry || !neResult) return;
    const newMeasurement: SavedMeasurement = {
      id: Math.random().toString(36).substring(7),
      line_name: selectedEntry.line_name,
      measured_fwhm: numTotalFWHM,
      inst_fwhm: numInstFWHM,
      T_gas: numTGas,
      ne: neResult.ne_cm3,
      uncertainty: selectedEntry.uncertainty_percent
    };
    setSavedMeasurements([...savedMeasurements, newMeasurement]);
  };

  const removeMeasurement = (id: string) => {
    setSavedMeasurements(savedMeasurements.filter(m => m.id !== id));
  };

  // ── Parse uploaded spectrum CSV ─────────────
  const parseUploadedCSV = (
    text: string
  ): {wl: number; int: number}[] => {
    const lines = text.split('\n');
    const points: {wl: number; int: number}[] = [];
    for (const line of lines) {
      if (!line.trim() || 
          line.startsWith('#') || 
          line.startsWith('//')) continue;
      const parts = line
        .replace(/,/g, '\t')
        .replace(/;/g, '\t')
        .split('\t')
        .map(s => s.trim())
        .filter(s => s !== '');
      if (parts.length >= 2) {
        const wl  = parseFloat(parts[0]);
        const int = parseFloat(parts[1]);
        if (!isNaN(wl) && !isNaN(int)) {
          points.push({ wl, int });
        }
      }
    }
    return points.sort((a, b) => a.wl - b.wl);
  };

  // ── Auto-detect Stark line from spectrum ────
  // Checks if spectrum contains Hα, Hβ, Hγ, Hδ
  // by finding the peak nearest to known wavelengths
  const detectStarkLine = (
    pts: {wl: number; int: number}[]
  ): StarkEntry | null => {
    if (pts.length === 0) return null;
    const wlMin = pts[0].wl;
    const wlMax = pts[pts.length - 1].wl;
    // Priority order: Hα, Hβ, Hγ, Hδ
    const candidates = STARK_DATABASE.filter(e =>
      e.wavelength_nm >= wlMin - 5 &&
      e.wavelength_nm <= wlMax + 5
    );
    if (candidates.length === 0) return null;
    // Return the one whose wavelength is closest
    // to the spectrum's intensity peak
    const maxInt = Math.max(...pts.map(p => p.int));
    const peakPt = pts.find(p => p.int === maxInt);
    if (!peakPt) return candidates[0];
    return candidates.reduce((best, c) =>
      Math.abs(c.wavelength_nm - peakPt.wl) <
      Math.abs(best.wavelength_nm - peakPt.wl)
        ? c : best
    );
  };

  // ── Handle file upload ───────────────────────
  const handleUploadFile = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const pts  = parseUploadedCSV(text);
      if (pts.length < 10) return;
      setUploadSpectrum(pts);
      setUploadFitResult(null);
      setUploadNeResult(null);
      const detected = detectStarkLine(pts);
      setUploadDetectedLine(detected);
    };
    reader.readAsText(file);
  };

  // ── Pseudo-Voigt fit — robust version for 
  //    high-resolution spectra (HR 1000 etc.) ──
  const fitVoigtToLine = async () => {
    if (!uploadSpectrum || !uploadDetectedLine) return;
    setUploadIsFitting(true);
    setUploadFitResult(null);
    setUploadNeResult(null);
    setUploadFitQuality(0);

    const lineWl  = uploadDetectedLine.wavelength_nm;
    const halfWin = parseFloat(uploadWindowHalf) || 3.0;

    // STEP 1: Extract window once. This same data
    // will be used for BOTH fitting and the chart.
    const windowed = uploadSpectrum.filter(p =>
      p.wl >= lineWl - halfWin &&
      p.wl <= lineWl + halfWin
    );
    if (windowed.length < 10) {
      setUploadIsFitting(false);
      return;
    }

    // STEP 2: Estimate baseline as average of 
    // the edge points (first and last 10%)
    const edgeCount = Math.max(3, Math.floor(windowed.length * 0.1));
    const leftEdge = windowed.slice(0, edgeCount);
    const rightEdge = windowed.slice(-edgeCount);
    const baseline = 
      ([...leftEdge, ...rightEdge]
        .reduce((s, p) => s + p.int, 0)) / 
      (leftEdge.length + rightEdge.length);

    // STEP 3: Subtract baseline, then normalize to 0-1
    const bgSubtracted = windowed.map(p => ({
      wl:  p.wl,
      int: Math.max(0, p.int - baseline)
    }));
    const maxI = Math.max(...bgSubtracted.map(p => p.int));
    if (maxI <= 0) {
      setUploadIsFitting(false);
      return;
    }
    const norm = bgSubtracted.map(p => ({
      wl:  p.wl,
      int: p.int / maxI
    }));

    // STEP 4: Estimate initial peak position by 
    // finding the data point with highest intensity
    let peakIdx = 0;
    let peakVal = -Infinity;
    for (let i = 0; i < norm.length; i++) {
      if (norm[i].int > peakVal) {
        peakVal = norm[i].int;
        peakIdx = i;
      }
    }
    let initCenter = norm[peakIdx].wl;

    // Refine center using quadratic interpolation
    // around the peak (3-point parabolic fit)
    if (peakIdx > 0 && peakIdx < norm.length - 1) {
      const y1 = norm[peakIdx - 1].int;
      const y2 = norm[peakIdx].int;
      const y3 = norm[peakIdx + 1].int;
      const x1 = norm[peakIdx - 1].wl;
      const x3 = norm[peakIdx + 1].wl;
      const denom = (y1 - 2 * y2 + y3);
      if (Math.abs(denom) > 1e-10) {
        const offset = 0.5 * (y1 - y3) / denom;
        const dx = (x3 - x1) / 2;
        initCenter = norm[peakIdx].wl + offset * dx;
      }
    }

    // STEP 5: Estimate initial FWHM from the data
    // by finding the half-maximum crossings
    const halfMax = 0.5;
    let leftHM = norm[0].wl;
    let rightHM = norm[norm.length - 1].wl;
    for (let i = peakIdx; i > 0; i--) {
      if (norm[i].int < halfMax) {
        // Linear interpolation between i and i+1
        const x1 = norm[i].wl, y1 = norm[i].int;
        const x2 = norm[i + 1].wl, y2 = norm[i + 1].int;
        leftHM = x1 + (halfMax - y1) * (x2 - x1) / (y2 - y1 || 1);
        break;
      }
    }
    for (let i = peakIdx; i < norm.length - 1; i++) {
      if (norm[i].int < halfMax) {
        const x1 = norm[i - 1].wl, y1 = norm[i - 1].int;
        const x2 = norm[i].wl, y2 = norm[i].int;
        rightHM = x1 + (halfMax - y1) * (x2 - x1) / (y2 - y1 || 1);
        break;
      }
    }
    let initFWHM = Math.max(0.01, rightHM - leftHM);
    // Sanity bounds: clamp to reasonable range for HR data
    if (initFWHM < 0.02) initFWHM = 0.05;
    if (initFWHM > halfWin) initFWHM = halfWin * 0.5;

    // STEP 6: Pseudo-Voigt profile
    const voigt = (
      x: number, center: number, fwhm: number, amp: number
    ): number => {
      const sigma = fwhm / (2 * Math.sqrt(2 * Math.log(2)));
      const gamma = fwhm / 2;
      const dx = x - center;
      const g = Math.exp(-(dx * dx) / (2 * sigma * sigma));
      const l = 1 / (1 + (dx * dx) / (gamma * gamma));
      return amp * (0.7 * g + 0.3 * l);
    };

    const getLoss = (
      ctr: number, fw: number, amp: number
    ): number => {
      let loss = 0;
      for (const p of norm) {
        const diff = p.int - voigt(p.wl, ctr, fw, amp);
        loss += diff * diff;
      }
      return loss;
    };

    // STEP 7: Multi-scale coordinate descent
    // Coarse → medium → fine — total 120 iterations
    let ctr = initCenter;
    let fw  = initFWHM;
    let amp = 1.0;

    const scales = [
      { iters: 30, stepCtr: 0.10, stepFw: 0.08, stepAmp: 0.10 },
      { iters: 50, stepCtr: 0.02, stepFw: 0.02, stepAmp: 0.04 },
      { iters: 40, stepCtr: 0.005, stepFw: 0.005, stepAmp: 0.01 }
    ];

    for (const scale of scales) {
      for (let i = 0; i < scale.iters; i++) {
        const decay = Math.exp(-i / (scale.iters * 0.6));
        const sCtr = scale.stepCtr * decay;
        const sFw  = scale.stepFw  * decay;
        const sAmp = scale.stepAmp * decay;
        const base = getLoss(ctr, fw, amp);

        if (getLoss(ctr + sCtr, fw, amp) < base) ctr += sCtr;
        else if (getLoss(ctr - sCtr, fw, amp) < base) ctr -= sCtr;

        if (fw + sFw < halfWin * 2 && 
            getLoss(ctr, fw + sFw, amp) < base) fw += sFw;
        else if (fw - sFw > 0.005 && 
                 getLoss(ctr, fw - sFw, amp) < base) fw -= sFw;

        if (getLoss(ctr, fw, amp + sAmp) < base) amp += sAmp;
        else if (amp - sAmp > 0.05 && 
                 getLoss(ctr, fw, amp - sAmp) < base) amp -= sAmp;

        if (i % 10 === 0) {
          await new Promise(r => setTimeout(r, 3));
        }
      }
    }

    // STEP 8: Compute R² to assess fit quality
    const meanY = norm.reduce((s, p) => s + p.int, 0) / norm.length;
    let ssRes = 0;
    let ssTot = 0;
    for (const p of norm) {
      const pred = voigt(p.wl, ctr, fw, amp);
      ssRes += (p.int - pred) ** 2;
      ssTot += (p.int - meanY) ** 2;
    }
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    // STEP 9: Build fitted curve and chart data
    // The chart data uses the SAME windowed array
    const fittedCurve = norm.map(p => ({
      wl:  p.wl,
      int: voigt(p.wl, ctr, fw, amp)
    }));
    const chartData = norm.map((p, i) => ({
      wl:  p.wl,
      raw: p.int,
      fit: fittedCurve[i].int
    }));

    setUploadWindowedData(chartData);
    setUploadFitQuality(r2);
    setUploadFitResult({
      center_nm: ctr,
      fwhm_nm:   fw,
      amplitude: amp,
      fitted: fittedCurve
    });

    // STEP 10: Calculate nₑ from fitted FWHM
    const instFWHM = parseFloat(uploadInstFWHM) || 0;
    const tGas     = parseFloat(uploadTgas) || 300;
    const entry    = uploadDetectedLine;
    const w_doppler = calculateDopplerFWHM(
      entry.wavelength_nm, tGas, entry.atomic_mass_amu
    );
    const w_stark_sq = fw * fw - 
                       instFWHM * instFWHM - 
                       w_doppler * w_doppler;

    if (w_stark_sq <= 0 || r2 < 0.5) {
      setUploadIsFitting(false);
      setUploadNeResult(null);
      return;
    }
    const w_stark  = Math.sqrt(w_stark_sq);
    const neResult = calculateNe(entry, w_stark);
    setUploadNeResult({
      ...neResult,
      w_doppler,
      w_stark
    });
    saveStarkResult({
      ne_cm3: neResult.ne_cm3,
      ne_min: neResult.ne_min,
      ne_max: neResult.ne_max,
      line_used: entry.line_name,
      W_total_nm: fw,
      W_inst_nm: instFWHM,
      W_doppler_nm: w_doppler,
      W_stark_nm: w_stark,
      uncertainty_percent: entry.uncertainty_percent,
      reliable: neResult.reliable,
      method: 'voigt_fit',
      timestamp: new Date().toISOString()
    });

  // Save spectrum for PDF
  if (uploadWindowedData.length > 0) {
    saveStarkSpectrum({
      experimental: uploadWindowedData.map(p => ({
        x: p.wl, y: p.raw
      })),
      synthetic: uploadWindowedData.map(p => ({
        x: p.wl, y: p.fit ?? 0
      })),
      xLabel: 'Wavelength (nm)',
      yLabel: 'Normalized Intensity',
      title: `${entry.line_name} — Voigt Profile Fit`,
      xMin: uploadWindowedData[0].wl,
      xMax: uploadWindowedData[uploadWindowedData.length - 1].wl
    });
  }

    setUploadIsFitting(false);
  };

  const handleAddStarkToReport = () => {
    if (!neResult || !selectedEntry) return;
    const label = starkReportLabel.trim() ||
      `${selectedEntry.line_name} Stark — ne=${
        neResult.ne_cm3.toExponential(2)
      } cm-3`;
    addReportItem({
      type: 'stark',
      label,
      result: {
        ne_cm3: neResult.ne_cm3,
        ne_min: neResult.ne_min,
        ne_max: neResult.ne_max,
        line_used: selectedEntry.line_name,
        W_total_nm: numTotalFWHM,
        W_inst_nm: numInstFWHM,
        W_doppler_nm: W_doppler,
        W_stark_nm: W_stark ?? 0,
        uncertainty_percent: selectedEntry.uncertainty_percent,
        reliable: neResult.reliable,
        method: 'manual',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    setStarkAddedToReport(true);
  };

  const handleAddUploadToReport = () => {
    if (!uploadNeResult || !uploadDetectedLine || !uploadFitResult) return;
    const label = uploadReportLabel.trim() ||
      `${uploadDetectedLine.line_name} Voigt fit — ne=${
        uploadNeResult.ne_cm3.toExponential(2)
      } cm-3`;
    addReportItem({
      type: 'stark',
      label,
      result: {
        ne_cm3: uploadNeResult.ne_cm3,
        ne_min: uploadNeResult.ne_min,
        ne_max: uploadNeResult.ne_max,
        line_used: uploadDetectedLine.line_name,
        W_total_nm: uploadFitResult.fwhm_nm,
        W_inst_nm: parseFloat(uploadInstFWHM) || 0,
        W_doppler_nm: uploadNeResult.w_doppler,
        W_stark_nm: uploadNeResult.w_stark,
        uncertainty_percent: 
          uploadDetectedLine.uncertainty_percent,
        reliable: uploadNeResult.reliable,
        method: 'voigt_fit',
        timestamp: new Date().toISOString()
      },
      spectrum: uploadWindowedData.length > 0 
        ? (() => {
            const data = uploadWindowedData;
            
            // raw is already normalized 0-1 from norm array
            // fit values from voigt() need to be 
            // normalized by their own maximum
            const fitMax = data.reduce((a, p) => Math.max(a, p.fit ?? 0), 0) || 1;

            // Ensure xMin and xMax are valid
            const xMin = data.reduce((a, p) => Math.min(a, p.wl), Infinity);
            const xMax = data.reduce((a, p) => Math.max(a, p.wl), -Infinity);

            return {
              experimental: data.map(p => ({
                x: p.wl,
                y: Math.max(0, Math.min(1, p.raw))
              })),
              synthetic: data.map(p => ({
                x: p.wl,
                y: Math.max(0, Math.min(1,
                  (p.fit ?? 0) / fitMax
                ))
              })),
              xLabel: 'Wavelength (nm)',
              yLabel: 'Normalized Intensity',
              title: uploadDetectedLine.line_name +
                     ' - Voigt Profile Fit',
              xMin,
              xMax
            };
          })()
        : undefined,
      timestamp: new Date().toISOString()
    });
    setUploadAddedToReport(true);
  };

  return (
    <div className="w-full h-full p-4 md:p-6 text-gray-200 bg-[#0a0a0f] overflow-y-auto font-sans rounded-xl border border-white/10">
      {/* SECTION 1: Header */}
      <header className="mb-8 border-b border-white/10 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#00f0ff] mb-2 drop-shadow-[0_0_15px_rgba(0,240,255,0.3)]">
          ⚡ STARK BROADENING — nₑ CALCULATOR
        </h1>
        <p className="text-gray-400 text-lg">Calculate electron density from line width</p>
      </header>

      {/* SECTION 2: Quick select buttons */}
      <div className="mb-8 bg-white/5 border border-white/10 p-5 rounded-lg backdrop-blur-sm">
        <h2 className="text-sm font-bold mb-4 text-white uppercase tracking-wider text-[#00f0ff]">Select Spectral Line</h2>
        <div className="flex flex-wrap gap-2">
          {STARK_DATABASE.map(entry => (
            <button
              key={entry.line_name}
              onClick={() => setSelectedEntry(entry)}
              className={`px-4 py-2 rounded text-sm font-bold transition-all border ${
                selectedEntry?.line_name === entry.line_name 
                  ? 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.3)]' 
                  : 'bg-black/50 border-white/10 hover:bg-white/10 text-gray-400'
              }`}
            >
              {entry.line_name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          
          {/* SECTION 3: Selected line info card */}
          {selectedEntry && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-sm shadow-xl">
              <h3 className="text-sm font-bold text-[#00f0ff] mb-4 uppercase tracking-widest border-b border-white/5 pb-2">Line Information</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 text-sm">
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-1">Line & Wavelength</p>
                  <p className="font-mono text-white text-base">{selectedEntry.line_name} <span className="text-[#00f0ff]">({selectedEntry.wavelength_nm} nm)</span></p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-1">Ref Stark Width</p>
                  <p className="font-mono text-white">{selectedEntry.stark_w_nm} nm @ {formatNe(selectedEntry.ref_ne_cm3)}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-1">Scaling & Error</p>
                  <p className="font-mono capitalize text-white">{selectedEntry.scaling} (±{selectedEntry.uncertainty_percent}%)</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-1">Reliable Range</p>
                  <p className="font-mono text-white text-xs">{formatNe(selectedEntry.ne_min_cm3)} to {formatNe(selectedEntry.ne_max_cm3)}</p>
                </div>
                <div className="col-span-2 bg-black/30 p-3 rounded border border-white/5">
                  <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-1">Reference</p>
                  <p className="text-sm text-gray-300 italic">{selectedEntry.reference}</p>
                  <p className="text-xs text-gray-400 mt-2">{selectedEntry.notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: Input fields */}
          <div className="bg-[#00f0ff]/5 border border-[#00f0ff]/20 rounded-lg p-6 backdrop-blur-sm shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f0ff]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <h3 className="text-sm font-bold text-[#00f0ff] mb-4 uppercase tracking-widest">Measured Parameters</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Total FWHM (nm)</label>
                <input 
                  type="number" step="0.001" 
                  value={totalFWHMInput} onChange={e => setTotalFWHMInput(e.target.value)} 
                  className="w-full bg-black/60 border border-[#00f0ff]/30 focus:border-[#00f0ff] rounded-md px-3 py-2 text-[#00f0ff] font-mono text-lg shadow-inner outline-none transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Instrumental FWHM (nm)</label>
                <input 
                  type="number" step="0.001" 
                  value={instFWHMInput} onChange={e => setInstFWHMInput(e.target.value)} 
                  className="w-full bg-black/60 border border-white/10 rounded-md px-3 py-2 text-white font-mono outline-none focus:border-white/30 transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Gas Temp (K)</label>
                <input 
                  type="number" step="1" 
                  value={tGasInput} onChange={e => setTGasInput(e.target.value)} 
                  className="w-full bg-black/60 border border-white/10 rounded-md px-3 py-2 text-white font-mono outline-none focus:border-white/30 transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Atomic Mass (amu)</label>
                <input 
                  type="number" step="0.001" 
                  value={atomicMassInput} onChange={e => setAtomicMassInput(e.target.value)} 
                  className="w-full bg-black/60 border border-white/10 rounded-md px-3 py-2 text-white font-mono outline-none focus:border-white/30 transition-colors" 
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 space-y-3 font-mono text-sm bg-black/40 -mx-6 -mb-6 px-6 py-6 mt-6">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded">
                <span className="text-gray-400">→ Doppler FWHM:</span>
                <span className="text-yellow-400 font-bold text-base">{W_doppler.toFixed(5)} nm</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-3 rounded">
                <span className="text-gray-400">→ Stark FWHM:</span>
                {W_stark === null ? (
                  <span className="text-red-400 font-bold uppercase text-xs">Reduce total or instrumental FWHM</span>
                ) : (
                  <span className="text-[#00f0ff] font-bold text-base">{W_stark.toFixed(5)} nm</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8 flex flex-col">
          
          {/* SECTION 5: Result card */}
          <div className={`flex-1 border-2 rounded-lg backdrop-blur-sm shadow-2xl overflow-hidden transition-colors ${
              !neResult ? 'border-white/10 bg-white/5' : 
              neResult.reliable ? 'border-green-500/50 bg-gradient-to-b from-green-500/10 to-transparent' : 
              'border-red-500/50 bg-gradient-to-b from-red-500/10 to-transparent'
            }`}>
            <div className="p-8 h-full flex flex-col justify-center">
              <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-widest text-center opacity-80">Final Density Result</h3>
              {W_stark === null ? (
                <div className="text-red-400 py-12 text-center text-xl font-medium border border-red-500/20 bg-red-500/5 rounded-lg mt-4">
                  Stark width invalid.<br/>
                  <span className="text-sm opacity-70 mt-2 block">Check: Total² - Instrumental² - Doppler² &gt; 0</span>
                </div>
              ) : !neResult ? (
                <div className="text-gray-400 py-12 text-center animate-pulse tracking-widest font-mono">
                  COMPUTING...
                </div>
              ) : (
                <div className="py-4 flex-1 flex flex-col justify-center">
                  <div 
                    className="text-5xl lg:text-6xl font-mono text-center font-bold text-white mb-2 tracking-tight" 
                    style={{ textShadow: `0 0 30px ${neResult.reliable ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)"}` }}
                  >
                    {formatNe(neResult.ne_cm3)}
                  </div>
                  <div className="text-center font-mono text-[#00f0ff] font-bold mb-4 opacity-80">cm⁻³</div>
                  
                  <p className="text-center text-sm font-mono mb-6 bg-black/40 inline-flex mx-auto px-4 py-2 rounded-full border border-white/5 text-gray-300">
                    Range: [{formatNe(neResult.ne_min)}, {formatNe(neResult.ne_max)}]
                  </p>
                  
                  {neResult.warning && (
                    <div className="text-red-400/90 text-sm font-bold text-center mb-6 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center justify-center gap-2">
                      <span className="text-xl">⚠️</span> <span>{neResult.warning}</span>
                    </div>
                  )}
                  
                  <div className="text-[11px] text-gray-500 font-mono p-5 bg-black/60 rounded-lg mt-auto border border-white/5">
                    <p className="mb-3 uppercase text-gray-400 font-bold tracking-widest border-b border-white/10 pb-2">Calculation Breakdown</p>
                    <p className="mb-1 text-gray-400">Total² - Instrumental² - Doppler² = Stark²</p>
                    <p className="mb-4 text-white opacity-90">({numTotalFWHM.toFixed(4)})² - ({numInstFWHM.toFixed(4)})² - ({W_doppler.toFixed(4)})² = {W_stark.toFixed(4)}²</p>
                    {selectedEntry?.scaling === "gigosos" ? (
                      <>
                        <p className="mb-1 text-gray-400">nₑ = ref_ne_cm3 × (W_Stark / stark_w_nm)^(1/0.668)</p>
                        <p className="text-white opacity-90">nₑ = {formatNe(selectedEntry.ref_ne_cm3)} × ({W_stark.toFixed(4)} / {selectedEntry.stark_w_nm})^(1.497)</p>
                      </>
                    ) : (
                      <>
                        <p className="mb-1 text-gray-400">nₑ = ref_ne_cm3 × (W_Stark / stark_w_nm)</p>
                        <p className="text-white opacity-90">nₑ = {formatNe(selectedEntry?.ref_ne_cm3 || 0)} × ({W_stark.toFixed(4)} / {selectedEntry?.stark_w_nm || 1})</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 6: Density context bar */}
          {neResult && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-sm relative">
              <h3 className="text-xs font-bold text-gray-400 mb-8 uppercase tracking-widest">Density Context Range</h3>
              <div className="relative h-3 bg-gradient-to-r from-blue-900 via-purple-900 to-red-900 rounded-full">
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-8 bg-white rounded shadow-[0_0_15px_white] z-10 transition-all duration-700 ease-out" 
                  style={{ 
                    left: `${Math.max(0, Math.min(100, (Math.log10(neResult.ne_cm3) - 8) / (20 - 8) * 100))}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-white text-xs font-bold w-max bg-black/80 px-2 py-1 rounded">▲ LOG(nₑ)</div>
                </div>
                {/* scale markers */}
                <div className="absolute top-6 left-0 text-xs text-gray-500 font-mono">10⁸</div>
                <div className="absolute top-6 left-1/4 -translate-x-1/2 text-xs text-gray-500 font-mono">10¹¹</div>
                <div className="absolute top-6 left-2/4 -translate-x-1/2 text-xs text-gray-500 font-mono">10¹⁴</div>
                <div className="absolute top-6 left-3/4 -translate-x-1/2 text-xs text-gray-500 font-mono">10¹⁷</div>
                <div className="absolute top-6 right-0 text-xs text-gray-500 font-mono">10²⁰</div>
              </div>
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-gray-500 px-1 mt-10">
                <span>Glow/RF</span>
                <span className="text-center">Microwave/Arc</span>
                <span className="text-right">Laser/Fusion</span>
              </div>
            </div>
          )}

          {/* SECTION 7: Feasibility indicator */}
          {neResult && (
            <div className="bg-black/30 border border-white/5 rounded-lg p-5 backdrop-blur-sm shadow-inner flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">Feasibility Ratio</h3>
                <div className="text-sm font-mono text-gray-300">W_Stark / W_Doppler = <span className="text-white font-bold">{starkDopplerRatio.toFixed(3)}</span></div>
              </div>
              <div className="ml-4">
                {starkDopplerRatio > 5 ? (
                  <span className="bg-green-500/20 text-green-400 px-4 py-2 rounded-md text-sm font-bold tracking-wider border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]">✅ EXCELLENT</span>
                ) : starkDopplerRatio >= 2 ? (
                  <span className="bg-green-400/20 text-green-300 px-4 py-2 rounded-md text-sm font-bold tracking-wider border border-green-400/30">🟢 GOOD</span>
                ) : starkDopplerRatio >= 1 ? (
                  <span className="bg-yellow-500/20 text-yellow-500 px-4 py-2 rounded-md text-sm font-bold tracking-wider border border-yellow-500/30">🟡 USE WITH CARE</span>
                ) : (
                  <span className="bg-red-500/20 text-red-500 px-4 py-2 rounded-md text-sm font-bold tracking-wider border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">🔴 NOT FEASIBLE</span>
                )}
              </div>
            </div>
          )}

          {/* Add manual Stark to Report */}
          {neResult && (
            <div className="bg-white/5 border border-[#00f0ff]/20 rounded-lg p-4 flex flex-wrap gap-3 items-center">
              <FileText size={14} className="text-[#00f0ff] shrink-0" />
              <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                Add to Report:
              </span>
              <input
                type="text"
                value={starkReportLabel}
                onChange={e => setStarkReportLabel(e.target.value)}
                placeholder={`${selectedEntry?.line_name} manual Stark`}
                className="flex-1 min-w-0 bg-black/60 border border-white/10 text-white rounded px-3 py-1.5 text-xs font-mono outline-none focus:border-[#00f0ff]"
              />
              <button
                onClick={handleAddStarkToReport}
                disabled={starkAddedToReport}
                className={`px-4 py-1.5 rounded text-xs font-bold tracking-wider uppercase transition-all shrink-0 ${
                  starkAddedToReport
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                    : 'bg-[#00f0ff]/20 border border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/30'
                }`}
              >
                {starkAddedToReport ? '✓ Added' : '+ Add'}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* SECTION 8: Multi-line table */}
      <div className="mt-8 bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Multi-Line Consistency Check</h3>
            <p className="text-xs text-gray-400 mt-1">Cross-check multiple lines to verify density convergence.</p>
          </div>
          <button 
            onClick={addMeasurement}
            disabled={!neResult}
            className="flex-shrink-0 bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 px-5 py-2.5 rounded-md transition-all text-sm font-bold shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            + Add to Table
          </button>
        </div>
        
        {savedMeasurements.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-lg bg-black/20 text-gray-500 text-sm font-medium">
            No lines added yet.<br/> <span className="opacity-70 mt-1 block tracking-wider uppercase text-[10px]">Add current calculation to compare</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10 max-w-full">
            <table className="w-full text-left text-sm whitespace-nowrap bg-black/30">
              <thead className="bg-[#00f0ff]/10 text-white border-b border-[#00f0ff]/20">
                <tr>
                  <th className="px-5 py-4 font-bold tracking-wider uppercase text-xs">Line</th>
                  <th className="px-5 py-4 font-bold tracking-wider uppercase text-xs">W_total (nm)</th>
                  <th className="px-5 py-4 font-bold tracking-wider uppercase text-xs">nₑ (cm⁻³)</th>
                  <th className="px-5 py-4 font-bold tracking-wider uppercase text-xs">Uncertainty</th>
                  <th className="px-5 py-4 font-bold tracking-wider uppercase text-xs text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-200">
                {savedMeasurements.map(m => (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4 font-bold text-[#00f0ff] bg-white/[0.02]">{m.line_name}</td>
                    <td className="px-5 py-4 font-mono">{m.measured_fwhm.toFixed(3)}</td>
                    <td className="px-5 py-4 font-mono font-medium">
                      {m.ne ? formatNe(m.ne) : <span className="text-red-400">Invalid</span>}
                    </td>
                    <td className="px-5 py-4 font-mono text-gray-400">± {m.uncertainty}%</td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => removeMeasurement(m.id)} className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-widest px-3 py-1 bg-red-500/10 rounded border border-red-500/20 transition-colors">Remove</button>
                    </td>
                  </tr>
                ))}
                
                {/* Average calculation row */}
                {savedMeasurements.filter(m => m.ne !== null).length > 0 && (
                  <tr className="bg-[#00f0ff]/5 border-t-2 border-[#00f0ff]/20">
                    <td colSpan={2} className="px-5 py-5 text-right font-bold uppercase tracking-widest text-[#00f0ff] opacity-80">
                      Mean Density
                    </td>
                    <td className="px-5 py-5 font-mono text-xl font-bold text-[#00f0ff] drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                      {formatNe(
                        savedMeasurements.reduce((acc, m) => acc + (m.ne || 0), 0) / 
                        savedMeasurements.filter(m => m.ne !== null).length
                      )}
                    </td>
                    <td colSpan={2} className="px-5 py-5 font-mono text-xs text-gray-400 tracking-wider">
                      From {savedMeasurements.filter(m => m.ne !== null).length} lines
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 9: Spectrum Upload — Voigt Fitting */}
      <div className="mt-8 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm shadow-xl overflow-hidden">
        
        {/* Collapsible header */}
        <button
          onClick={() => setUploadIsOpen(!uploadIsOpen)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
        >
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
              <span className="text-[#00f0ff]">📂</span>
              Spectrum Upload — Voigt Profile Fitting
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Upload Hα/Hβ spectrum → auto-fit Voigt → extract nₑ
            </p>
          </div>
          {uploadIsOpen 
            ? <ChevronUp className="text-gray-400" size={20} />
            : <ChevronDown className="text-gray-400" size={20} />
          }
        </button>

        {uploadIsOpen && (
          <div className="px-6 pb-6 space-y-6 border-t border-white/10">

            {/* Row 1: File upload + parameters */}
            <div className="flex flex-col md:flex-row gap-6 pt-4">
              
              {/* File upload button */}
              <div className="flex-1">
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                  Upload Spectrum (CSV / TXT)
                </label>
                <label className="flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-3 rounded cursor-pointer transition-all">
                  <Upload size={16} className="text-[#00f0ff]" />
                  <span className="text-sm text-white font-medium">
                    {uploadFileName || 'Choose file...'}
                  </span>
                  <input
                    ref={uploadFileRef}
                    type="file"
                    accept=".csv,.txt,.dat"
                    className="hidden"
                    onChange={handleUploadFile}
                  />
                </label>
                {uploadDetectedLine && (
                  <div className="mt-2 text-xs font-mono text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-2 rounded">
                    ✓ Detected: {uploadDetectedLine.line_name} 
                    ({uploadDetectedLine.wavelength_nm} nm)
                  </div>
                )}
                {uploadSpectrum && !uploadDetectedLine && (
                  <div className="mt-2 text-xs font-mono text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 rounded">
                    ⚠ No known Stark line detected in range.
                    Check wavelength axis units (must be nm).
                  </div>
                )}
              </div>

              {/* Parameters */}
              <div className="flex gap-4 flex-wrap">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                    Fit Window ± (nm)
                  </label>
                  <input
                    type="number" step="0.5" min="0.5"
                    value={uploadWindowHalf}
                    onChange={e => setUploadWindowHalf(e.target.value)}
                    className="w-24 bg-black/60 border border-white/20 text-white rounded px-3 py-2 font-mono text-center outline-none focus:border-[#00f0ff] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                    Inst. FWHM (nm)
                  </label>
                  <input
                    type="number" step="0.001" min="0"
                    value={uploadInstFWHM}
                    onChange={e => setUploadInstFWHM(e.target.value)}
                    className="w-24 bg-black/60 border border-white/20 text-white rounded px-3 py-2 font-mono text-center outline-none focus:border-[#00f0ff] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                    Gas Temp (K)
                  </label>
                  <input
                    type="number" step="50" min="100"
                    value={uploadTgas}
                    onChange={e => setUploadTgas(e.target.value)}
                    className="w-24 bg-black/60 border border-white/20 text-white rounded px-3 py-2 font-mono text-center outline-none focus:border-[#00f0ff] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Fit button */}
            <button
              onClick={fitVoigtToLine}
              disabled={!uploadSpectrum || 
                        !uploadDetectedLine || 
                        uploadIsFitting}
              className={`px-6 py-2 rounded font-bold tracking-widest uppercase transition-all flex items-center gap-2 text-sm ${
                !uploadSpectrum || !uploadDetectedLine
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : uploadIsFitting
                    ? 'bg-[#00f0ff]/50 text-white cursor-wait'
                    : 'bg-[#00f0ff] text-black hover:bg-white hover:shadow-[0_0_15px_rgba(0,240,255,0.6)]'
              }`}
            >
              {uploadIsFitting ? '⏳ Fitting...' : '⚡ Fit Voigt Profile'}
            </button>

            {/* Plot: raw spectrum + fitted Voigt */}
            {uploadFitResult && uploadSpectrum && uploadDetectedLine && (
              <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-4 h-[320px]">
                <div className="text-xs font-mono mb-2 flex flex-wrap gap-3">
                  <span className="text-gray-500">
                    {uploadDetectedLine.line_name} — Voigt fit
                  </span>
                  <span className="text-[#00f0ff]">
                    FWHM = {uploadFitResult.fwhm_nm.toFixed(4)} nm
                  </span>
                  <span className="text-gray-400">
                    Center = {uploadFitResult.center_nm.toFixed(4)} nm
                  </span>
                  <span className={
                    uploadFitQuality > 0.9 ? 'text-green-400' :
                    uploadFitQuality > 0.7 ? 'text-yellow-400' :
                    'text-red-400'
                  }>
                    R² = {uploadFitQuality.toFixed(3)}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart
                    margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                    data={uploadWindowedData}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="wl"
                      stroke="#666"
                      tick={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }}
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      label={{ value: 'Wavelength (nm)', position: 'bottom', fill: '#aaa', fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#666"
                      tick={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }}
                      label={{ value: 'Norm. Intensity', angle: -90, position: 'left', fill: '#aaa', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0a0f', borderColor: '#333', borderRadius: '8px' }}
                      itemStyle={{ fontFamily: 'monospace', fontSize: '11px' }}
                      formatter={(v: any) => typeof v === 'number' ? v.toFixed(4) : v}
                    />
                    <Legend verticalAlign="top" height={30} wrapperStyle={{ opacity: 0.8 }} />
                    <ReferenceLine
                      x={uploadFitResult.center_nm}
                      stroke="#ffffff22"
                      strokeDasharray="4 4"
                      label={{ value: 'center', fill: '#666', fontSize: 9 }}
                    />
                    <ReferenceLine
                      x={uploadFitResult.center_nm - uploadFitResult.fwhm_nm / 2}
                      stroke="#00f0ff33"
                      strokeDasharray="3 3"
                    />
                    <ReferenceLine
                      x={uploadFitResult.center_nm + uploadFitResult.fwhm_nm / 2}
                      stroke="#00f0ff33"
                      strokeDasharray="3 3"
                      label={{ value: `FWHM=${uploadFitResult.fwhm_nm.toFixed(3)}nm`, fill: '#00f0ff', fontSize: 9 }}
                    />
                    <Line
                      type="monotone" dataKey="raw"
                      stroke="#666" strokeWidth={1.5} dot={false}
                      name="Measured" isAnimationActive={false}
                    />
                    <Line
                      type="monotone" dataKey="fit"
                      stroke="#00f0ff" strokeWidth={2} dot={false}
                      name="Voigt Fit" isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Results breakdown */}
            {uploadNeResult && uploadFitResult && uploadDetectedLine && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Width breakdown */}
                <div className="bg-black/40 border border-white/10 rounded-lg p-5 font-mono text-sm space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                    Width Decomposition
                  </h4>
                  <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded">
                    <span className="text-gray-400">W_total (fit):</span>
                    <span className="text-white font-bold">
                      {uploadFitResult.fwhm_nm.toFixed(5)} nm
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded">
                    <span className="text-gray-400">W_instrumental:</span>
                    <span className="text-gray-300">
                      {(parseFloat(uploadInstFWHM)||0).toFixed(5)} nm
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded">
                    <span className="text-gray-400">W_Doppler:</span>
                    <span className="text-yellow-400">
                      {uploadNeResult.w_doppler.toFixed(5)} nm
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-[#00f0ff]/10 border border-[#00f0ff]/20 px-3 py-2 rounded">
                    <span className="text-[#00f0ff]">W_Stark:</span>
                    <span className="text-[#00f0ff] font-bold">
                      {uploadNeResult.w_stark.toFixed(5)} nm
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 pt-2">
                    W_Stark² = W_total² − W_inst² − W_Doppler²
                  </div>
                </div>

                {/* nₑ result */}
                <div className={`border-2 rounded-lg p-5 text-center relative overflow-hidden ${
                  uploadNeResult.reliable
                    ? 'border-green-500/40 bg-green-500/5'
                    : 'border-red-500/40 bg-red-500/5'
                }`}>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Electron Density
                  </h4>
                  <div
                    className="text-4xl font-mono font-bold text-white mb-1"
                    style={{
                      textShadow: uploadNeResult.reliable
                        ? '0 0 20px rgba(34,197,94,0.5)'
                        : '0 0 20px rgba(239,68,68,0.5)'
                    }}
                  >
                    {formatNe(uploadNeResult.ne_cm3)}
                  </div>
                  <div className="text-[#00f0ff] font-mono font-bold mb-3">
                    cm⁻³
                  </div>
                  <div className="text-xs text-gray-500 font-mono mb-3">
                    [{formatNe(uploadNeResult.ne_min)} – {formatNe(uploadNeResult.ne_max)}]
                  </div>
                  <div className="text-xs font-mono text-gray-500 mb-1">
                    via {uploadDetectedLine.line_name} Stark · {uploadDetectedLine.scaling} scaling
                  </div>
                  {!uploadNeResult.reliable && (
                    <div className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded">
                      ⚠ {uploadNeResult.warning}
                    </div>
                  )}
                  {uploadNeResult.reliable && (
                    <div className="mt-3 text-xs text-green-400 bg-green-500/10 border border-green-500/20 p-2 rounded">
                      ✓ Within reliable range for {uploadDetectedLine.line_name}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Add Voigt Fit to Report */}
            {uploadNeResult && uploadFitResult && (
              <div className="bg-black/40 border border-[#00f0ff]/20 rounded-lg p-5 mt-4">
                
                <div className="flex items-center gap-2 mb-3">
                  <FileText 
                    size={15} 
                    className="text-[#00f0ff]" 
                  />
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Add Voigt Fit to Report
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  
                  <input
                    type="text"
                    value={uploadReportLabel}
                    onChange={e => 
                      setUploadReportLabel(e.target.value)
                    }
                    placeholder={`${
                      uploadDetectedLine?.line_name || 'Hα'
                    } Voigt fit — ne=${
                      uploadNeResult.ne_cm3.toExponential(2)
                    } cm-3`}
                    className="flex-1 min-w-0 bg-black/60 border border-white/10 text-white rounded px-3 py-2 text-xs font-mono outline-none focus:border-[#00f0ff] transition-colors"
                  />

                  <button
                    onClick={handleAddUploadToReport}
                    disabled={uploadAddedToReport}
                    className={`px-5 py-2 rounded text-xs font-bold tracking-wider uppercase transition-all shrink-0 ${
                      uploadAddedToReport
                        ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                        : 'bg-[#00f0ff]/20 border border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/30'
                    }`}
                  >
                    {uploadAddedToReport
                      ? '✓ Added to Report'
                      : '+ Add Voigt Fit'}
                  </button>

                </div>

                {uploadAddedToReport && (
                  <p className="text-[10px] text-green-400/70 font-mono mt-3">
                    Voigt fit spectrum and electron density saved to the report.
                  </p>
                )}
              </div>
            )}

            {/* Error: Stark width unphysical OR fit failed */}
            {uploadFitResult && !uploadNeResult && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                {uploadFitQuality < 0.5 ? (
                  <>
                    ⚠ Voigt fit quality is poor (R² = {uploadFitQuality.toFixed(3)})<br/>
                    <span className="text-xs text-red-300 mt-1 block">
                      The fitted profile does not match the data well.
                      Try: (1) narrower fit window, (2) cleaner spectrum 
                      with isolated line, or (3) check that the spectrum 
                      contains the detected line.
                    </span>
                  </>
                ) : (
                  <>
                    ⚠ Stark width is unphysical 
                    (W_total² − W_inst² − W_Doppler² ≤ 0)<br/>
                    <span className="text-xs text-red-300 mt-1 block">
                      The line may be dominated by Doppler or 
                      instrumental broadening. Try reducing instrumental 
                      FWHM or check that gas temperature is correct.
                    </span>
                  </>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
