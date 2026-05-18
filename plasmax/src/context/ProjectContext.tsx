import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback,
  useRef
} from 'react';

// ─────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────

export interface ProjectConditions {
  plasma_source: string;
  working_gas: string;
  pressure_torr: string;
  power_W: string;
  flow_rate_sccm: string;
  notes: string;
}

export interface BoltzmannResult {
  Te_eV: number;
  R2: number;
  lines_used: string[];
  timestamp: string;
}

export interface StarkResult {
  ne_cm3: number;
  ne_min: number;
  ne_max: number;
  line_used: string;
  W_total_nm: number;
  W_inst_nm: number;
  W_doppler_nm: number;
  W_stark_nm: number;
  uncertainty_percent: number;
  reliable: boolean;
  method: 'manual' | 'voigt_fit';
  timestamp: string;
}

export interface MolecularResult {
  molecule: string;
  system: string;
  Trot_K: number;
  Tvib_K: number | null;
  RMSE: number;
  shift_nm: number;
  equilibrium_status: string;
  timestamp: string;
}

export interface H2Result {
  Tgas_K: number;
  R2: number;
  timestamp: string;
}

export interface SpectrumDataPoint {
  x: number;
  y: number;
}

export interface StoredSpectrum {
  experimental: SpectrumDataPoint[];
  synthetic: SpectrumDataPoint[];
  xLabel: string;
  yLabel: string;
  title: string;
  xMin: number;
  xMax: number;
}

export interface BoltzmannPoint {
  x: number;   // E_upper (cm⁻¹)
  y: number;   // ln(I / gA)
  label: string;
}

export interface StoredBoltzmann {
  points: BoltzmannPoint[];
  slope: number;
  intercept: number;
  xMin: number;
  xMax: number;
}

export type ReportItemType = 
  'molecular' | 'stark' | 'boltzmann' | 'h2';

export interface ReportItem {
  id: string;
  type: ReportItemType;
  label: string;
  result: BoltzmannResult | StarkResult | 
          MolecularResult | H2Result;
  spectrum?: StoredSpectrum | StoredBoltzmann;
  timestamp: string;
}

export interface ProjectResults {
  boltzmann?: BoltzmannResult;
  stark?: StarkResult;
  molecular?: MolecularResult;
  h2?: H2Result;
  // Spectrum data for PDF plots
  boltzmann_spectrum?: StoredBoltzmann;
  stark_spectrum?: StoredSpectrum;
  molecular_spectrum?: StoredSpectrum;
  h2_spectrum?: StoredSpectrum;
}

export interface PlasmaXProject {
  version: string;
  created: string;
  modified: string;
  name: string;
  operator: string;
  institution: string;
  date: string;
  conditions: ProjectConditions;
  results: ProjectResults;
  reportItems: ReportItem[];
}

// ─────────────────────────────────────────────
// DEFAULT VALUES
// ─────────────────────────────────────────────

const DEFAULT_CONDITIONS: ProjectConditions = {
  plasma_source: '',
  working_gas: '',
  pressure_torr: '',
  power_W: '',
  flow_rate_sccm: '',
  notes: ''
};

const createNewProject = (): PlasmaXProject => ({
  version: '4.1',
  created: new Date().toISOString(),
  modified: new Date().toISOString(),
  name: 'New Project',
  operator: '',
  institution: '',
  date: new Date().toISOString().split('T')[0],
  conditions: { ...DEFAULT_CONDITIONS },
  results: {},
  reportItems: []
});

// ─────────────────────────────────────────────
// CONTEXT DEFINITION
// ─────────────────────────────────────────────

interface ProjectContextValue {
  project: PlasmaXProject;
  isDirty: boolean;

  // Project metadata setters
  setProjectName: (name: string) => void;
  setOperator: (name: string) => void;
  setInstitution: (inst: string) => void;
  setDate: (date: string) => void;
  setConditions: (c: Partial<ProjectConditions>) => void;

  // Result setters — called by analysis tabs
  saveBoltzmannResult: (r: BoltzmannResult) => void;
  saveStarkResult: (r: StarkResult) => void;
  saveMolecularResult: (r: MolecularResult) => void;
  saveH2Result: (r: H2Result) => void;
  saveStarkSpectrum: (s: StoredSpectrum) => void;
  saveMolecularSpectrum: (s: StoredSpectrum) => void;
  saveBoltzmannSpectrum: (s: StoredBoltzmann) => void;
  saveH2Spectrum: (s: StoredSpectrum) => void;

  // File operations
  newProject: () => void;
  saveProjectFile: () => void;
  loadProjectFile: (file: File) => Promise<void>;

  // Utility
  hasAnyResult: () => boolean;

  reportItems: ReportItem[];
  addReportItem: (item: Omit<ReportItem, 'id'>) => void;
  removeReportItem: (id: string) => void;
  clearReportItems: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

// ─────────────────────────────────────────────
// PROVIDER COMPONENT
// ─────────────────────────────────────────────

export function ProjectProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [project, setProject] = 
    useState<PlasmaXProject>(createNewProject);
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Touch helper ──────────────────────────
  const touch = useCallback(
    (updater: (p: PlasmaXProject) => PlasmaXProject) => {
      setProject(prev => ({
        ...updater(prev),
        modified: new Date().toISOString()
      }));
      setIsDirty(true);
    },
    []
  );

  // ── Metadata setters ─────────────────────
  const setProjectName = useCallback((name: string) => {
    touch(p => ({ ...p, name }));
  }, [touch]);

  const setOperator = useCallback((operator: string) => {
    touch(p => ({ ...p, operator }));
  }, [touch]);

  const setInstitution = useCallback((institution: string) => {
    touch(p => ({ ...p, institution }));
  }, [touch]);

  const setDate = useCallback((date: string) => {
    touch(p => ({ ...p, date }));
  }, [touch]);

  const setConditions = useCallback(
    (c: Partial<ProjectConditions>) => {
      touch(p => ({
        ...p,
        conditions: { ...p.conditions, ...c }
      }));
    },
    [touch]
  );

  // ── Result savers ────────────────────────
  const saveBoltzmannResult = useCallback(
    (r: BoltzmannResult) => {
      touch(p => ({
        ...p,
        results: { ...p.results, boltzmann: r }
      }));
    },
    [touch]
  );

  const saveStarkResult = useCallback(
    (r: StarkResult) => {
      touch(p => ({
        ...p,
        results: { ...p.results, stark: r }
      }));
    },
    [touch]
  );

  const saveMolecularResult = useCallback(
    (r: MolecularResult) => {
      touch(p => ({
        ...p,
        results: { ...p.results, molecular: r }
      }));
    },
    [touch]
  );

  const saveH2Result = useCallback(
    (r: H2Result) => {
      touch(p => ({
        ...p,
        results: { ...p.results, h2: r }
      }));
    },
    [touch]
  );

  const saveStarkSpectrum = useCallback(
    (s: StoredSpectrum) => {
      touch(p => ({
        ...p,
        results: { ...p.results, stark_spectrum: s }
      }));
    }, [touch]
  );

  const saveMolecularSpectrum = useCallback(
    (s: StoredSpectrum) => {
      touch(p => ({
        ...p,
        results: { ...p.results, molecular_spectrum: s }
      }));
    }, [touch]
  );

  const saveBoltzmannSpectrum = useCallback(
    (s: StoredBoltzmann) => {
      touch(p => ({
        ...p,
        results: { ...p.results, boltzmann_spectrum: s }
      }));
    }, [touch]
  );

  const saveH2Spectrum = useCallback(
    (s: StoredSpectrum) => {
      touch(p => ({
        ...p,
        results: { ...p.results, h2_spectrum: s }
      }));
    }, [touch]
  );

  const addReportItem = useCallback(
    (item: Omit<ReportItem, 'id'>) => {
      const id = Math.random()
        .toString(36).substring(2, 9);
      touch(p => ({
        ...p,
        reportItems: [
          ...(p.reportItems || []),
          { ...item, id }
        ]
      }));
    }, [touch]
  );

  const removeReportItem = useCallback(
    (id: string) => {
      touch(p => ({
        ...p,
        reportItems: (p.reportItems || [])
          .filter(item => item.id !== id)
      }));
    }, [touch]
  );

  const clearReportItems = useCallback(() => {
    touch(p => ({ ...p, reportItems: [] }));
  }, [touch]);

  // ── New project ──────────────────────────
  const newProject = useCallback(() => {
    setProject(createNewProject());
    setIsDirty(false);
  }, []);

  // ── Save to file ─────────────────────────
  const saveProjectFile = useCallback(() => {
    const data = JSON.stringify(project, null, 2);
    const blob = new Blob([data], { 
      type: 'application/json' 
    });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    // Sanitize filename
    const safeName = project.name
      .replace(/[^a-z0-9_\-\s]/gi, '')
      .replace(/\s+/g, '_')
      .toLowerCase() || 'plasmax_project';
    a.href     = url;
    a.download = `${safeName}.plasmax`;
    a.click();
    URL.revokeObjectURL(url);
    setIsDirty(false);
  }, [project]);

  // ── Load from file ───────────────────────
  const loadProjectFile = useCallback(
    async (file: File): Promise<void> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const parsed = JSON.parse(
              e.target?.result as string
            ) as PlasmaXProject;
            // Basic version check
            if (!parsed.version || !parsed.results) {
              throw new Error('Invalid .plasmax file');
            }
            setProject(parsed);
            setIsDirty(false);
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    },
    []
  );

  // ── Utility ──────────────────────────────
  const hasAnyResult = useCallback((): boolean => {
    const r = project.results;
    return !!(
      r.boltzmann || 
      r.stark || 
      r.molecular || 
      r.h2
    );
  }, [project.results]);

  // ─────────────────────────────────────────
  const value: ProjectContextValue = {
    project,
    isDirty,
    setProjectName,
    setOperator,
    setInstitution,
    setDate,
    setConditions,
    saveBoltzmannResult,
    saveStarkResult,
    saveMolecularResult,
    saveH2Result,
    saveStarkSpectrum,
    saveMolecularSpectrum,
    saveBoltzmannSpectrum,
    saveH2Spectrum,
    newProject,
    saveProjectFile,
    loadProjectFile,
    hasAnyResult,
    reportItems: project.reportItems || [],
    addReportItem,
    removeReportItem,
    clearReportItems,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
      {/* Hidden file input for loading projects */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".plasmax"
        className="hidden"
      />
    </ProjectContext.Provider>
  );
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error(
      'useProject must be used inside ProjectProvider'
    );
  }
  return ctx;
}

// ─────────────────────────────────────────────
// HELPER: Format timestamp for display
// ─────────────────────────────────────────────

export function formatProjectTimestamp(
  iso: string
): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
