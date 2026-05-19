# PLASMA-X PRO — Complete Session Resume
# Version: 5.0
# Last updated: May 19, 2026

## HOW TO USE THIS FILE
Paste this entire document at the start of
a new Claude chat session with this message:

"I am continuing development of PLASMA-X PRO.
Please read this resume completely then confirm
you understand the project state and ask me
what we should work on next."

## PROJECT IDENTITY
App: PLASMA-X PRO v5.0
Stack: React + Vite + TypeScript
Deploy: Vercel (live)
Backup: GitHub (synced)
Developer: Dr. Youcef Fermi

## COMPLETE FILE STRUCTURE
src/
├── App.tsx                    ← Main shell + navigation
├── context/
│   └── ProjectContext.tsx     ← Global project state
├── components/
│   ├── Dashboard.tsx
│   ├── LineSearch.tsx
│   ├── MoleculeSearch.tsx
│   ├── BoltzmannTool.tsx      ← Connected to ProjectContext
│   ├── SpectrumSimulator.tsx
│   ├── NistSearch.tsx
│   ├── StarkCalculator.tsx    ← Connected to ProjectContext
│   ├── H2TemperatureCalculator.tsx ← Connected
│   ├── MolecularFitting.tsx   ← Connected
│   ├── ReportGenerator.tsx    ← PDF export
│   └── PlasmaAdvisor.tsx      ← 4-step wizard NEW v5.0
├── data/
│   ├── stark_database.ts      ← 16 Stark entries
│   └── advisor_database.ts    ← Advisor knowledge base NEW v5.0
└── utils/
    ├── molSpectro.ts          ← Molecular physics engine
    └── advisor_engine.ts      ← Advisor decision logic NEW v5.0

## NAVIGATION ROUTES (currentView strings)
dashboard, search, nist_search, molecules,
boltzmann, stark, h2temp, molfit,
simulator, report, advisor

## WHAT IS FULLY WORKING

### Diagnostic Tabs (8 total)
- Dashboard: Quick access + periodic table
- Line Search: 145 local + 120,000 NIST lines
- Boltzmann Te: Electron temperature (atomic lines)
- Spectrum Simulator: Synthetic spectrum generator
- NIST Live: Real-time 118-element database
- Stark ne: Manual entry + Voigt fit spectrum upload
- H2 Tgas: Gas temperature (Fulcher Q-branch)
- Mol Fit: 7 molecular systems

### Molecular Systems (molSpectro.ts)
N2   C(3)Pu->B(3)Pg  366-376nm  Trot+Tvib
C2   d(3)Pg->a(3)Pu  512-517nm  Trot+Tvib
CN   B(2)S+->X(2)S+  385-389nm  Trot+Tvib
OH   A(2)S+->X(2)Pi  306-320nm  Tgas only
N2+  B(2)Su+->X(2)Sg+ 388-428nm Trot+Tvib
NO   A(2)S+->X(2)Pi  226-270nm  Trot+Tvib
NH   A(3)Pi->X(3)S-  328-342nm  Tgas only

### Stark Database (stark_database.ts)
16 lines: Ha Hb Hg Hd He-D3 He-667 He-706
Ar-I-696 Ar-I-763 Ar-I-811 Ar-II-488
O-I-777 N-I-742 C-II-426 Fe-I-404 Fe-II-274
formatNe() returns ASCII "2.34 x 10^17 cm-3"

### Project System (ProjectContext.tsx)
- .plasmax file save/load
- Auto-save from all 4 analysis tabs
- reportItems[] array (multiple items)
- addReportItem/removeReportItem/clearReportItems

### Report Generator (ReportGenerator.tsx)
- PDF export: jsPDF v2.5.2
- Colors: Red titles, Green values, 
  Black text, Dark Blue notes
- drawSpectrum(): vector plots in PDF
  Legend placed BELOW plot (no overlap)
- drawBoltzmann(): scatter + regression line
- drawNe(): raised exponent display
- safe() function: ASCII conversion for PDF
- All 4 result types rendered in PDF
- Spectrum plots for molecular + Ha + H2

### Add to Report (all tabs connected)
- MolecularFitting: button after fit result
- StarkCalculator: manual + Voigt fit buttons
- H2TemperatureCalculator: button after fit
- BoltzmannTool: button after fit
- Each item stores result + optional spectrum

### Plasma Advisor (NEW v5.0)
- 4-step wizard: Source -> Gas -> Goals -> Range
- 11 plasma sources with parameters
- 10 working gases with emission lines
- 6 measurement goals
- 4 wavelength ranges
- 7 spectrometer recommendations with scoring
- Diagnostic line recommendations
- Optical setup advisor
- Warnings for incompatible selections
- Direct navigation to analysis tools

## PHYSICS IMPLEMENTED
- Boltzmann: ln(I/gA) vs E_upper -> Te
- Stark: W_stark^2 = W_total^2 - W_inst^2 - W_doppler^2
  Gigosos: ne = ref_ne x (W/W_ref)^(1/0.668)
  Linear:  ne = ref_ne x (W/W_ref)
- Doppler: W_D = lambda x 7.16e-7 x sqrt(T/M)
- Molecular: Dunham expansion + P/Q/R branches
  Honl-London factors + sigma^4 weighting
  Pseudo-Voigt 70%G + 30%L profile
  Coordinate descent 40 iterations
- OH/NH: Trot = Tgas direct measurement
- N2+ nuclear spin: odd J weight 2 (ungerade)

## SAFE DEVELOPMENT PROTOCOL
ALWAYS:
1. Claude writes prompts (not direct code)
2. You paste into Google AI Studio
3. AI Studio writes code with full context
4. Verify with checklist before next prompt
5. Commit to GitHub after each verified step
NEVER paste code directly into project files

## KNOWN PRE-EXISTING ISSUES
- TypeScript errors in nistApi.ts (non-blocking)
- TypeScript errors in glowlogic stub folder (non-blocking)
- Build sometimes times out on memory (run npx tsc instead)

## WHAT COMES NEXT — PHASE 3
Option A: 3D Setup Visualizer (Three.js)
  Most impressive, heavy dependency, 4-6 sessions
Option B: Interactive SVG Optical Diagram
  Clean, no dependencies, 2-3 sessions
Option C: Fix pre-existing TypeScript errors
  Clean up nistApi.ts and glowlogic stubs

## VERSION HISTORY
v4.0  Core app + GlowLogic merge (8 tabs)
v4.1  OH/N2+/NO/NH molecules + Stark upload
v4.2  Project system + Report Generator
v4.3  Report polish + Ha/H2 spectra in PDF
v5.0  Plasma Advisor 4-step wizard
