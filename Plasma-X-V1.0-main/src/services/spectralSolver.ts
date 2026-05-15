import { SAMPLE_DATA, SpectralLine } from '../data/nist_samples';

export interface SolverResult {
  type: 'search' | 'list' | 'boltzmann' | 'conversion' | 'diagnostic' | 'comparison' | 'fallback';
  content: string;
  data?: any;
}

const KB = 8.617333262e-5; // eV/K

export const spectralSolver = {
  solve: (query: string): SolverResult | null => {
    const q = query.toLowerCase();

    // 1. Identify Line: What element has a line at 488.0 nm?
    const identificationMatch = q.match(/line at\s+(\d+\.?\d*)\s*nm/i);
    if (identificationMatch) {
      const targetWl = parseFloat(identificationMatch[1]);
      const matches = SAMPLE_DATA.filter(l => Math.abs(l.wavelength - targetWl) < 0.2)
        .sort((a,b) => Math.abs(a.wavelength - targetWl) - Math.abs(b.wavelength - targetWl));
      
      if (matches.length > 0) {
        return {
          type: 'search',
          content: `Found ${matches.length} matches for **${targetWl} nm**.`,
          data: matches.slice(0, 5)
        };
      }
    }

    // 2. List Query: Show me all Ar-II lines between 400-500nm sorted by intensity
    const listMatch = q.match(/(?:show me all|list)\s+([a-z]+)-?([iv]*)\s+lines\s+between\s+(\d+)-(\d+)\s*nm/i);
    if (listMatch) {
      const element = listMatch[1].charAt(0).toUpperCase() + listMatch[1].slice(1).toLowerCase();
      const ion = listMatch[2].toUpperCase();
      const minWl = parseFloat(listMatch[3]);
      const maxWl = parseFloat(listMatch[4]);
      
      const filtered = SAMPLE_DATA.filter(l => 
        l.element.toLowerCase() === element.toLowerCase() && 
        l.ion === ion && 
        l.wavelength >= minWl && 
        l.wavelength <= maxWl
      ).sort((a,b) => b.aki * b.gk - a.aki * a.gk); // Sort by Aki*gk as proxy for intensity

      return {
        type: 'list',
        content: `Extracted **${filtered.length}** lines for **${element} ${ion}** between **${minWl}-${maxWl} nm**.`,
        data: filtered.slice(0, 10)
      };
    }

    // 3. Boltzmann: Calculate Te if I measured these intensities: 696.5nm→1000, 763.5nm→850, 772.4nm→600
    const boltzmannMatch = q.includes('calculate te') && q.includes('intensity');
    if (boltzmannMatch) {
      const pairs = Array.from(q.matchAll(/(\d+\.?\d*)nm?[\s→:]+(\d+\.?\d*)/gi));
      if (pairs.length >= 2) {
        const points = pairs.map(p => {
          const wl = parseFloat(p[1]);
          const intensity = parseFloat(p[2]);
          const line = SAMPLE_DATA.find(l => Math.abs(l.wavelength - wl) < 0.1);
          if (!line) return null;
          
          return {
            wavelength: wl,
            intensity,
            x: line.energyHigh,
            y: Math.log((intensity * line.wavelength) / (line.gk * line.aki)),
            line
          };
        }).filter(p => p !== null);

        if (points.length >= 2) {
          // Linear regression
          const n = points.length;
          const sumX = points.reduce((acc, p) => acc + p.x, 0);
          const sumY = points.reduce((acc, p) => acc + p.y, 0);
          const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);
          const sumX2 = points.reduce((acc, p) => acc + p.x * p.x, 0);
          
          const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
          const te = -1 / (KB * slope);

          return {
            type: 'boltzmann',
            content: `Regression complete. Calculated Electron Temperature: **${Math.round(te)} K** (${(KB*te).toFixed(2)} eV).`,
            data: { te, points }
          };
        }
      }
    }

    // 4. Conversion: Convert 15328.6 cm⁻¹ to nm and eV
    const conversionMatch = q.match(/convert\s+(\d+\.?\d*)\s*(cm-1|ev|nm)/i);
    if (conversionMatch) {
      const val = parseFloat(conversionMatch[1]);
      const unit = conversionMatch[2].toLowerCase();
      let resNm, resEv, resCm;

      if (unit === 'cm-1') {
        resCm = val;
        resNm = 1e7 / val;
        resEv = val / 8065.54;
      } else if (unit === 'ev') {
        resEv = val;
        resCm = val * 8065.54;
        resNm = 1239.84 / val;
      } else {
        resNm = val;
        resCm = 1e7 / val;
        resEv = 1239.84 / val;
      }

      return {
        type: 'conversion',
        content: `Transition Conversion:`,
        data: { nm: resNm, ev: resEv, cm: resCm }
      };
    }

    // 5. Diagnostic ratios: What's the best line ratio for measuring ne in an argon ICP?
    if (q.includes('line ratio') || q.includes('measure ne') || q.includes('argon icp')) {
      return {
        type: 'diagnostic',
        content: `Diagnostic recommendations for Argon plasmas:`,
        data: {
          species: 'Ar',
          ne: [
            { lines: 'Ar-I 430.0 / Ar-II 480.6', sensitivity: 'High', range: '1e14 - 1e16 cm-3' },
            { lines: 'H-beta Stark broadening', sensitivity: 'Primary', range: '1e15 - 1e18 cm-3' }
          ],
          te: [
            { lines: 'Ar-II 480.6 / Ar-II 488.0', sensitivity: 'Moderate', type: 'Ratio' }
          ]
        }
      };
    }

    // 6. Technical comparison: Compare Stark widths of Hα vs Hβ
    if (q.includes('compare stark widths')) {
      return {
        type: 'comparison',
        content: `Comparative Stark Broadening Analysis:`,
        data: {
          title: 'Hydrogen Stark Scaling',
          items: [
            { label: 'H-alpha (656.3 nm)', value: 'W ~ 1.0 (Ref)', description: 'Lower sensitivity, useful at high ne > 1e17 cm-3' },
            { label: 'H-beta (486.1 nm)', value: 'W ~ 3.5x H-alpha', description: 'Primary diagnostic, high sensitivity, minimal self-absorption' },
            { label: 'H-gamma (434.0 nm)', value: 'W ~ 6.0x H-alpha', description: 'Maximum sensitivity, but often low SNR in weak plasmas' }
          ]
        }
      };
    }

    return null;
  }
};
