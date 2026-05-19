import React, { useState, useMemo } from 'react';
import {
  PLASMA_SOURCES,
  WORKING_GASES,
  MEASUREMENT_GOALS,
  WAVELENGTH_RANGES,
  type PlasmaSourceId,
  type GasId,
  type GoalId,
  type WavelengthRangeId
} from '../data/advisor_database';
import {
  runAdvisor,
  isSelectionComplete,
  getToolLink,
  type AdvisorSelection,
  type AdvisorResult
} from '../utils/advisor_engine';
import {
  Telescope,
  Zap,
  AlertTriangle,
  Info,
  ChevronRight,
  RotateCcw,
  ExternalLink,
  CheckCircle,
  Circle,
  Activity
} from 'lucide-react';

// ─────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────

function StepIndicator({
  current,
  total
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={i}>
          <div className={`flex items-center gap-2 ${
            i < current
              ? 'text-[#00f0ff]'
              : i === current
                ? 'text-white'
                : 'text-gray-600'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              i < current
                ? 'bg-[#00f0ff]/20 border-[#00f0ff]'
                : i === current
                  ? 'bg-white/10 border-white'
                  : 'bg-transparent border-gray-700'
            }`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className="text-xs font-mono uppercase tracking-wider hidden sm:block">
              {['Source', 'Gas', 'Goals', 'Range'][i]}
            </span>
          </div>
          {i < total - 1 && (
            <div className={`flex-1 h-px ${
              i < current
                ? 'bg-[#00f0ff]/50'
                : 'bg-gray-800'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// SELECTION CARD — reusable
// ─────────────────────────────────────────────

function SelectCard({
  selected,
  onClick,
  icon,
  title,
  subtitle,
  badge
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border text-left transition-all duration-200 relative overflow-hidden ${
        selected
          ? 'bg-[#00f0ff]/10 border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.15)]'
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
      }`}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <CheckCircle size={14} className="text-[#00f0ff]" />
        </div>
      )}
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-sm font-bold mb-0.5 ${
        selected ? 'text-[#00f0ff]' : 'text-white'
      }`}>
        {title}
      </div>
      {subtitle && (
        <div className="text-[10px] text-gray-500 font-mono leading-relaxed">
          {subtitle}
        </div>
      )}
      {badge && (
        <div className="mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full inline-block bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
          {badge}
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────
// GOAL CARD — multi-select version
// ─────────────────────────────────────────────

function GoalCard({
  selected,
  onClick,
  icon,
  name,
  symbol,
  description,
  unit
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  name: string;
  symbol: string;
  description: string;
  unit: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${
        selected
          ? 'bg-[#b400ff]/10 border-[#b400ff] shadow-[0_0_15px_rgba(180,0,255,0.15)]'
          : 'bg-white/5 border-white/10 hover:bg-white/10'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xl">{icon}</span>
        {selected
          ? <CheckCircle size={14} className="text-[#b400ff]" />
          : <Circle size={14} className="text-gray-700" />
        }
      </div>
      <div className={`text-sm font-bold mb-0.5 ${
        selected ? 'text-[#b400ff]' : 'text-white'
      }`}>
        {name}
      </div>
      <div className="text-[10px] font-mono text-[#00f0ff] mb-1">
        {symbol} {unit && `[${unit}]`}
      </div>
      <div className="text-[10px] text-gray-500 leading-relaxed">
        {description}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────
// WARNING BANNER
// ─────────────────────────────────────────────

function WarningBanner({
  level,
  message
}: {
  level: 'info' | 'caution' | 'warning';
  message: string;
}) {
  const styles = {
    info:    'bg-blue-500/10 border-blue-500/30 text-blue-300',
    caution: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
    warning: 'bg-red-500/10 border-red-500/30 text-red-300'
  };
  const icons = {
    info:    <Info size={14} />,
    caution: <AlertTriangle size={14} />,
    warning: <AlertTriangle size={14} />
  };
  return (
    <div className={`flex gap-3 p-4 rounded-lg border text-xs leading-relaxed ${styles[level]}`}>
      <span className="shrink-0 mt-0.5">{icons[level]}</span>
      <span>{message}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// RESULT SECTION CARD
// ─────────────────────────────────────────────

function ResultSection({
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
      className="rounded-xl border p-5 space-y-4"
      style={{
        borderColor: color + '40',
        backgroundColor: color + '08'
      }}
    >
      <h3
        className="text-xs font-bold uppercase tracking-widest border-b pb-2"
        style={{ color, borderColor: color + '30' }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function PlasmaAdvisor({
  onNavigate
}: {
  onNavigate?: (view: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState<AdvisorSelection>({
    source:  null,
    gas:     null,
    goals:   [],
    wlRange: null
  });
  const [showResults, setShowResults] = useState(false);

  const result: AdvisorResult | null = useMemo(
    () => showResults ? runAdvisor(sel) : null,
    [sel, showResults]
  );

  const canProceed = [
    sel.source !== null,
    sel.gas !== null || step >= 2,
    sel.goals.length > 0,
    sel.wlRange !== null
  ];

  const reset = () => {
    setSel({ source: null, gas: null,
             goals: [], wlRange: null });
    setStep(0);
    setShowResults(false);
  };

  const toggleGoal = (id: GoalId) => {
    setSel(prev => ({
      ...prev,
      goals: prev.goals.includes(id)
        ? prev.goals.filter(g => g !== id)
        : [...prev.goals, id]
    }));
  };

  // ── RENDER ──────────────────────────────────
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8
      animate-in fade-in duration-500 pb-16">

      {/* ── Header ─────────────────────────── */}
      <div className="border border-[#00f0ff]/30
        bg-[#00f0ff]/5 p-6 rounded-xl
        shadow-[0_0_15px_rgba(0,240,255,0.1)]
        flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white
            tracking-widest flex items-center gap-3">
            <Telescope className="text-[#00f0ff]" />
            PLASMA ADVISOR
          </h2>
          <p className="text-[#00f0ff]/70 font-mono
            text-sm mt-1">
            Expert recommendations for your plasma
            diagnostic setup
          </p>
        </div>
        {showResults && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2
              rounded-lg text-xs font-bold uppercase
              tracking-wider text-gray-400
              bg-white/5 border border-white/10
              hover:bg-white/10 transition-all"
          >
            <RotateCcw size={13} />
            Start Over
          </button>
        )}
      </div>

      {/* ── Wizard steps ────────────────────── */}
      {!showResults && (
        <div className="bg-black/40 border
          border-white/10 rounded-xl p-6
          backdrop-blur-sm space-y-8">

          <StepIndicator current={step} total={4} />

          {/* STEP 0: Plasma Source */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white
                uppercase tracking-widest">
                Step 1 — What is your plasma source?
              </h3>
              <div className="grid grid-cols-2
                sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {PLASMA_SOURCES.map(src => (
                  <SelectCard
                    key={src.id}
                    selected={sel.source === src.id}
                    onClick={() => setSel(p => ({
                      ...p, source: src.id
                    }))}
                    icon={src.icon}
                    title={src.name}
                    subtitle={src.fullName}
                    badge={src.pressure === 'high'
                      ? 'Atmospheric'
                      : src.pressure === 'low'
                        ? 'Low pressure'
                        : src.pressureRange}
                  />
                ))}
              </div>

              {sel.source && (
                <div className="bg-black/40 border
                  border-[#00f0ff]/20 rounded-lg p-4 mt-4">
                  {(() => {
                    const s = PLASMA_SOURCES.find(
                      x => x.id === sel.source
                    );
                    if (!s) return null;
                    return (
                      <div className="space-y-2">
                        <p className="text-xs text-white
                          font-bold">
                          {s.fullName}
                        </p>
                        <p className="text-xs text-gray-400
                          leading-relaxed">
                          {s.description}
                        </p>
                        <div className="flex flex-wrap
                          gap-2 mt-2">
                          {s.typicalApplications.map(
                            app => (
                            <span key={app}
                              className="text-[9px]
                              font-mono px-2 py-0.5 rounded
                              bg-white/5 text-gray-400
                              border border-white/10">
                              {app}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* STEP 1: Working Gas */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white
                uppercase tracking-widest">
                Step 2 — What is your working gas?
              </h3>
              <div className="grid grid-cols-2
                sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {WORKING_GASES.map(gas => (
                  <SelectCard
                    key={gas.id}
                    selected={sel.gas === gas.id}
                    onClick={() => setSel(p => ({
                      ...p, gas: gas.id
                    }))}
                    icon={gas.icon}
                    title={gas.formula}
                    subtitle={gas.name}
                    badge={
                      gas.molecularSystems.length > 0
                        ? `${gas.molecularSystems.length} mol. systems`
                        : 'Atomic'
                    }
                  />
                ))}
              </div>

              {sel.gas && (
                <div className="bg-black/40 border
                  border-[#00f0ff]/20 rounded-lg p-4">
                  {(() => {
                    const g = WORKING_GASES.find(
                      x => x.id === sel.gas
                    );
                    if (!g) return null;
                    return (
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px]
                            text-gray-500 uppercase
                            tracking-wider mb-1">
                            Key atomic lines
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {g.keyEmissions.map(e => (
                              <span key={e}
                                className="text-[9px]
                                font-mono px-2 py-0.5
                                rounded bg-[#00f0ff]/10
                                text-[#00f0ff] border
                                border-[#00f0ff]/20">
                                {e}
                              </span>
                            ))}
                          </div>
                        </div>
                        {g.molecularSystems.length > 0 && (
                          <div>
                            <p className="text-[10px]
                              text-gray-500 uppercase
                              tracking-wider mb-1">
                              Molecular systems
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {g.molecularSystems.map(
                                m => (
                                <span key={m}
                                  className="text-[9px]
                                  font-mono px-2 py-0.5
                                  rounded bg-[#b400ff]/10
                                  text-[#b400ff] border
                                  border-[#b400ff]/20">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Measurement Goals */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white
                uppercase tracking-widest">
                Step 3 — What do you want to measure?
                <span className="text-gray-500 ml-2
                  text-xs normal-case font-normal">
                  (select all that apply)
                </span>
              </h3>
              <div className="grid grid-cols-2
                sm:grid-cols-3 gap-3">
                {MEASUREMENT_GOALS.map(goal => (
                  <GoalCard
                    key={goal.id}
                    selected={sel.goals.includes(goal.id)}
                    onClick={() => toggleGoal(goal.id)}
                    icon={goal.icon}
                    name={goal.name}
                    symbol={goal.symbol}
                    description={goal.description}
                    unit={goal.unit}
                  />
                ))}
              </div>
              {sel.goals.length === 0 && (
                <p className="text-xs text-gray-500
                  font-mono text-center py-2">
                  Select at least one measurement goal
                </p>
              )}
            </div>
          )}

          {/* STEP 3: Wavelength Range */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white
                uppercase tracking-widest">
                Step 4 — What wavelength range do you have?
              </h3>
              <div className="grid grid-cols-2
                sm:grid-cols-4 gap-3">
                {WAVELENGTH_RANGES.map(wr => (
                  <SelectCard
                    key={wr.id}
                    selected={sel.wlRange === wr.id}
                    onClick={() => setSel(p => ({
                      ...p, wlRange: wr.id
                    }))}
                    icon={
                      wr.id === 'uv' ? '🔵' :
                      wr.id === 'vis' ? '🌈' :
                      wr.id === 'nir' ? '🔴' : '✨'
                    }
                    title={wr.name}
                    subtitle={wr.range}
                    badge={wr.requiresQuartz
                      ? 'Quartz optics'
                      : 'Glass optics OK'}
                  />
                ))}
              </div>
              {sel.wlRange && (
                <div className="bg-black/40 border
                  border-white/10 rounded-lg p-3 mt-2">
                  <p className="text-xs text-[#00f0ff]
                    font-mono">
                    {WAVELENGTH_RANGES.find(
                      w => w.id === sel.wlRange
                    )?.note}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-4
            border-t border-white/10">
            <button
              onClick={() => setStep(s =>
                Math.max(0, s - 1)
              )}
              disabled={step === 0}
              className="px-5 py-2 rounded-lg text-xs
                font-bold uppercase tracking-wider
                text-gray-400 bg-white/5
                border border-white/10
                hover:bg-white/10 transition-all
                disabled:opacity-30
                disabled:cursor-not-allowed"
            >
              ← Back
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep(s =>
                  Math.min(3, s + 1)
                )}
                disabled={!canProceed[step]}
                className="px-6 py-2 rounded-lg text-xs
                  font-bold uppercase tracking-wider
                  bg-[#00f0ff] text-black
                  hover:bg-white transition-all
                  disabled:bg-gray-700
                  disabled:text-gray-500
                  disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => setShowResults(true)}
                disabled={!isSelectionComplete(sel)}
                className="px-6 py-2 rounded-lg text-xs
                  font-bold uppercase tracking-wider
                  bg-[#00f0ff] text-black
                  hover:bg-white transition-all
                  disabled:bg-gray-700
                  disabled:text-gray-500
                  disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                <Zap size={14} />
                Get Recommendations
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── RESULTS PANEL ───────────────────── */}
      {showResults && result && (
        <div className="space-y-6">

          {/* Summary banner */}
          <div className="bg-[#00f0ff]/5 border
            border-[#00f0ff]/30 rounded-xl p-5">
            <p className="text-sm text-white
              leading-relaxed font-mono">
              {result.summary}
            </p>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-3">
              {result.warnings.map((w, i) => (
                <WarningBanner
                  key={i}
                  level={w.level}
                  message={w.message}
                />
              ))}
            </div>
          )}

          {/* Plasma parameters */}
          <ResultSection
            title="Expected Plasma Parameters"
            color="#00f0ff"
          >
            <div className="grid grid-cols-2
              sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {result.plasmaParams.map((p, i) => (
                <div key={i}
                  className="bg-black/40 rounded-lg
                  p-3 text-center border border-white/5">
                  <div className="text-[9px] text-gray-500
                    uppercase tracking-wider mb-1">
                    {p.label}
                  </div>
                  <div className="text-xs font-mono
                    font-bold"
                    style={{ color: p.color }}>
                    {p.value}
                  </div>
                </div>
              ))}
            </div>
          </ResultSection>

          {/* Two column layout */}
          <div className="grid grid-cols-1
            lg:grid-cols-2 gap-6">

            {/* Recommended technique */}
            <ResultSection
              title="Recommended Technique"
              color="#00f0ff"
            >
              {result.techniques
                .slice(0, 2)
                .map((t, i) => (
                <div key={i}
                  className={`p-4 rounded-lg border ${
                    i === 0
                      ? 'bg-[#00f0ff]/10 border-[#00f0ff]/30'
                      : 'bg-white/5 border-white/10'
                  }`}>
                  <div className="flex items-center
                    justify-between mb-2">
                    <span className={`text-sm font-bold ${
                      i === 0
                        ? 'text-[#00f0ff]'
                        : 'text-gray-300'
                    }`}>
                      {i === 0 ? '⭐ ' : ''}{t.acronym}
                    </span>
                    <span className={`text-[9px]
                      font-mono px-2 py-0.5 rounded-full
                      ${t.requiresLaser
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                      }`}>
                      {t.requiresLaser
                        ? 'Laser required'
                        : 'No laser needed'}
                    </span>
                  </div>
                  <p className="text-xs text-white
                    font-medium mb-1">{t.name}</p>
                  <p className="text-[10px] text-gray-400
                    leading-relaxed">{t.note}</p>
                </div>
              ))}
            </ResultSection>

            {/* Recommended lines */}
            <ResultSection
              title="Recommended Diagnostic Lines"
              color="#b400ff"
            >
              <div className="space-y-2">
                {result.lines.map((rec, i) => (
                  <div key={i}
                    className={`p-3 rounded-lg border
                    flex items-start gap-3 ${
                      rec.inRange
                        ? 'bg-white/5 border-white/10'
                        : 'bg-black/20 border-white/5 opacity-60'
                    }`}>
                    <div className="shrink-0 mt-0.5">
                      {rec.inRange
                        ? <CheckCircle size={12}
                            className="text-green-400" />
                        : <Circle size={12}
                            className="text-gray-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center
                        gap-2 flex-wrap">
                        <span className="text-xs
                          font-mono font-bold text-white">
                          {rec.line.line}
                        </span>
                        <span className="text-[9px]
                          text-[#00f0ff] font-mono">
                          {rec.line.wavelength_nm}nm
                        </span>
                        <span className={`text-[9px]
                          font-bold px-1.5 py-0.5
                          rounded ${
                          rec.line.priority === 'primary'
                            ? 'bg-[#b400ff]/20 text-[#b400ff]'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {rec.line.priority}
                        </span>
                      </div>
                      <p className="text-[10px]
                        text-gray-400 mt-0.5">
                        {rec.line.notes}
                      </p>
                      {rec.line.toolLink && rec.inRange && (
                        <button
                          onClick={() =>
                            onNavigate?.(
                              getToolLink(
                                rec.line.toolLink
                              ) ?? ''
                            )
                          }
                          className="mt-1 text-[9px]
                          font-bold text-[#00f0ff]
                          flex items-center gap-1
                          hover:text-white transition-colors"
                        >
                          <ExternalLink size={9} />
                          Open in analysis tool
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ResultSection>
          </div>

          {/* Spectrometer recommendations */}
          <ResultSection
            title="Recommended Spectrometers"
            color="#ff6b35"
          >
            <div className="text-xs text-gray-400
              font-mono mb-3">
              Minimum resolution needed:
              <span className="text-[#ff6b35]
                font-bold ml-2">
                ≤ {result.resolutionNeeded_nm} nm
              </span>
            </div>
            <div className="grid grid-cols-1
              sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {result.spectrometers.map((rec, i) => (
                <div key={i}
                  className={`p-4 rounded-lg border
                  relative ${
                    i === 0
                      ? 'bg-[#ff6b35]/10 border-[#ff6b35]/40'
                      : 'bg-white/5 border-white/10'
                  }`}>
                  {i === 0 && (
                    <div className="absolute -top-2
                      left-3 text-[9px] font-bold
                      bg-[#ff6b35] text-black
                      px-2 py-0.5 rounded-full">
                      TOP PICK
                    </div>
                  )}
                  <div className="text-xs font-bold
                    text-white mb-0.5">
                    {rec.spec.name}
                  </div>
                  <div className="text-[10px]
                    text-gray-400 mb-2">
                    {rec.spec.manufacturer}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between
                      text-[9px] font-mono">
                      <span className="text-gray-500">
                        Resolution
                      </span>
                      <span className={
                        rec.spec.resolution_nm <=
                        result.resolutionNeeded_nm
                          ? 'text-green-400 font-bold'
                          : 'text-red-400'
                      }>
                        {rec.spec.resolution_nm} nm
                      </span>
                    </div>
                    <div className="flex justify-between
                      text-[9px] font-mono">
                      <span className="text-gray-500">
                        Focal length
                      </span>
                      <span className="text-white">
                        {rec.spec.focalLength_mm} mm
                      </span>
                    </div>
                    <div className="flex justify-between
                      text-[9px] font-mono">
                      <span className="text-gray-500">
                        Detector
                      </span>
                      <span className="text-white
                        text-right max-w-[80px] leading-tight">
                        {rec.spec.detector}
                      </span>
                    </div>
                    <div className="flex justify-between
                      text-[9px] font-mono">
                      <span className="text-gray-500">
                        Price class
                      </span>
                      <span className={
                        rec.spec.priceClass === 'budget'
                          ? 'text-green-400'
                          : rec.spec.priceClass === 'mid'
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }>
                        {rec.spec.priceClass}
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-500
                    mt-2 leading-relaxed border-t
                    border-white/5 pt-2">
                    {rec.spec.note}
                  </p>
                </div>
              ))}
            </div>
          </ResultSection>

          {/* Optical setup */}
          <ResultSection
            title="Optical Setup Recommendations"
            color="#00f0ff"
          >
            <div className="space-y-3">
              {result.opticalSetup.map((item, i) => (
                <div key={i}
                  className="flex gap-4 p-3 rounded-lg
                  bg-black/30 border border-white/5">
                  <div className="shrink-0 w-28 text-[10px]
                    font-bold text-[#00f0ff] uppercase
                    tracking-wider leading-tight mt-0.5">
                    {item.component}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white
                      font-mono mb-1">
                      {item.specification}
                    </div>
                    <div className="text-[10px]
                      text-gray-400 leading-relaxed">
                      {item.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ResultSection>

          {/* Quick launch buttons */}
          <ResultSection
            title="Open Analysis Tools"
            color="#b400ff"
          >
            <p className="text-xs text-gray-400 mb-3">
              Based on your goals, these tools are
              most relevant:
            </p>
            <div className="flex flex-wrap gap-3">
              {result.lines
                .filter(r =>
                  r.inRange && r.line.toolLink
                )
                .map((r, i) => r.line.toolLink)
                .filter((v, i, a) => a.indexOf(v) === i)
                .slice(0, 5)
                .map((toolLink, i) => {
                  const labels: Record<string, string> = {
                    boltzmann:   '📊 Boltzmann Tₑ',
                    stark:       '⚡ Stark nₑ',
                    molfit:      '🌊 Molecular Fitting',
                    h2temp:      '🔥 H₂ Tgas',
                    nist_search: '🔬 NIST Live'
                  };
                  const key = getToolLink(
                    toolLink ?? undefined
                  );
                  if (!key) return null;
                  return (
                    <button
                      key={i}
                      onClick={() => onNavigate?.(key)}
                      className="px-4 py-2 rounded-lg
                        text-xs font-bold uppercase
                        tracking-wider transition-all
                        flex items-center gap-2
                        bg-[#b400ff]/20
                        border border-[#b400ff]/30
                        text-[#b400ff]
                        hover:bg-[#b400ff]/30"
                    >
                      {labels[key] ?? key}
                      <ChevronRight size={12} />
                    </button>
                  );
                })
              }
            </div>
          </ResultSection>

        </div>
      )}

    </div>
  );
}
