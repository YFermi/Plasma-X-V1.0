import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Html
} from '@react-three/drei';
import * as THREE from 'three';
import {
  PlasmaSourceGeometry,
  LightBeam
} from './PlasmaSourceGeometry';
import {
  OpticsChain,
  Label3D
} from './OpticsChain';
import type { PlasmaSourceId } from
  '../../data/advisor_database';
import {
  PLASMA_SOURCES,
  SPECTROMETERS
} from '../../data/advisor_database';
import type { AdvisorSelection } from
  '../../utils/advisor_engine';

// ─────────────────────────────────────────────
// CLICKABLE OBJECT WRAPPER
// Makes any 3D object interactive
// ─────────────────────────────────────────────

function ClickTarget({
  children,
  onSelect,
  name
}: {
  children: React.ReactNode;
  onSelect: (name: string) => void;
  name: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(name);
      }}
    >
      {/* Hover highlight ring */}
      {hovered && (
        <mesh>
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshStandardMaterial
            color="#00f0ff"
            transparent
            opacity={0.05}
            depthWrite={false}
          />
        </mesh>
      )}
      {children}
    </group>
  );
}

// ─────────────────────────────────────────────
// MEASUREMENT BEAM
// Shows the optical axis from source to lens
// ─────────────────────────────────────────────

function MeasurementBeam({
  sourceColor = '#00f0ff'
}: {
  sourceColor?: string;
}) {
  return (
    <mesh
      position={[0.9, 0, 0]}
      rotation={[0, 0, Math.PI / 2]}
    >
      <cylinderGeometry
        args={[0.008, 0.08, 1.8, 8]}
      />
      <meshStandardMaterial
        color={sourceColor}
        emissive={sourceColor}
        emissiveIntensity={2}
        transparent
        opacity={0.2}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────
// LAB TABLE / OPTICAL BENCH
// ─────────────────────────────────────────────

function OpticalBench() {
  return (
    <group position={[2.5, -1.35, 0]}>
      {/* Bench surface */}
      <mesh>
        <boxGeometry args={[9.0, 0.12, 2.0]} />
        <meshStandardMaterial
          color="#2a3a2a"
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Bench legs */}
      {[
        [-3.8, -0.4, -0.8],
        [-3.8, -0.4,  0.8],
        [ 3.8, -0.4, -0.8],
        [ 3.8, -0.4,  0.8]
      ].map((pos, i) => (
        <mesh key={i}
          position={pos as [number,number,number]}
        >
          <boxGeometry args={[0.08, 0.8, 0.08]} />
          <meshStandardMaterial
            color="#1a2a1a"
            roughness={0.8}
          />
        </mesh>
      ))}

      {/* Rail tracks */}
      {[-0.7, 0.7].map((z, i) => (
        <mesh key={i}
          position={[0, 0.07, z]}
        >
          <boxGeometry args={[8.8, 0.04, 0.06]} />
          <meshStandardMaterial
            color="#445544"
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────
// INFO PANEL — HTML overlay in 3D space
// ─────────────────────────────────────────────

function InfoPanel({
  position,
  title,
  lines,
  color = '#00f0ff'
}: {
  position: [number,number,number];
  title:    string;
  lines:    string[];
  color?:   string;
}) {
  return (
    <Html
      position={position}
      center
      distanceFactor={8}
      occlude
    >
      <div style={{
        background: 'rgba(0,0,0,0.85)',
        border: `1px solid ${color}66`,
        borderRadius: '8px',
        padding: '10px 14px',
        minWidth: '160px',
        maxWidth: '220px',
        backdropFilter: 'blur(8px)',
        pointerEvents: 'none'
      }}>
        <div style={{
          color,
          fontFamily: 'monospace',
          fontSize: '11px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '6px',
          borderBottom: `1px solid ${color}33`,
          paddingBottom: '4px'
        }}>
          {title}
        </div>
        {lines.map((line, i) => (
          <div key={i} style={{
            color: '#cccccc',
            fontFamily: 'monospace',
            fontSize: '9px',
            lineHeight: '1.5',
            marginTop: '2px'
          }}>
            {line}
          </div>
        ))}
      </div>
    </Html>
  );
}

// ─────────────────────────────────────────────
// SELECTED OBJECT INFO
// Shows details when user clicks a component
// ─────────────────────────────────────────────

interface ComponentInfo {
  name:  string;
  title: string;
  lines: string[];
  color: string;
}

function getComponentInfo(
  name:       string,
  sourceId:   PlasmaSourceId | null,
  spectName:  string,
  focalLen:   number,
  isUV:       boolean
): ComponentInfo {
  const source = PLASMA_SOURCES.find(
    s => s.id === sourceId
  );

  switch (name) {
    case 'plasma_source':
      return {
        name,
        title: source?.name ?? 'Plasma Source',
        color: '#b400ff',
        lines: [
          source?.fullName ?? '',
          `Te: ${source?.Te_eV_range[0]}–${source?.Te_eV_range[1]} eV`,
          `Pressure: ${source?.pressureRange ?? ''}`,
          `Power: ${source?.powerRange ?? ''}`,
          source?.isEquilibrium
            ? 'Thermal equilibrium'
            : 'Non-equilibrium plasma'
        ].filter(Boolean)
      };

    case 'collection_lens':
      return {
        name,
        title: 'Collection Lens',
        color: '#00f0ff',
        lines: [
          isUV
            ? 'UV-grade fused silica'
            : 'BK7 borosilicate glass',
          'Focal length: 75–150 mm',
          'Diameter: 50 mm',
          'Coating: broadband AR',
          isUV
            ? 'Transmits down to 180 nm'
            : 'Transmits 350–2000 nm',
          'f/# matched to spectrometer'
        ]
      };

    case 'optical_fiber':
      return {
        name,
        title: 'Optical Fiber',
        color: '#ffcc44',
        lines: [
          isUV
            ? '200 μm UV-VIS solarization-resistant'
            : '400 μm VIS-NIR fiber',
          'Numerical aperture: NA = 0.22',
          'SMA-905 connectors',
          isUV
            ? 'OH-free silica core'
            : 'Step-index silica core',
          'Length: 0.5–2 m typical',
          'Transmission > 90% in range'
        ]
      };

    case 'spectrometer':
      return {
        name,
        title: spectName,
        color: '#ff6b35',
        lines: [
          'Czerny-Turner design',
          `Focal length: ${focalLen} mm`,
          `Resolution: ${
            focalLen >= 500
              ? '< 0.02 nm'
              : focalLen >= 300
                ? '< 0.05 nm'
                : '< 0.1 nm'
          }`,
          'Detector: CCD array',
          'Grating: exchangeable',
          'Range: 200–1100 nm'
        ]
      };

    default:
      return {
        name,
        title: name,
        color: '#00f0ff',
        lines: []
      };
  }
}

// ─────────────────────────────────────────────
// DISTANCE ANNOTATIONS
// ─────────────────────────────────────────────

function DistanceArrow({
  from,
  to,
  y = -1.55,
  label,
  color = '#ff6b35'
}: {
  from: number;
  to: number;
  y?: number;
  label: string;
  color?: string;
}) {
  const midX = (from + to) / 2;
  const length = Math.abs(to - from);

  if (length < 0.1) return null;

  return (
    <group>
      {/* Main horizontal line */}
      <mesh position={[midX, y, 0]}>
        <boxGeometry args={[length, 0.012, 0.012]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* Left tick mark */}
      <mesh position={[from, y, 0]}>
        <boxGeometry args={[0.012, 0.18, 0.012]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.0}
        />
      </mesh>

      {/* Right tick mark */}
      <mesh position={[to, y, 0]}>
        <boxGeometry args={[0.012, 0.18, 0.012]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.0}
        />
      </mesh>

      {/* Left arrowhead */}
      <mesh 
        position={[from + 0.08, y, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <coneGeometry args={[0.04, 0.12, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.0}
        />
      </mesh>

      {/* Right arrowhead */}
      <mesh 
        position={[to - 0.08, y, 0]}
        rotation={[0, 0, -Math.PI / 2]}
      >
        <coneGeometry args={[0.04, 0.12, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.0}
        />
      </mesh>

      {/* Label background bar */}
      <mesh position={[midX, y + 0.18, 0]}>
        <boxGeometry args={[
          Math.max(1.2, length * 0.6), 
          0.18, 
          0.01
        ]} />
        <meshStandardMaterial
          color="#000000"
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Dashed vertical guides down to bench */}
      {[from, to].map((x, i) => (
        <group key={i}>
          {[0, 1, 2, 3].map(j => (
            <mesh key={j} 
              position={[
                x, 
                y + 0.4 + j * 0.12, 
                0
              ]}
            >
              <boxGeometry 
                args={[0.008, 0.06, 0.008]} 
              />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.3}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function DistanceDot({
  position,
  color = '#ff6b35'
}: {
  position: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────
// MAIN 3D SCENE
// ─────────────────────────────────────────────

function Scene({
  sourceId,
  spectName,
  focalLen,
  isUV,
  selectedComp,
  onSelect,
  d1_mm,
  d2_mm,
  d3_mm
}: {
  sourceId:     PlasmaSourceId | null;
  spectName:    string;
  focalLen:     number;
  isUV:         boolean;
  selectedComp: string | null;
  onSelect:     (name: string) => void;
  d1_mm:        number;
  d2_mm:        number;
  d3_mm:        number;
}) {
  const source = PLASMA_SOURCES.find(
    s => s.id === sourceId
  );

  // Color theme based on plasma type
  const plasmaColor =
    sourceId === 'arc'   ? '#ffaa00' :
    sourceId === 'flame' ? '#ff6600' :
    sourceId === 'dbd'   ? '#cc88ff' :
    sourceId === 'libs'  ? '#ffffff' :
    '#00f0ff';

  const info = selectedComp
    ? getComponentInfo(
        selectedComp, sourceId,
        spectName, focalLen, isUV
      )
    : null;

  return (
    <>
      {/* ── Lighting ─────────────────────── */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow
      />
      <directionalLight
        position={[-5, 3, -5]}
        intensity={0.4}
        color="#aaccff"
      />
      <pointLight
        position={[0, 0, 0]}
        intensity={1.5}
        color={plasmaColor}
        distance={4}
      />

      {/* ── Background color ─────────────── */}
      <color attach="background" args={['#050810']} />
      <fog attach="fog" args={['#050810', 15, 35]} />

      {/* ── Optical bench ────────────────── */}
      <OpticalBench />

      {/* ── Plasma source ────────────────── */}
      <ClickTarget
        name="plasma_source"
        onSelect={onSelect}
      >
        <group position={[-1.5, 0, 0]}>
          <PlasmaSourceGeometry sourceId={sourceId} />
          <Label3D
            position={[0, 1.8, 0]}
            title={source?.name ?? 'Source'}
            subtitle={source?.pressureRange}
            color={plasmaColor}
          />
        </group>
      </ClickTarget>

      {/* ── Light beam from source ────────── */}
      <MeasurementBeam sourceColor={plasmaColor} />
      <LightBeam
        from={[0.0, 0, 0]}
        to={[1.5, 0, 0]}
        color={plasmaColor}
      />

      {/* ── Optics chain ─────────────────── */}
      <ClickTarget
        name="collection_lens"
        onSelect={onSelect}
      >
        <group position={[1.8, 0, 0]}>
          <mesh>
            <cylinderGeometry
              args={[0.3, 0.3, 0.1, 32]}
              />
            <meshStandardMaterial
              transparent
              opacity={0}
            />
          </mesh>
        </group>
      </ClickTarget>

      <ClickTarget
        name="optical_fiber"
        onSelect={onSelect}
      >
        <group position={[3.5, 0.8, 0]}>
          <mesh>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial
              transparent
              opacity={0}
            />
          </mesh>
        </group>
      </ClickTarget>

      <ClickTarget
        name="spectrometer"
        onSelect={onSelect}
      >
        <group position={[5.5, 0, 0]}>
          <mesh>
            <boxGeometry args={[2.0, 0.8, 1.0]} />
            <meshStandardMaterial
              transparent
              opacity={0}
            />
          </mesh>
        </group>
      </ClickTarget>

      <OpticsChain
        lensPosition={[1.8, 0, 0]}
        spectPosition={[5.5, 0, 0]}
        isUV={isUV}
        spectrometerName={spectName}
        focalLength={focalLen}
        showLabels={!selectedComp}
      />

      {/* ── Selected component info ───────── */}
      {info && selectedComp && (
        <InfoPanel
          position={
            selectedComp === 'plasma_source'
              ? [-1.5, 2.5, 0]
              : selectedComp === 'collection_lens'
                ? [1.8, 2.0, 0]
                : selectedComp === 'optical_fiber'
                  ? [3.5, 2.8, 0]
                  : [5.5, 2.0, 0]
          }
          title={info.title}
          lines={info.lines}
          color={info.color}
        />
      )}

      {/* ── Distance annotations ──────────── */}
      
      {/* d1: Source → Lens (working distance) */}
      <DistanceArrow
        from={-1.5}
        to={1.8}
        y={-1.6}
        label={`d1: ${d1_mm} mm`}
        color="#ff6b35"
      />
      <DistanceDot
        position={[-1.5, -1.6, 0]}
        color="#ff6b35"
      />
      <DistanceDot
        position={[1.8, -1.6, 0]}
        color="#ff6b35"
      />

      {/* d2: Lens → Fiber input (focal distance) */}
      <DistanceArrow
        from={1.8}
        to={2.15}
        y={-1.85}
        label={`d2: ${d2_mm} mm`}
        color="#00f0ff"
      />
      <DistanceDot
        position={[1.8, -1.85, 0]}
        color="#00f0ff"
      />
      <DistanceDot
        position={[2.15, -1.85, 0]}
        color="#00f0ff"
      />

      {/* d3: Fiber length indicator dots */}
      <DistanceDot
        position={[2.15, -1.6, 0]}
        color="#ffcc44"
      />
      <DistanceDot
        position={[4.6, -1.6, 0]}
        color="#ffcc44"
      />

      {/* ── Orbit controls ────────────────── */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={18}
        target={[2, 0, 0]}
        makeDefault
      />
    </>
  );
}

// ─────────────────────────────────────────────
// LOADING FALLBACK
// ─────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="w-full h-full flex items-center
      justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2
          border-[#00f0ff] border-t-transparent
          rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono
          text-[#00f0ff] uppercase tracking-widest">
          Loading 3D scene...
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CONTROL PANEL — UI overlay below the canvas
// ─────────────────────────────────────────────

function ControlPanel({
  sel,
  onSourceChange,
  onWlChange,
  selectedComp,
  onClearSelection
}: {
  sel: AdvisorSelection & {
    d1?: number;
    d2?: number;
    d3?: number;
    onD1Change?: (v: number) => void;
    onD2Change?: (v: number) => void;
    onD3Change?: (v: number) => void;
  };
  onSourceChange:  (id: PlasmaSourceId) => void;
  onWlChange:      (id: string) => void;
  selectedComp:    string | null;
  onClearSelection: () => void;
}) {
  return (
    <div className="bg-black/60 border-t
      border-white/10 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap gap-4
        items-center justify-between">

        {/* Source selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono
            text-gray-500 uppercase tracking-wider">
            Source:
          </span>
          <div className="flex flex-wrap gap-1">
            {PLASMA_SOURCES.slice(0, 6).map(src => (
              <button
                key={src.id}
                onClick={() => onSourceChange(src.id)}
                className={`px-2 py-1 rounded text-[9px]
                  font-bold uppercase tracking-wider
                  transition-all ${
                  sel.source === src.id
                    ? 'bg-[#00f0ff]/20 border border-[#00f0ff]/50 text-[#00f0ff]'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {src.icon} {src.name}
              </button>
            ))}
          </div>
        </div>

        {/* Wavelength range */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono
            text-gray-500 uppercase tracking-wider">
            Range:
          </span>
          {['UV', 'VIS', 'NIR'].map(r => (
            <button
              key={r}
              onClick={() => onWlChange(r.toLowerCase())}
              className={`px-2 py-1 rounded text-[9px]
                font-bold uppercase tracking-wider
                transition-all ${
                sel.wlRange === r.toLowerCase()
                  ? 'bg-[#b400ff]/20 border border-[#b400ff]/50 text-[#b400ff]'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Distance inputs */}
        <div className="flex items-center gap-4
          flex-wrap">
          <span className="text-[10px] font-mono
            text-gray-500 uppercase tracking-wider">
            Distances:
          </span>

          {/* d1 */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#ff6b35' }}
            />
            <label className="text-[9px] font-mono
              text-gray-400">
              Source→Lens
            </label>
            <input
              type="number"
              value={sel.d1 ?? 150}
              onChange={e => 
                sel.onD1Change?.(
                  parseInt(e.target.value) || 0
                )
              }
              className="w-14 bg-black/60 
                border border-white/10 text-white 
                rounded px-1.5 py-0.5 text-[10px] 
                font-mono text-center outline-none 
                focus:border-[#ff6b35]"
            />
            <span className="text-[9px] text-gray-600
              font-mono">
              mm
            </span>
          </div>

          {/* d2 */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#00f0ff' }}
            />
            <label className="text-[9px] font-mono
              text-gray-400">
              Lens→Fiber
            </label>
            <input
              type="number"
              value={sel.d2 ?? 75}
              onChange={e => 
                sel.onD2Change?.(
                  parseInt(e.target.value) || 0
                )
              }
              className="w-14 bg-black/60 
                border border-white/10 text-white 
                rounded px-1.5 py-0.5 text-[10px] 
                font-mono text-center outline-none 
                focus:border-[#00f0ff]"
            />
            <span className="text-[9px] text-gray-600
              font-mono">
              mm
            </span>
          </div>

          {/* d3 */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#ffcc44' }}
            />
            <label className="text-[9px] font-mono
              text-gray-400">
              Fiber
            </label>
            <input
              type="number"
              value={sel.d3 ?? 1000}
              onChange={e => 
                sel.onD3Change?.(
                  parseInt(e.target.value) || 0
                )
              }
              className="w-14 bg-black/60 
                border border-white/10 text-white 
                rounded px-1.5 py-0.5 text-[10px] 
                font-mono text-center outline-none 
                focus:border-[#ffcc44]"
            />
            <span className="text-[9px] text-gray-600
              font-mono">
              mm
            </span>
          </div>
        </div>

        {/* Selected component info */}
        {selectedComp && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#00f0ff]
              font-mono">
              Selected: {selectedComp.replace('_', ' ')}
            </span>
            <button
              onClick={onClearSelection}
              className="text-[9px] text-gray-500
                hover:text-white font-mono
                border border-white/10 px-2 py-0.5
                rounded transition-colors"
            >
              ✕ clear
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="text-[9px] font-mono
          text-gray-600 hidden lg:block">
          Drag to rotate · Scroll to zoom ·
          Click component for details
        </div>
      </div>
    </div>
  );
}

class WebGLErrorBoundary extends 
  React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
  > {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full flex items-center
          justify-center bg-[#050810]
          border border-white/10 rounded-lg"
          style={{ height: '520px' }}>
          <div className="text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <p className="text-sm font-mono
              text-gray-400">
              WebGL context lost
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
              }}
              className="px-4 py-2 rounded text-xs
                font-bold uppercase tracking-wider
                bg-[#00f0ff]/20 border
                border-[#00f0ff]/30
                text-[#00f0ff]
                hover:bg-[#00f0ff]/30"
            >
              Reload 3D Scene
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────
// MAIN EXPORT — SetupVisualizer3D
// ─────────────────────────────────────────────

export default function SetupVisualizer3D({
  advisorSel
}: {
  advisorSel?: AdvisorSelection;
}) {
  // Local state — can override advisor selection
  const [localSel, setLocalSel] =
    useState<AdvisorSelection>({
      source:  advisorSel?.source  ?? 'icp',
      gas:     advisorSel?.gas     ?? 'ar',
      goals:   advisorSel?.goals   ?? ['Te'],
      wlRange: advisorSel?.wlRange ?? 'vis'
    });

  const [selectedComp, setSelectedComp] =
    useState<string | null>(null);

  // ── Distance inputs (real-world values in mm) ──
  const [d1_working, setD1Working] = useState(150);
  const [d2_focal, setD2Focal]     = useState(75);
  const [d3_fiber, setD3Fiber]     = useState(1000);

  // Derive spectrometer from selection
  const isUV = localSel.wlRange === 'uv' ||
               localSel.wlRange === 'full';

  const needsHighRes =
    localSel.goals.includes('ne') ||
    localSel.goals.includes('Tgas');

  const spectRec = needsHighRes
    ? SPECTROMETERS.find(s =>
        s.resolution_nm <= 0.05
      ) ?? SPECTROMETERS[1]
    : SPECTROMETERS[0];

  const handleSourceChange = (id: PlasmaSourceId) => {
    setLocalSel(p => ({ ...p, source: id }));
    setSelectedComp(null);
  };

  const handleWlChange = (id: string) => {
    setLocalSel(p => ({
      ...p,
      wlRange: id as AdvisorSelection['wlRange']
    }));
    setSelectedComp(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto
      space-y-0 animate-in fade-in duration-500 pb-8">

      {/* Header */}
      <div className="border border-[#00f0ff]/30
        bg-[#00f0ff]/5 p-5 rounded-t-xl
        flex items-center justify-between
        shadow-[0_0_15px_rgba(0,240,255,0.1)]">
        <div>
          <h2 className="text-xl font-bold text-white
            tracking-widest flex items-center gap-3">
            <span className="text-2xl">🔮</span>
            3D OPTICAL SETUP VISUALIZER
          </h2>
          <p className="text-[#00f0ff]/70 font-mono
            text-xs mt-1">
            Interactive setup · Click any component
            for specifications
          </p>
        </div>

        {/* Current setup summary */}
        <div className="text-right hidden md:block">
          <div className="text-xs font-mono
            text-gray-400">
            {PLASMA_SOURCES.find(
              s => s.id === localSel.source
            )?.fullName ?? 'Select source'}
          </div>
          <div className="text-[10px] font-mono
            text-[#00f0ff]/60 mt-0.5">
            {spectRec.name} ·{' '}
            {spectRec.resolution_nm} nm resolution
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="w-full bg-[#050810]
        border-x border-white/10"
        style={{ height: '520px' }}>
        <WebGLErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Canvas
            camera={{
              position: [4, 3, 7],
              fov: 45,
              near: 0.1,
              far: 100
            }}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.2
            }}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener(
                'webglcontextlost',
                (e) => {
                  e.preventDefault();
                  console.warn(
                    'WebGL context lost. Recovering...'
                  );
                }
              );
            }}
          >
            <Scene
              sourceId={localSel.source}
              spectName={spectRec.name}
              focalLen={spectRec.focalLength_mm}
              isUV={isUV}
              selectedComp={selectedComp}
              onSelect={setSelectedComp}
              d1_mm={d1_working}
              d2_mm={d2_focal}
              d3_mm={d3_fiber}
            />
          </Canvas>
        </Suspense>
        </WebGLErrorBoundary>
      </div>

      {/* Control panel */}
      <div className="rounded-b-xl overflow-hidden
        border border-t-0 border-white/10">
        <ControlPanel
          sel={{
            ...localSel,
            d1: d1_working,
            d2: d2_focal,
            d3: d3_fiber,
            onD1Change: setD1Working,
            onD2Change: setD2Focal,
            onD3Change: setD3Fiber
          }}
          onSourceChange={handleSourceChange}
          onWlChange={handleWlChange}
          selectedComp={selectedComp}
          onClearSelection={() => setSelectedComp(null)}
        />
      </div>

      {/* Component specs grid */}
      <div className="grid grid-cols-2
        sm:grid-cols-4 gap-3 mt-4">
        {[
          {
            key: 'plasma_source',
            icon: '⚡',
            label: 'Plasma Source',
            value: PLASMA_SOURCES.find(
              s => s.id === localSel.source
            )?.name ?? '—',
            color: '#b400ff'
          },
          {
            key: 'collection_lens',
            icon: '🔭',
            label: 'Collection Lens',
            value: isUV
              ? 'UV fused silica'
              : 'BK7 glass',
            color: '#00f0ff'
          },
          {
            key: 'optical_fiber',
            icon: '💡',
            label: 'Optical Fiber',
            value: isUV
              ? '200μm UV-VIS'
              : '400μm VIS-NIR',
            color: '#ffcc44'
          },
          {
            key: 'spectrometer',
            icon: '📡',
            label: 'Spectrometer',
            value: spectRec.name,
            color: '#ff6b35'
          }
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setSelectedComp(item.key)}
            className={`p-3 rounded-lg border
              text-left transition-all ${
              selectedComp === item.key
                ? 'border-opacity-60 shadow-lg'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
            style={selectedComp === item.key ? {
              backgroundColor: item.color + '15',
              borderColor: item.color + '60'
            } : {}}
          >
            <div className="text-base mb-1">
              {item.icon}
            </div>
            <div className="text-[10px] text-gray-500
              uppercase tracking-wider mb-0.5">
              {item.label}
            </div>
            <div className="text-xs font-mono
              font-bold"
              style={{ color: item.color }}
            >
              {item.value}
            </div>
          </button>
        ))}
      </div>

    </div>
  );
}
