import React, { useState, useRef } from 'react';
import { useProject, formatProjectTimestamp } from '../context/ProjectContext';
import type { 
  BoltzmannResult,
  StarkResult,
  MolecularResult,
  H2Result,
  StoredSpectrum
} from '../context/ProjectContext';
import { formatNe } from '../data/stark_database';
import { FileText, Download, Plus, Trash2, Save, FolderOpen, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';

// ─────────────────────────────────────────────
// DOSIS FONT — Base64 embedded for jsPDF
// Source: Google Fonts (Dosis Regular 400)
// ─────────────────────────────────────────────
const DOSIS_FONT_BASE64 = `PLACEHOLDER_WILL_BE_LOADED`;

// We will load the font from CDN instead for simplicity
const loadDosisFont = async (doc: jsPDF): Promise<void> => {
  try {
    // Fetch Dosis font from Google Fonts CDN
    const response = await fetch(
      'https://fonts.gstatic.com/s/dosis/v32/HhyJU5sn9vOmLxNkIwRSjTVNWLEJ.woff2'
    );
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    doc.addFileToVFS('Dosis-Regular.woff2', base64);
    doc.addFont('Dosis-Regular.woff2', 'Dosis', 'normal');
  } catch (err) {
    console.warn('Could not load Dosis font, using Helvetica fallback');
  }
};

// ─────────────────────────────────────────────
// HELPER: Superscript exponent for PDF text
// jsPDF cannot render Unicode superscripts
// so we use standard exponential notation
// formatted cleanly for PDF output
// ─────────────────────────────────────────────
function formatNeForPDF(ne_cm3: number): string {
  if (!isFinite(ne_cm3) || ne_cm3 <= 0) return '---';
  const exp = Math.floor(Math.log10(ne_cm3));
  const mantissa = ne_cm3 / Math.pow(10, exp);
  return `${mantissa.toFixed(2)} x 10^${exp} cm-3`;
}

// Also add this separate display function
// that draws ne with proper visual exponent
// by printing the mantissa, then "x 10", 
// then the exponent in smaller font raised up
function formatNeMainPart(ne_cm3: number): string {
  if (!isFinite(ne_cm3) || ne_cm3 <= 0) return '---';
  const exp = Math.floor(Math.log10(ne_cm3));
  const mantissa = ne_cm3 / Math.pow(10, exp);
  return `${mantissa.toFixed(2)} x 10`;
}

function formatNeExpPart(ne_cm3: number): string {
  if (!isFinite(ne_cm3) || ne_cm3 <= 0) return '';
  const exp = Math.floor(Math.log10(ne_cm3));
  return `${exp}`;
}

// ─────────────────────────────────────────────
// SECTION CARD component — reusable UI block
// ─────────────────────────────────────────────
function SectionCard({
  title,
  color = '#00f0ff',
  children
}: {
  title: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border p-5 space-y-3"
      style={{
        borderColor: color + '40',
        backgroundColor: color + '08'
      }}
    >
      <div
        className="text-xs font-bold uppercase tracking-widest pb-2 border-b"
        style={{ color, borderColor: color + '30' }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// ROW component — label + value pair
// ─────────────────────────────────────────────
function Row({
  label,
  value,
  unit = '',
  highlight = false
}: {
  label: string;
  value: string | number | undefined | null;
  unit?: string;
  highlight?: boolean;
}) {
  if (value === undefined || value === null || value === '')
    return null;
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span
        className={`text-sm font-mono text-right ${
          highlight ? 'text-[#00f0ff] font-bold' : 'text-white'
        }`}
      >
        {value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// EMPTY RESULT placeholder
// ─────────────────────────────────────────────
function EmptyResult({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 p-4 text-center">
      <p className="text-xs text-gray-600 font-mono">{label}</p>
      <p className="text-[10px] text-gray-700 mt-1">
        Run analysis then results appear here automatically
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function ReportGenerator() {
  const {
    project,
    isDirty,
    setProjectName,
    setOperator,
    setInstitution,
    setDate,
    setConditions,
    newProject,
    saveProjectFile,
    loadProjectFile,
    hasAnyResult,
    removeReportItem,
    clearReportItems
  } = useProject();

  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone]   = useState(false);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { results, conditions } = project;

  // ── Classify plasma equilibrium ──────────
  const getPlasmaClass = (): string => {
    const r = results;
    if (!r.boltzmann && !r.stark && !r.molecular && !r.h2)
      return 'Insufficient data for classification';
    if (r.boltzmann && r.h2) {
      const ratio = r.boltzmann.Te_eV * 11604 / r.h2.Tgas_K;
      if (ratio > 10)
        return 'Non-equilibrium cold plasma (Tₑ >> Tgas)';
      if (ratio > 3)
        return 'Weakly non-equilibrium plasma';
      return 'Near-thermal plasma';
    }
    if (r.molecular) {
      if (!r.molecular.Tvib_K) return 'Trot measured (OH/NH — Tgas)';
      const ratio = r.molecular.Tvib_K / r.molecular.Trot_K;
      if (ratio > 3) return 'Strong non-equilibrium (Tvib >> Trot)';
      if (ratio > 1.3) return 'Mild non-equilibrium';
      return 'Near-thermal equilibrium';
    }
    return 'See individual results below';
  };

  // ── Collect references used ───────────────
  const getReferences = (): string[] => {
    const refs: string[] = [];
    if (results.boltzmann)
      refs.push('NIST Atomic Spectra Database — https://physics.nist.gov/asd');
    if (results.stark)
      refs.push('Gigosos & Cardenoso, J. Phys. B 29 (1996) 4795-4838');
    if (results.molecular) {
      refs.push('Herzberg G., Spectra of Diatomic Molecules, Van Nostrand (1950)');
      if (results.molecular.molecule === 'OH' || results.molecular.molecule === 'NH')
        refs.push('Luque J. & Crosley D.R., LIFBASE Database, SRI International (1999)');
      if (results.molecular.molecule === 'N2' || results.molecular.molecule === 'N2+')
        refs.push('Laux C.O., Optical Diagnostics and Radiative Emission of Air Plasmas, PhD Thesis, Stanford (1993)');
    }
    if (results.h2)
      refs.push('Lavrov B.P. & Pipa A.V., Opt. Spectrosc. 92 (2002) 647');
    refs.push('PLASMA-X PRO v4.1 — plasma-x.vercel.app');
    return refs;
  };

  // ── PDF EXPORT ────────────────────────────
  const exportPDF = async () => {
    setIsExporting(true);
    setExportDone(false);
    await new Promise(r => setTimeout(r, 100));

    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      // Standard jsPDF fonts are safer - Dosis WOFF2 causes cmap/widths errors
      const useFont = 'helvetica';

      const W   = 210; // A4 width mm
      const M   = 20;  // margin mm
      const TW  = W - 2 * M; // text width
      let   y   = M;

      // ── Color Scheme ─────────────────────────
      const COLOR_TITLE: [number, number, number] = [200, 40, 40];     // Red
      const COLOR_RESULT: [number, number, number] = [40, 160, 70];    // Green
      const COLOR_TEXT: [number, number, number] = [30, 30, 30];       // Black
      const COLOR_NOTE: [number, number, number] = [30, 60, 140];      // Dark Blue
      const COLOR_LABEL: [number, number, number] = [80, 80, 80];      // Gray for labels
      const COLOR_HEADER_BG: [number, number, number] = [240, 240, 245]; // Light gray bg

      // Scientific notation for molecular systems
      // ASCII-safe for jsPDF Helvetica rendering
      const MOL_SYSTEM_NOTATION: 
        Record<string, string> = {
        // N2 Second Positive System
        'C3Pu->B3Pg': 'C(3)Pu - B(3)Pg',
        'C3Piu->B3Pig': 'C(3)Pu - B(3)Pg',
        'C\\u00B3\\u03A0\\u1D64\\u2192B\\u00B3\\u03A0g':
          'C(3)Pu - B(3)Pg',
        // C2 Swan System
        'd3Pg->a3Pu': 'd(3)Pg - a(3)Pu',
        'd3Pig->a3Piu': 'd(3)Pg - a(3)Pu',
        // CN Violet System
        'B2Sg->X2Sg': 'B(2)S+ - X(2)S+',
        'B2S+->X2S+': 'B(2)S+ - X(2)S+',
        // OH UV System
        'A2Sg->X2Pi': 'A(2)S+ - X(2)Pi',
        'A2Sg+->X2Pi': 'A(2)S+ - X(2)Pi',
        'A2S+->X2Pi': 'A(2)S+ - X(2)Pi',
        // N2+ First Negative System
        'B2Su->X2Sg': 'B(2)Su+ - X(2)Sg+',
        'B2Su+->X2Sg+': 'B(2)Su+ - X(2)Sg+',
        // NO Beta System
        'A2Sg->X2Pi-NO': 'A(2)S+ - X(2)Pi',
        'A2S+->X2Pi': 'A(2)S+ - X(2)Pi',
        // NH System
        'A3Pi->X3Sg': 'A(3)Pi - X(3)S-',
        'A3Pi->X3S-': 'A(3)Pi - X(3)S-',
      };

      // Helper: get clean notation from system string
      const getMolNotation = (
        molecule: string,
        system: string
      ): string => {
        // Try direct lookup first
        const safeSystem = safe(system);
        if (MOL_SYSTEM_NOTATION[safeSystem]) {
          return MOL_SYSTEM_NOTATION[safeSystem];
        }
        // Try partial match
        for (const key of Object.keys(MOL_SYSTEM_NOTATION)) {
          if (safeSystem.includes(key) || 
              system.includes(key)) {
            return MOL_SYSTEM_NOTATION[key];
          }
        }
        // Fallback: clean up the safe string
        return safeSystem
          .replace(/Sg\\+/g, 'S+')
          .replace(/Su\\+/g, 'Su+')
          .replace(/Pig/g, 'Pg')
          .replace(/Piu/g, 'Pu')
          .replace(/3Pi/g, '(3)Pi')
          .replace(/2Pi/g, '(2)Pi')
          .replace(/3Pu/g, '(3)Pu')
          .replace(/3Pg/g, '(3)Pg')
          .replace(/2Sg/g, '(2)S+')
          .replace(/2Su/g, '(2)Su+')
          .replace(/2S\\+/g, '(2)S+')
          .replace(/->/g, ' - ');
      };

      // System full names for PDF display
      const SYSTEM_NAMES: Record<string, string> = {
        'N2':  'Second Positive System',
        'C2':  'Swan System',
        'CN':  'Violet System',
        'OH':  'UV System',
        'N2+':  'First Negative System',
        'NO':  'Beta System',
        'NH':  'NH System',
      };

      // ── ASCII-safe text for jsPDF ─────────
      // jsPDF Helvetica only supports Latin-1
      // All Unicode must be converted to ASCII
      const safe = (text: string): string => {
        return text
          // Superscript digits
          .replace(/⁰/g, '0').replace(/¹/g, '1')
          .replace(/²/g, '2').replace(/³/g, '3')
          .replace(/⁴/g, '4').replace(/⁵/g, '5')
          .replace(/⁶/g, '6').replace(/⁷/g, '7')
          .replace(/⁸/g, '8').replace(/⁹/g, '9')
          .replace(/⁻/g, '-').replace(/⁺/g, '+')
          // Subscript digits
          .replace(/₀/g, '0').replace(/₁/g, '1')
          .replace(/₂/g, '2').replace(/₃/g, '3')
          .replace(/₄/g, '4').replace(/₅/g, '5')
          .replace(/₆/g, '6').replace(/₇/g, '7')
          .replace(/₈/g, '8').replace(/₉/g, '9')
          // Subscript letters
          .replace(/ₑ/g, 'e').replace(/ₐ/g, 'a')
          // Greek uppercase
          .replace(/Α/g, 'A').replace(/Β/g, 'B')
          .replace(/Γ/g, 'G').replace(/Δ/g, 'D')
          .replace(/Ε/g, 'E').replace(/Ζ/g, 'Z')
          .replace(/Η/g, 'H').replace(/Θ/g, 'Th')
          .replace(/Ι/g, 'I').replace(/Κ/g, 'K')
          .replace(/Λ/g, 'L').replace(/Μ/g, 'M')
          .replace(/Ν/g, 'N').replace(/Ξ/g, 'X')
          .replace(/Ο/g, 'O').replace(/Π/g, 'Pi')
          .replace(/Ρ/g, 'R').replace(/Σ/g, 'Sg')
          .replace(/Τ/g, 'T').replace(/Υ/g, 'Y')
          .replace(/Φ/g, 'Ph').replace(/Χ/g, 'Ch')
          .replace(/Ψ/g, 'Ps').replace(/Ω/g, 'Om')
          // Greek lowercase
          .replace(/α/g, 'a').replace(/β/g, 'b')
          .replace(/γ/g, 'g').replace(/δ/g, 'd')
          .replace(/ε/g, 'e').replace(/ζ/g, 'z')
          .replace(/η/g, 'n').replace(/θ/g, 'th')
          .replace(/ι/g, 'i').replace(/κ/g, 'k')
          .replace(/λ/g, 'l').replace(/μ/g, 'u')
          .replace(/ν/g, 'v').replace(/ξ/g, 'x')
          .replace(/ο/g, 'o').replace(/π/g, 'pi')
          .replace(/ρ/g, 'r').replace(/σ/g, 's')
          .replace(/τ/g, 't').replace(/υ/g, 'u')
          .replace(/φ/g, 'ph').replace(/χ/g, 'ch')
          .replace(/ψ/g, 'ps').replace(/ω/g, 'om')
          // Math and arrows
          .replace(/×/g, 'x').replace(/÷/g, '/')
          .replace(/→/g, '->').replace(/←/g, '<-')
          .replace(/↔/g, '<->').replace(/⟶/g, '->')
          .replace(/≈/g, '~').replace(/±/g, '+/-')
          .replace(/≤/g, '<=').replace(/≥/g, '>=')
          .replace(/≠/g, '!=').replace(/∞/g, 'inf')
          .replace(/∑/g, 'Sum').replace(/∏/g, 'Prod')
          .replace(/√/g, 'sqrt')
          // Dots and dashes
          .replace(/·/g, '.').replace(/•/g, '-')
          .replace(/–/g, '-').replace(/—/g, '-')
          .replace(/…/g, '...')
          // Quotes
          .replace(/'/g, "'").replace(/'/g, "'")
          .replace(/"/g, '"').replace(/"/g, '"')
          // Catch any remaining non-ASCII
          .replace(/[^\x00-\x7E]/g, '');
      };

      // Convert molecule system notation to
      // clean ASCII for PDF display
      // e.g. "A²Σ⁺→X²Π" -> "A2Sg+ -> X2Pi"
      const safeMolSystem = (system: string): string => {
        return safe(system);
      };

      // Draw ne with raised exponent (professional)
      const drawNe = (
        ne_cm3: number,
        label: string,
        xPos: number,
        yPos: number
      ) => {
        const mainPart = formatNeMainPart(ne_cm3);
        const expPart  = formatNeExpPart(ne_cm3);
        
        // Label
        doc.setFontSize(10);
        doc.setFont(useFont, 'normal');
        doc.setTextColor(...COLOR_LABEL);
        doc.text(label + ':', xPos, yPos);
        
        // Main value in green bold
        doc.setFont(useFont, 'bold');
        doc.setTextColor(...COLOR_RESULT);
        doc.setFontSize(11);
        const mainW = doc.getTextWidth(mainPart + ' ');
        const valueX = M + TW - mainW - 
          doc.getTextWidth(expPart) - 8;
        doc.text(mainPart, valueX, yPos);
        
        // Exponent in smaller font raised
        doc.setFontSize(7);
        doc.text(expPart, 
          valueX + doc.getTextWidth(mainPart),
          yPos - 2.5  // raised by 2.5mm
        );
        
        // Unit
        doc.setFontSize(9);
        doc.setFont(useFont, 'normal');
        doc.setTextColor(...COLOR_TEXT);
        doc.text('cm-3',
          valueX + doc.getTextWidth(mainPart) + 
          doc.getTextWidth(expPart) + 1,
          yPos
        );
      };

      // ── Helpers ──────────────────────────
      const ln = (h = 6) => { y += h; };
      const checkPage = (need = 20) => {
        if (y + need > 277) {
          doc.addPage();
          y = M;
        }
      };

      const heading = (
        text: string, 
        size = 12, 
        isResult = false
      ) => {
        checkPage(14);
        doc.setFontSize(size);
        doc.setTextColor(...(isResult ? COLOR_RESULT : COLOR_TITLE));
        doc.setFont(useFont, 'bold');
        doc.text(safe(text), M, y);
        ln(size * 0.55);
      };

      const subheading = (text: string) => {
        checkPage(12);
        doc.setFontSize(10);
        doc.setTextColor(...COLOR_TITLE);
        doc.setFont(useFont, 'bold');
        doc.text(safe(text.toUpperCase()), M, y);
        ln(5);
        doc.setDrawColor(...COLOR_TITLE);
        doc.setLineWidth(0.5);
        doc.line(M, y, M + 50, y);
        ln(6);
      };

      const field = (
        label: string, 
        value: string, 
        indent = 0,
        isResult = false
      ) => {
        checkPage(8);
        doc.setFontSize(10);
        doc.setFont(useFont, 'normal');
        doc.setTextColor(...COLOR_LABEL);
        doc.text(safe(label) + ':', M + indent, y);
        doc.setTextColor(...(isResult ? COLOR_RESULT : COLOR_TEXT));
        doc.setFont(useFont, 'bold');
        const safeVal = safe(value);
        const vw = doc.getTextWidth(safeVal);
        doc.text(safeVal, M + TW - vw, y);
        ln(7);
      };

      const note = (text: string) => {
        checkPage(8);
        doc.setFontSize(9);
        doc.setFont(useFont, 'italic');
        doc.setTextColor(...COLOR_NOTE);
        const lines = doc.splitTextToSize(safe(text), TW);
        doc.text(lines, M, y);
        ln(lines.length * 4.5 + 3);
      };

      // ── Draw spectrum plot in PDF ─────────
      const drawSpectrum = (
        spectrum: {
          experimental: {x: number; y: number}[];
          synthetic:    {x: number; y: number}[];
          xLabel: string;
          yLabel: string;
          title:  string;
          xMin:   number;
          xMax:   number;
        },
        plotH = 55
      ) => {
        checkPage(plotH + 35);

        const plotX  = M + 14;
        const plotY  = y;
        const plotW  = TW - 14;
        const plotHh = plotH;

        // ── Safe min/max using reduce ─────────
        // Avoids stack overflow on large arrays
        const safeMin = (arr: number[]) =>
          arr.reduce(
            (a, b) => (isFinite(b) && b < a ? b : a),
            Infinity
          );
        const safeMax = (arr: number[]) =>
          arr.reduce(
            (a, b) => (isFinite(b) && b > a ? b : a),
            -Infinity
          );

        // Validate xMin/xMax
        let xMin = spectrum.xMin;
        let xMax = spectrum.xMax;

        // Fallback: compute from data if NaN
        if (!isFinite(xMin) || !isFinite(xMax) ||
            xMin === xMax) {
          const allX = [
            ...spectrum.experimental.map(p => p.x),
            ...spectrum.synthetic.map(p => p.x)
          ].filter(isFinite);
          xMin = safeMin(allX);
          xMax = safeMax(allX);
        }

        // Bail out if still invalid
        if (!isFinite(xMin) || !isFinite(xMax) ||
            xMin >= xMax) {
          y += plotHh + 14;
          return;
        }

        const xRange = xMax - xMin;

        // ── Plot background ───────────────────
        doc.setFillColor(250, 252, 255);
        doc.rect(plotX, plotY, plotW, plotHh, 'F');
        doc.setDrawColor(...COLOR_LABEL);
        doc.setLineWidth(0.3);
        doc.rect(plotX, plotY, plotW, plotHh, 'S');

        // ── Title above plot ──────────────────
        doc.setFontSize(9);
        doc.setFont(useFont, 'bold');
        doc.setTextColor(...COLOR_TITLE);
        doc.text(
          safe(spectrum.title),
          plotX + plotW / 2,
          plotY - 2,
          { align: 'center' }
        );

        // ── X axis label ──────────────────────
        doc.setFontSize(8);
        doc.setFont(useFont, 'normal');
        doc.setTextColor(...COLOR_TEXT);
        doc.text(
          safe(spectrum.xLabel),
          plotX + plotW / 2,
          plotY + plotHh + 7,
          { align: 'center' }
        );

        // ── Y axis label (rotated) ────────────
        doc.saveGraphicsState();
        doc.text(
          safe(spectrum.yLabel),
          plotX - 10,
          plotY + plotHh / 2,
          { angle: 90, align: 'center' }
        );
        doc.restoreGraphicsState();

        // ── Grid lines horizontal ─────────────
        doc.setDrawColor(220, 220, 230);
        doc.setLineWidth(0.15);
        for (let g = 0; g <= 4; g++) {
          const gy = plotY + plotHh - (g / 4) * plotHh;
          doc.line(plotX, gy, plotX + plotW, gy);
          doc.setFontSize(7);
          doc.setTextColor(...COLOR_LABEL);
          doc.text(
            (g / 4).toFixed(1),
            plotX - 1, gy + 0.5,
            { align: 'right' }
          );
        }

        // ── Grid lines vertical ───────────────
        for (let t = 0; t <= 4; t++) {
          const xVal = xMin + (t / 4) * xRange;
          const tx   = plotX + (t / 4) * plotW;
          doc.setDrawColor(220, 220, 230);
          doc.setLineWidth(0.15);
          doc.line(tx, plotY, tx, plotY + plotHh);
          doc.setFontSize(7);
          doc.setTextColor(...COLOR_LABEL);
          doc.text(
            xVal.toFixed(2),
            tx, plotY + plotHh + 4,
            { align: 'center' }
          );
        }

        // ── Coordinate mapper ─────────────────
        const toPlotX = (x: number) =>
          plotX + ((x - xMin) / xRange) * plotW;
        const toPlotY = (yv: number) =>
          plotY + plotHh -
          Math.max(0, Math.min(1, yv)) * plotHh;

        // ── Draw experimental (gray) ──────────
        const exp = spectrum.experimental.filter(
          p => isFinite(p.x) && isFinite(p.y) &&
               p.x >= xMin && p.x <= xMax
        );
        if (exp.length > 1) {
          doc.setDrawColor(130, 130, 145);
          doc.setLineWidth(0.5);
          for (let i = 1; i < exp.length; i++) {
            const x1 = toPlotX(exp[i - 1].x);
            const y1 = toPlotY(exp[i - 1].y);
            const x2 = toPlotX(exp[i].x);
            const y2 = toPlotY(exp[i].y);
            if (isFinite(x1) && isFinite(y1) &&
                isFinite(x2) && isFinite(y2)) {
              doc.line(x1, y1, x2, y2);
            }
          }
        }

        // ── Draw synthetic fit (red) ──────────
        const syn = spectrum.synthetic.filter(
          p => isFinite(p.x) && isFinite(p.y) &&
               p.x >= xMin && p.x <= xMax
        );
        if (syn.length > 1) {
          doc.setDrawColor(...COLOR_TITLE);
          doc.setLineWidth(1.0);
          for (let i = 1; i < syn.length; i++) {
            const x1 = toPlotX(syn[i - 1].x);
            const y1 = toPlotY(syn[i - 1].y);
            const x2 = toPlotX(syn[i].x);
            const y2 = toPlotY(syn[i].y);
            if (isFinite(x1) && isFinite(y1) &&
                isFinite(x2) && isFinite(y2)) {
              doc.line(x1, y1, x2, y2);
            }
          }
        }

        // ── Legend BELOW the plot ───────────
        // Never overlaps the spectral data
        const legendY = plotY + plotHh + 11;
        const centerX = plotX + plotW / 2;

        // Experimental line sample
        doc.setDrawColor(130, 130, 145);
        doc.setLineWidth(0.5);
        doc.line(
          centerX - 40,
          legendY,
          centerX - 28,
          legendY
        );

        doc.setFontSize(7.5);
        doc.setFont(useFont, 'normal');
        doc.setTextColor(...COLOR_TEXT);
        doc.text(
          'Experimental',
          centerX - 25,
          legendY + 0.8
        );

        // Synthetic fit sample
        doc.setDrawColor(...COLOR_TITLE);
        doc.setLineWidth(1.0);
        doc.line(
          centerX + 10,
          legendY,
          centerX + 22,
          legendY
        );

        doc.setTextColor(...COLOR_RESULT);
        doc.text(
          'Synthetic Fit',
          centerX + 25,
          legendY + 0.8
        );

        // Advance y past plot + legend
        y += plotHh + 18;
      };

      // ── Draw Boltzmann plot for H2 Fulcher ──
      // Plots ln(I/S_J) vs E_cm1 with
      // data points and regression line
      const drawBoltzmann = (
        data: {
          points: {x: number; y: number; label: string}[];
          slope: number;
          intercept: number;
          xMin: number;
          xMax: number;
        },
        title: string,
        plotH = 55
      ) => {
        checkPage(plotH + 25);

        const plotX = M + 18;
        const plotY = y;
        const plotW = TW - 18;
        const plotHh = plotH;

        // Plot background
        doc.setFillColor(250, 252, 255);
        doc.rect(plotX, plotY, plotW, plotHh, 'F');
        doc.setDrawColor(...COLOR_LABEL);
        doc.setLineWidth(0.3);
        doc.rect(plotX, plotY, plotW, plotHh, 'S');

        // Title
        doc.setFontSize(9);
        doc.setFont(useFont, 'bold');
        doc.setTextColor(...COLOR_TITLE);
        doc.text(
          safe(title),
          plotX + plotW / 2, plotY - 2,
          { align: 'center' }
        );

        // X axis label
        doc.setFontSize(8);
        doc.setFont(useFont, 'normal');
        doc.setTextColor(...COLOR_TEXT);
        doc.text(
          'Upper Level Energy (cm-1)',
          plotX + plotW / 2,
          plotY + plotHh + 7,
          { align: 'center' }
        );

        // Y axis label
        doc.saveGraphicsState();
        doc.text(
          'ln ( I / S_J )',
          plotX - 14,
          plotY + plotHh / 2,
          { angle: 90, align: 'center' }
        );
        doc.restoreGraphicsState();

        // Get data ranges
        const pts = data.points.filter(
          p => isFinite(p.x) && isFinite(p.y)
        );
        if (pts.length < 2) {
          y += plotHh + 14;
          return;
        }

        const xMin  = data.xMin;
        const xMax  = data.xMax;
        const yVals = pts.map(p => p.y);
        const yMin  = Math.min(...yVals) - 0.5;
        const yMax  = Math.max(...yVals) + 0.5;
        const xRange = xMax - xMin || 1;
        const yRange = yMax - yMin || 1;

        // Coordinate mappers
        const toPlotX = (x: number) =>
          plotX + ((x - xMin) / xRange) * plotW;
        const toPlotY = (yv: number) =>
          plotY + plotHh - 
          ((yv - yMin) / yRange) * plotHh;

        // Grid lines horizontal
        doc.setDrawColor(220, 220, 230);
        doc.setLineWidth(0.15);
        for (let g = 0; g <= 4; g++) {
          const gVal = yMin + (g / 4) * yRange;
          const gy   = toPlotY(gVal);
          doc.line(plotX, gy, plotX + plotW, gy);
          doc.setFontSize(7);
          doc.setTextColor(...COLOR_LABEL);
          doc.text(
            gVal.toFixed(1),
            plotX - 1, gy + 0.5,
            { align: 'right' }
          );
        }

        // Grid lines vertical + X tick labels
        for (let t = 0; t <= 4; t++) {
          const xVal = xMin + (t / 4) * xRange;
          const tx   = toPlotX(xVal);
          doc.setDrawColor(220, 220, 230);
          doc.setLineWidth(0.15);
          doc.line(tx, plotY, tx, plotY + plotHh);
          doc.setFontSize(7);
          doc.setTextColor(...COLOR_LABEL);
          doc.text(
            xVal.toFixed(0),
            tx, plotY + plotHh + 4,
            { align: 'center' }
          );
        }

        // Draw regression line in red
        const y1line = data.slope * xMin + data.intercept;
        const y2line = data.slope * xMax + data.intercept;
        doc.setDrawColor(...COLOR_TITLE);
        doc.setLineWidth(0.8);
        doc.line(
          toPlotX(xMin), toPlotY(y1line),
          toPlotX(xMax), toPlotY(y2line)
        );

        // Draw data points as filled circles in green
        doc.setFillColor(...COLOR_RESULT);
        pts.forEach(p => {
          const px = toPlotX(p.x);
          const py = toPlotY(p.y);
          if (
            px >= plotX && px <= plotX + plotW &&
            py >= plotY && py <= plotY + plotHh
          ) {
            doc.circle(px, py, 1.2, 'F');
          }
        });

        // Draw J labels next to each point
        doc.setFontSize(6.5);
        doc.setTextColor(...COLOR_NOTE);
        pts.forEach(p => {
          const px = toPlotX(p.x);
          const py = toPlotY(p.y);
          if (
            px >= plotX && px <= plotX + plotW &&
            py >= plotY && py <= plotY + plotHh
          ) {
            doc.text(p.label, px + 1.5, py - 1);
          }
        });

        // ── Legend BELOW the plot ───────────
        const legendY = plotY + plotHh + 11;
        const centerX = plotX + plotW / 2;

        // Regression line legend
        doc.setDrawColor(...COLOR_TITLE);
        doc.setLineWidth(0.8);
        doc.line(
          centerX - 40,
          legendY,
          centerX - 28,
          legendY
        );
        doc.setFontSize(7.5);
        doc.setTextColor(...COLOR_TEXT);
        doc.text('Linear fit', centerX - 25, legendY + 0.8);

        // Data points legend
        doc.setFillColor(...COLOR_RESULT);
        doc.circle(centerX + 15, legendY, 1.2, 'F');
        doc.setTextColor(...COLOR_TEXT);
        doc.text(
          'Measured points',
          centerX + 20, legendY + 0.8
        );

        y += plotHh + 18;
      };

      // ══════════════════════════════════════
      // PAGE 1 HEADER — Clean professional design
      // ══════════════════════════════════════

      // White background with subtle gray header bar
      doc.setFillColor(...COLOR_HEADER_BG);
      doc.rect(0, 0, W, 42, 'F');
      
      // Red accent line
      doc.setFillColor(...COLOR_TITLE);
      doc.rect(0, 40, W, 2, 'F');

      // Main title
      doc.setFontSize(22);
      doc.setTextColor(...COLOR_TITLE);
      doc.setFont(useFont, 'bold');
      doc.text(safe('PLASMA DIAGNOSTIC REPORT'), M, 18);

      // Subtitle
      doc.setFontSize(11);
      doc.setTextColor(...COLOR_TEXT);
      doc.setFont(useFont, 'normal');
      doc.text(safe('Generated by PLASMA-X PRO v4.2'), M, 26);
      
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_NOTE);
      doc.text(safe('plasma-x.vercel.app'), M, 32);

      // Date on right side
      doc.setFontSize(10);
      doc.setTextColor(...COLOR_TEXT);
      const dateStr = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      const dw = doc.getTextWidth(dateStr);
      doc.text(dateStr, W - M - dw, 26);

      y = 52;

      // ── Project info ─────────────────────
      subheading('Project Information');
      field('Project Name', project.name || '—');
      field('Operator',     project.operator || '—');
      field('Institution',  project.institution || '—');
      field('Date',         project.date || '—');
      ln(2);

      // ── Experiment conditions ─────────────
      subheading('Experiment Conditions');
      if (conditions.plasma_source) field('Plasma Source', conditions.plasma_source);
      if (conditions.working_gas)   field('Working Gas',   conditions.working_gas);
      if (conditions.pressure_torr) field('Pressure',      conditions.pressure_torr + ' Torr');
      if (conditions.power_W)       field('Power',         conditions.power_W + ' W');
      if (conditions.flow_rate_sccm) field('Flow Rate',    conditions.flow_rate_sccm + ' sccm');
      if (conditions.notes) {
        ln(1);
        note('Notes: ' + conditions.notes);
      }
      ln(2);

      // ── Plasma classification ─────────────
      subheading('Plasma Classification');
      const cls = getPlasmaClass();
      doc.setFontSize(10);
      doc.setTextColor(...COLOR_TITLE);
      doc.setFont(useFont, 'bold');
      doc.text(safe(cls), M, y);
      ln(8);

      // ══════════════════════════════════════
      // DIAGNOSTIC RESULTS — from reportItems
      // ══════════════════════════════════════
      subheading('Diagnostic Results');

      // Get reportItems from project
      const items = project.reportItems || [];

      if (items.length === 0) {
        // Fallback: use auto-saved single results
        // for backward compatibility
        checkPage(10);
        doc.setFontSize(9);
        doc.setFont(useFont, 'italic');
        doc.setTextColor(...COLOR_NOTE);
        doc.text(
          'No items added to report. ' +
          'Use the "Add to Report" button in ' +
          'each analysis tab to include results.',
          M, y
        );
        ln(8);
      } else {
        // Loop through ALL report items
        items.forEach((item, index) => {
          checkPage(50);

          // Item header with index
          doc.setFillColor(...COLOR_HEADER_BG);
          doc.rect(M, y - 4, TW, 8, 'F');
          doc.setFontSize(9);
          doc.setFont(useFont, 'bold');
          doc.setTextColor(...COLOR_TITLE);
          doc.text(
            `[${index + 1}]  ${safe(item.label)}`,
            M + 2, y
          );
          ln(8);

          // ── MOLECULAR RESULT ──────────────
          if (item.type === 'molecular') {
            const mol = item.result as MolecularResult;
            const isTrotOnly = 
              mol.molecule === 'OH' || 
              mol.molecule === 'NH';

            // Temperature heading
            const tempLabel = isTrotOnly
              ? `Gas Temperature  Tgas = ${mol.Trot_K} K`
              : `Rotational Temp  Trot = ${mol.Trot_K} K`;
            heading(tempLabel, 11, true);

            if (!isTrotOnly && mol.Tvib_K) {
              checkPage(8);
              doc.setFontSize(10);
              doc.setFont(useFont, 'bold');
              doc.setTextColor(...COLOR_RESULT);
              doc.text(
                `Vibrational Temp  Tvib = ${mol.Tvib_K} K`,
                M, y
              );
              ln(8);
            }

            // Molecule info — scientific notation
            const notation = getMolNotation(
              mol.molecule, 
              mol.system
            );
            const sysName = SYSTEM_NAMES[mol.molecule] 
              || '';

            field('Molecule', mol.molecule);
            field('Transition', notation);
            if (sysName) field('System', sysName);
            field('Method', 
              'Full rotational band simulation');
            field('RMSE', mol.RMSE.toFixed(5), 0, true);
            if (Math.abs(mol.shift_nm) > 0.001) {
              field('Wavelength shift', 
                mol.shift_nm.toFixed(3) + ' nm');
            }
            field('Plasma status', 
              safe(mol.equilibrium_status));
            field('Timestamp', mol.timestamp);

            // Spectrum plot
            if (item.spectrum && 
                'experimental' in item.spectrum) {
              const spec = item.spectrum as StoredSpectrum;
              ln(3);
              drawSpectrum(spec);
            }
            ln(4);
          }

          // ── STARK RESULT ──────────────────
          else if (item.type === 'stark') {
            const s = item.result as StarkResult;
            
            heading('Electron Density', 11, true);
            drawNe(s.ne_cm3, 'ne', M, y);
            ln(10);

            field('Line used', s.line_used);
            field('Method', 
              s.method === 'voigt_fit'
                ? 'Voigt profile fit (uploaded spectrum)'
                : 'Manual FWHM entry');
            field('W total', 
              s.W_total_nm.toFixed(5) + ' nm');
            field('W instrumental',
              s.W_inst_nm.toFixed(5) + ' nm');
            field('W Doppler',
              s.W_doppler_nm.toFixed(5) + ' nm');
            field('W Stark',
              s.W_stark_nm.toFixed(5) + ' nm',
              0, true);
            field('Uncertainty', 
              '+/- ' + s.uncertainty_percent + '%');
            field('Range',
              formatNeForPDF(s.ne_min) +
              '  to  ' +
              formatNeForPDF(s.ne_max));
            field('Reliable',
              s.reliable 
                ? 'Yes - within calibrated range'
                : 'No - outside calibrated range');
            field('Reference',
              'Gigosos & Cardenoso, J.Phys.B 1996');
            field('Timestamp', s.timestamp);

            // Spectrum plot for Voigt fit
            if (item.spectrum &&
                'experimental' in item.spectrum) {
              const spec = item.spectrum as StoredSpectrum;
              const expOk = spec.experimental.filter(
                p => isFinite(p.x) && isFinite(p.y)
              ).length > 1;
              const synOk = spec.synthetic.filter(
                p => isFinite(p.x) && isFinite(p.y)
              ).length > 1;
              if (expOk && synOk) {
                ln(3);
                drawSpectrum(spec, 45);
                note(
                  'Gray: measured spectrum.  ' +
                  'Red: fitted Voigt profile.  ' +
                  'FWHM extracted at half maximum intensity.'
                );
              }
            }
            ln(4);
          }

          // ── BOLTZMANN RESULT ──────────────
          else if (item.type === 'boltzmann') {
            const b = item.result as BoltzmannResult;

            heading(
              'Electron Temperature  Te = ' +
              b.Te_eV.toFixed(3) + ' eV  (' +
              (b.Te_eV * 11604).toFixed(0) + ' K)',
              11, true
            );
            field('Method', 'Boltzmann plot (OES)');
            field('R2', b.R2.toFixed(4), 0, true);
            field('Lines used',
              safe(b.lines_used.join(', ')));
            field('Timestamp', b.timestamp);
            ln(4);
          }

          // ── H2 RESULT ────────────────────
          else if (item.type === 'h2') {
            const h = item.result as H2Result;

            heading(
              'Gas Temperature  Tgas = ' +
              h.Tgas_K + ' K',
              11, true
            );
            field('Method',
              'H2 Fulcher-alpha Q-branch ' +
              'Boltzmann analysis');
            field('R2', h.R2.toFixed(4), 0, true);
            field('Reference',
              'Lavrov & Pipa, Opt. Spectrosc. 2002');
            field('Timestamp', h.timestamp);

            // Draw Boltzmann plot if data available
            if (item.spectrum &&
                'points' in item.spectrum &&
                Array.isArray(
                  (item.spectrum as any).points
                )) {
              ln(3);
              drawBoltzmann(
                item.spectrum as any,
                'H2 Fulcher-alpha — Boltzmann Plot',
                50
              );
              note(
                'Boltzmann plot: ln(I/S_J) vs ' +
                'upper level energy E (cm-1). ' +
                'Slope = -1/(kB x Tgas). ' +
                'Green circles: measured Q-branch lines. ' +
                'Red line: linear regression fit.'
              );
            }
            ln(4);
          }

          // Separator between items
          if (index < items.length - 1) {
            checkPage(6);
            doc.setDrawColor(200, 200, 210);
            doc.setLineWidth(0.2);
            doc.line(M, y, M + TW, y);
            ln(6);
          }
        });
      }

      // ══════════════════════════════════════
      // REFERENCES
      // ══════════════════════════════════════
      checkPage(40);
      subheading('References');
      const refs = getReferences();
      refs.forEach((ref, i) => {
        checkPage(7);
        doc.setFontSize(8);
        doc.setFont(useFont, 'normal');
        doc.setTextColor(...COLOR_LABEL);
        doc.text(
          safe(`[${i + 1}] ${ref}`), M, y);
        ln(5);
      });

      // ══════════════════════════════════════
      // FOOTER on every page
      // ══════════════════════════════════════
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        
        // Footer line
        doc.setDrawColor(...COLOR_TITLE);
        doc.setLineWidth(0.3);
        doc.line(M, 285, W - M, 285);
        
        // Footer text
        doc.setFontSize(8);
        doc.setTextColor(...COLOR_NOTE);
        doc.setFont(useFont, 'normal');
        doc.text(
          safe('PLASMA-X PRO v4.2 — plasma-x.vercel.app'),
          M, 290
        );
        
        doc.setTextColor(...COLOR_TEXT);
        doc.text(
          safe(`Page ${p} of ${pageCount}`),
          W - M - 18, 290
        );
      }

      // ── Save PDF ──────────────────────────
      const safeName = project.name
        .replace(/[^a-z0-9_\-\s]/gi, '')
        .replace(/\s+/g, '_')
        .toLowerCase() || 'plasma_report';
      doc.save(`${safeName}_report.pdf`);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);

    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // ── RENDER ────────────────────────────────
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">

      {/* ── Header ──────────────────────── */}
      <div className="border border-[#00f0ff]/30 bg-[#00f0ff]/5 p-6 rounded-xl flex items-center justify-between shadow-[0_0_15px_rgba(0,240,255,0.1)]">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-widest flex items-center gap-3">
            <FileText className="text-[#00f0ff]" />
            REPORT GENERATOR
          </h2>
          <p className="text-[#00f0ff]/70 font-mono text-sm mt-1">
            Professional plasma diagnostic report — PDF export
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-[10px] font-mono text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 rounded-full">
              ● Unsaved changes
            </span>
          )}
        </div>
      </div>

      {/* ── Project file toolbar ─────────── */}
      <div className="bg-black/40 border border-white/10 p-4 rounded-lg flex flex-wrap gap-3 items-center">
        <span className="text-xs text-gray-500 font-mono uppercase tracking-widest mr-2">
          Project:
        </span>
        <button
          onClick={newProject}
          className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold tracking-wider uppercase bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all"
        >
          <Plus size={13} /> New
        </button>
        <label className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold tracking-wider uppercase bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer">
          <FolderOpen size={13} /> Open
          <input
            ref={fileInputRef}
            type="file"
            accept=".plasmax"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                await loadProjectFile(file);
                setLoadError(null);
              } catch {
                setLoadError('Invalid .plasmax file. Please check the file and try again.');
              }
              e.target.value = '';
            }}
          />
        </label>
        <button
          onClick={saveProjectFile}
          className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold tracking-wider uppercase bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all"
        >
          <Save size={13} /> Save .plasmax
        </button>
        {loadError && (
          <span className="text-xs text-red-400 font-mono">
            ⚠ {loadError}
          </span>
        )}
      </div>

      {/* ── Two-column layout ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Project info form ───── */}
        <div className="space-y-4">
          <SectionCard title="Project Information" color="#00f0ff">
            {[
              { label: 'Project Name', key: 'name',
                val: project.name,
                set: (v: string) => setProjectName(v) },
              { label: 'Operator',    key: 'operator',
                val: project.operator,
                set: (v: string) => setOperator(v) },
              { label: 'Institution', key: 'institution',
                val: project.institution,
                set: (v: string) => setInstitution(v) },
              { label: 'Date',        key: 'date',
                val: project.date,
                set: (v: string) => setDate(v),
                type: 'date' }
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">
                  {f.label}
                </label>
                <input
                  type={f.type || 'text'}
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 text-white rounded px-3 py-2 text-sm font-mono outline-none focus:border-[#00f0ff] transition-colors"
                />
              </div>
            ))}
          </SectionCard>

          <SectionCard title="Experiment Conditions" color="#b400ff">
            {[
              { label: 'Plasma Source', key: 'plasma_source' },
              { label: 'Working Gas',   key: 'working_gas' },
              { label: 'Pressure (Torr)', key: 'pressure_torr' },
              { label: 'Power (W)',     key: 'power_W' },
              { label: 'Flow Rate (sccm)', key: 'flow_rate_sccm' }
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">
                  {f.label}
                </label>
                <input
                  type="text"
                  value={(conditions as any)[f.key]}
                  onChange={e =>
                    setConditions({ [f.key]: e.target.value })
                  }
                  className="w-full bg-black/60 border border-white/10 text-white rounded px-3 py-2 text-sm font-mono outline-none focus:border-[#b400ff] transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">
                Notes
              </label>
              <textarea
                value={conditions.notes}
                onChange={e => setConditions({ notes: e.target.value })}
                rows={3}
                className="w-full bg-black/60 border border-white/10 text-white rounded px-3 py-2 text-sm font-mono outline-none focus:border-[#b400ff] transition-colors resize-none"
              />
            </div>
          </SectionCard>
        </div>

        {/* ── RIGHT: Results summary ──────── */}
        <div className="space-y-4">

          <SectionCard title="Diagnostic Results — Summary" color="#00f0ff">
            {/* Report items list */}
            {(project.reportItems || []).length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-gray-500 font-mono">
                  No items added yet.
                </p>
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  Run any analysis then click<br/>
                  "+ Add to Report" to include it here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {(project.reportItems || []).map(
                  (item, index) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 bg-black/30 border border-white/10 rounded p-3"
                  >
                    <span className="text-[10px] font-mono text-gray-500 shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-white truncate">
                        {item.label}
                      </div>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span
                          className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"
                          style={{
                            color: item.type === 'molecular'
                              ? '#b400ff'
                              : item.type === 'stark'
                                ? '#00f0ff'
                                : item.type === 'h2'
                                  ? '#ff6b35'
                                  : '#888',
                            backgroundColor:
                              item.type === 'molecular'
                                ? '#b400ff22'
                                : item.type === 'stark'
                                  ? '#00f0ff22'
                                  : item.type === 'h2'
                                    ? '#ff6b3522'
                                    : '#88888822'
                          }}
                        >
                          {item.type}
                        </span>
                        {item.spectrum && (
                          <span className="text-[9px] text-green-400 font-mono">
                            + spectrum
                          </span>
                        )}
                        <span className="text-[9px] text-gray-600 font-mono">
                          {new Date(item.timestamp)
                            .toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => 
                        removeReportItem(item.id)
                      }
                      className="text-red-400 hover:text-red-300 text-xs font-bold shrink-0 px-2 py-1 bg-red-500/10 rounded border border-red-500/20 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {/* Clear all button */}
                <button
                  onClick={clearReportItems}
                  className="w-full text-[10px] font-mono text-gray-500 hover:text-red-400 py-2 border border-dashed border-white/10 rounded transition-colors uppercase tracking-wider"
                >
                  Clear all items
                </button>
              </div>
            )}
          </SectionCard>

          {/* Plasma classification */}
          {hasAnyResult() && (
            <SectionCard title="Plasma Classification" color="#ff6b35">
              <p className="text-sm text-white font-mono">
                {getPlasmaClass()}
              </p>
              <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                Based on available diagnostic results.
                Classification improves as more parameters are measured.
              </p>
            </SectionCard>
          )}

          {/* References */}
          <SectionCard title="References" color="#666">
            <div className="space-y-1">
              {getReferences().map((ref, i) => (
                <p key={i} className="text-[10px] text-gray-400 font-mono leading-relaxed">
                  [{i + 1}] {ref}
                </p>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Export button ─────────────────── */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <button
          onClick={exportPDF}
          disabled={isExporting}
          className={`px-10 py-4 rounded-xl font-bold tracking-widest uppercase transition-all flex items-center gap-3 text-base ${
            isExporting
              ? 'bg-[#00f0ff]/30 text-white cursor-wait'
              : exportDone
                ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                : 'bg-[#00f0ff] text-black hover:bg-white hover:shadow-[0_0_30px_rgba(0,240,255,0.6)]'
          }`}
        >
          {isExporting ? (
            <><RefreshCw className="animate-spin" size={20} /> Generating PDF...</>
          ) : exportDone ? (
            <>✓ PDF Downloaded!</>
          ) : (
            <><Download size={20} /> Export PDF Report</>
          )}
        </button>
        <p className="text-xs text-gray-500 font-mono text-center">
          Exports a professional A4 PDF report with all diagnostic results,
          experiment conditions, and scientific references.
        </p>
      </div>

    </div>
  );
}
