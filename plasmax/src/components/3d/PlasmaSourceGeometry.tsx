import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cylinder, Box, Sphere, Torus, 
         RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { PlasmaSourceId } from 
  '../../data/advisor_database';

// ─────────────────────────────────────────────
// PLASMA GLOW MATERIAL
// Animated emissive material for plasma region
// ─────────────────────────────────────────────

function PlasmaGlow({ 
  color = '#00f0ff',
  intensity = 1.0,
  position = [0, 0, 0] as [number,number,number],
  scale = [1, 1, 1] as [number,number,number]
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef  = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!matRef.current) return;
    // Pulsing glow animation
    const t = state.clock.elapsedTime;
    matRef.current.emissiveIntensity =
      intensity * (0.7 + 0.3 * Math.sin(t * 2.5));
    if (meshRef.current) {
      meshRef.current.scale.setScalar(
        1 + 0.03 * Math.sin(t * 3.0)
      );
    }
  });

  return (
    <mesh ref={meshRef} position={position}
      scale={scale}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        transparent
        opacity={0.25}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────
// LIGHT BEAM — animated ray from source to lens
// ─────────────────────────────────────────────

export function LightBeam({
  from = [0, 0, 0] as [number,number,number],
  to   = [3, 0, 0] as [number,number,number],
  color = '#00f0ff'
}) {
  const ref = useRef<THREE.Mesh>(null);

  const { mid, length, rotation } = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end   = new THREE.Vector3(...to);
    const dir   = end.clone().sub(start);
    const len   = dir.length();
    const mid   = start.clone().add(dir.clone().multiplyScalar(0.5));
    const axis  = new THREE.Vector3(0, 1, 0);
    const rot   = new THREE.Quaternion().setFromUnitVectors(
      axis, dir.normalize()
    );
    const euler = new THREE.Euler().setFromQuaternion(rot);
    return { 
      mid: mid.toArray() as [number,number,number], 
      length: len, 
      rotation: [euler.x, euler.y, euler.z] as [number,number,number]
    };
  }, [from, to]);

  useFrame((state) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    const t = state.clock.elapsedTime;
    mat.opacity = 0.3 + 0.2 * Math.sin(t * 4);
  });

  return (
    <mesh ref={ref} position={mid} rotation={rotation}>
      <cylinderGeometry args={[0.015, 0.015, length, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────
// DBD — Dielectric Barrier Discharge
// Two parallel plates with plasma between
// ─────────────────────────────────────────────

function DBDGeometry() {
  return (
    <group>
      {/* Top electrode */}
      <RoundedBox args={[2.0, 0.15, 1.2]}
        radius={0.04} position={[0, 0.55, 0]}>
        <meshStandardMaterial
          color="#888" metalness={0.8}
          roughness={0.2} />
      </RoundedBox>

      {/* Top dielectric */}
      <Box args={[1.9, 0.08, 1.1]}
        position={[0, 0.38, 0]}>
        <meshStandardMaterial
          color="#ddeeff" transparent
          opacity={0.7} roughness={0.1} />
      </Box>

      {/* Bottom dielectric */}
      <Box args={[1.9, 0.08, 1.1]}
        position={[0, -0.38, 0]}>
        <meshStandardMaterial
          color="#ddeeff" transparent
          opacity={0.7} roughness={0.1} />
      </Box>

      {/* Bottom electrode */}
      <RoundedBox args={[2.0, 0.15, 1.2]}
        radius={0.04} position={[0, -0.55, 0]}>
        <meshStandardMaterial
          color="#888" metalness={0.8}
          roughness={0.2} />
      </RoundedBox>

      {/* Plasma region */}
      <PlasmaGlow
        color="#b400ff"
        intensity={1.2}
        position={[0, 0, 0]}
        scale={[1.8, 0.4, 1.0]}
      />

      {/* Discharge filaments */}
      {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.5, 6]} />
          <meshStandardMaterial
            color="#cc88ff"
            emissive="#cc88ff"
            emissiveIntensity={2}
            transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────
// ICP — Inductively Coupled Plasma
// Quartz tube with RF coil around it
// ─────────────────────────────────────────────

function ICPGeometry() {
  // Generate coil points
  const coilPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const turns = 5;
    const n = turns * 40;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const angle = t * turns * Math.PI * 2;
      const y = (t - 0.5) * 2.0;
      pts.push(new THREE.Vector3(
        0.72 * Math.cos(angle),
        y,
        0.72 * Math.sin(angle)
      ));
    }
    return pts;
  }, []);

  const coilGeom = useMemo(() => {
    const curve  = new THREE.CatmullRomCurve3(coilPoints);
    return new THREE.TubeGeometry(curve, 200, 0.03, 8, false);
  }, [coilPoints]);

  useEffect(() => {
    return () => {
      coilGeom.dispose();
    };
  }, [coilGeom]);

  return (
    <group>
      {/* Quartz tube */}
      <Cylinder args={[0.65, 0.65, 2.2, 32, 1, true]}
        position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#aaddff" transparent
          opacity={0.25} side={THREE.DoubleSide}
          roughness={0.0} metalness={0.0} />
      </Cylinder>

      {/* Tube walls */}
      <Cylinder args={[0.68, 0.68, 2.2, 32, 1, true]}>
        <meshStandardMaterial
          color="#ffffff" transparent
          opacity={0.08} side={THREE.DoubleSide} />
      </Cylinder>

      {/* RF Coil */}
      <mesh geometry={coilGeom}>
        <meshStandardMaterial
          color="#cc8800" metalness={0.95}
          roughness={0.05}
          emissive="#441100"
          emissiveIntensity={0.3} />
      </mesh>

      {/* Plasma column */}
      <PlasmaGlow
        color="#00ccff"
        intensity={1.5}
        position={[0, 0, 0]}
        scale={[0.55, 1.8, 0.55]}
      />
    </group>
  );
}

// ─────────────────────────────────────────────
// ARC — Thermal Arc Plasma
// Two pointed electrodes with arc between
// ─────────────────────────────────────────────

function ArcGeometry() {
  const arcRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!arcRef.current) return;
    const t = state.clock.elapsedTime;
    // Arc flicker
    arcRef.current.position.x =
      0.04 * Math.sin(t * 30 + 1.3);
    arcRef.current.position.z =
      0.04 * Math.sin(t * 27);
  });

  return (
    <group>
      {/* Cathode (bottom) */}
      <group position={[0, -0.9, 0]}>
        <Cylinder args={[0.12, 0.12, 1.0, 12]}>
          <meshStandardMaterial
            color="#666" metalness={0.9}
            roughness={0.2} />
        </Cylinder>
        {/* Tip */}
        <Cylinder args={[0, 0.12, 0.25, 12]}
          position={[0, 0.62, 0]}>
          <meshStandardMaterial
            color="#888" metalness={0.9}
            roughness={0.1} />
        </Cylinder>
      </group>

      {/* Anode (top) */}
      <group position={[0, 0.9, 0]}
        rotation={[Math.PI, 0, 0]}>
        <Cylinder args={[0.12, 0.12, 1.0, 12]}>
          <meshStandardMaterial
            color="#555" metalness={0.9}
            roughness={0.2} />
        </Cylinder>
        <Cylinder args={[0, 0.12, 0.25, 12]}
          position={[0, 0.62, 0]}>
          <meshStandardMaterial
            color="#777" metalness={0.9}
            roughness={0.1} />
        </Cylinder>
      </group>

      {/* Arc column */}
      <mesh ref={arcRef}>
        <cylinderGeometry args={[0.04, 0.04, 1.0, 8]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffee88"
          emissiveIntensity={4}
          transparent opacity={0.9} />
      </mesh>

      {/* Glow */}
      <PlasmaGlow
        color="#ffaa00"
        intensity={2.0}
        position={[0, 0, 0]}
        scale={[0.6, 0.8, 0.6]}
      />
    </group>
  );
}

// ─────────────────────────────────────────────
// APPJ — Atmospheric Pressure Plasma Jet
// Small nozzle with jet of plasma
// ─────────────────────────────────────────────

function APPJGeometry() {
  const jetRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!jetRef.current) return;
    const t = state.clock.elapsedTime;
    jetRef.current.scale.y =
      0.9 + 0.1 * Math.sin(t * 8);
  });

  return (
    <group>
      {/* Device body */}
      <RoundedBox args={[0.8, 1.8, 0.8]}
        radius={0.1} position={[0, 0.6, 0]}>
        <meshStandardMaterial
          color="#334455" metalness={0.6}
          roughness={0.4} />
      </RoundedBox>

      {/* Nozzle */}
      <Cylinder args={[0.12, 0.18, 0.4, 16]}
        position={[0, -0.3, 0]}>
        <meshStandardMaterial
          color="#aabbcc" metalness={0.8}
          roughness={0.2} />
      </Cylinder>

      {/* Plasma jet */}
      <mesh ref={jetRef} position={[0, -0.85, 0]}>
        <cylinderGeometry
          args={[0.04, 0.12, 0.8, 12]} />
        <meshStandardMaterial
          color="#88aaff"
          emissive="#88aaff"
          emissiveIntensity={2}
          transparent opacity={0.6} />
      </mesh>

      {/* Jet tip glow */}
      <PlasmaGlow
        color="#88aaff"
        intensity={1.0}
        position={[0, -1.1, 0]}
        scale={[0.25, 0.25, 0.25]}
      />
    </group>
  );
}

// ─────────────────────────────────────────────
// MICROWAVE — Surfatron / MWPJ
// Waveguide tube with microwave launcher
// ─────────────────────────────────────────────

function MicrowaveGeometry() {
  return (
    <group>
      {/* Quartz tube (vertical) */}
      <Cylinder args={[0.3, 0.3, 3.0, 24, 1, true]}>
        <meshStandardMaterial
          color="#aaddff" transparent
          opacity={0.2} side={THREE.DoubleSide} />
      </Cylinder>

      {/* Waveguide launcher */}
      <Box args={[1.4, 0.5, 0.8]}
        position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#779988" metalness={0.8}
          roughness={0.2} />
      </Box>

      {/* Plasma column */}
      <PlasmaGlow
        color="#00ffaa"
        intensity={1.8}
        position={[0, 0, 0]}
        scale={[0.22, 2.4, 0.22]}
      />

      {/* MW symbol rings */}
      {[-0.5, 0, 0.5].map((y, i) => (
        <Torus key={i}
          args={[0.35, 0.02, 8, 24]}
          position={[0, y, 0]}
          rotation={[Math.PI/2, 0, 0]}>
          <meshStandardMaterial
            color="#00ffaa"
            emissive="#00ffaa"
            emissiveIntensity={1}
            transparent opacity={0.5} />
        </Torus>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────
// ECR — Electron Cyclotron Resonance
// Magnetic coils around plasma chamber
// ─────────────────────────────────────────────

function ECRGeometry() {
  return (
    <group>
      {/* Vacuum chamber */}
      <Cylinder args={[0.9, 0.9, 2.0, 32, 1, true]}>
        <meshStandardMaterial
          color="#667788" metalness={0.7}
          roughness={0.3}
          side={THREE.DoubleSide}
          transparent opacity={0.3} />
      </Cylinder>

      {/* Magnetic coils */}
      {[-0.7, 0, 0.7].map((y, i) => (
        <Torus key={i}
          args={[1.05, 0.12, 12, 32]}
          position={[0, y, 0]}
          rotation={[Math.PI/2, 0, 0]}>
          <meshStandardMaterial
            color="#cc4400" metalness={0.8}
            roughness={0.2}
            emissive="#441100"
            emissiveIntensity={0.5} />
        </Torus>
      ))}

      {/* Plasma */}
      <PlasmaGlow
        color="#00aaff"
        intensity={1.3}
        position={[0, 0, 0]}
        scale={[0.7, 1.6, 0.7]}
      />
    </group>
  );
}

// ─────────────────────────────────────────────
// DC GLOW — Classic DC glow discharge
// ─────────────────────────────────────────────

function DCGlowGeometry() {
  return (
    <group>
      {/* Glass tube */}
      <Cylinder args={[0.55, 0.55, 3.0, 32, 1, true]}>
        <meshStandardMaterial
          color="#aaccff" transparent
          opacity={0.15} side={THREE.DoubleSide} />
      </Cylinder>

      {/* Cathode */}
      <Cylinder args={[0.45, 0.45, 0.2, 16]}
        position={[0, -1.2, 0]}>
        <meshStandardMaterial
          color="#555" metalness={0.9}
          roughness={0.1} />
      </Cylinder>

      {/* Anode */}
      <Cylinder args={[0.45, 0.45, 0.2, 16]}
        position={[0, 1.2, 0]}>
        <meshStandardMaterial
          color="#555" metalness={0.9}
          roughness={0.1} />
      </Cylinder>

      {/* Glow region */}
      <PlasmaGlow
        color="#cc88ff"
        intensity={1.0}
        position={[0, 0.3, 0]}
        scale={[0.4, 1.2, 0.4]}
      />

      {/* Cathode dark space */}
      <Cylinder args={[0.4, 0.4, 0.4, 16]}
        position={[0, -0.9, 0]}>
        <meshStandardMaterial
          color="#110022"
          transparent opacity={0.8} />
      </Cylinder>
    </group>
  );
}

// ─────────────────────────────────────────────
// GENERIC — Fallback for unlisted sources
// ─────────────────────────────────────────────

function GenericGeometry() {
  return (
    <group>
      <Sphere args={[0.8, 24, 24]}>
        <meshStandardMaterial
          color="#334455" metalness={0.5}
          roughness={0.5} transparent
          opacity={0.4} />
      </Sphere>
      <PlasmaGlow
        color="#00f0ff"
        intensity={1.0}
        position={[0, 0, 0]}
        scale={[0.6, 0.6, 0.6]}
      />
    </group>
  );
}

// ─────────────────────────────────────────────
// HOLLOW CATHODE
// ─────────────────────────────────────────────

function HollowCathodeGeometry() {
  return (
    <group>
      {/* Outer cylinder */}
      <Cylinder args={[0.6, 0.6, 2.0, 24]}>
        <meshStandardMaterial
          color="#667788" metalness={0.8}
          roughness={0.2} />
      </Cylinder>

      {/* Inner hollow */}
      <Cylinder args={[0.35, 0.35, 1.9, 24]}>
        <meshStandardMaterial
          color="#111" />
      </Cylinder>

      {/* Plasma inside hollow */}
      <PlasmaGlow
        color="#ffaa44"
        intensity={1.5}
        position={[0, 0, 0]}
        scale={[0.3, 1.6, 0.3]}
      />

      {/* Anode plate */}
      <Cylinder args={[0.7, 0.7, 0.1, 24]}
        position={[0, 1.2, 0]}>
        <meshStandardMaterial
          color="#888" metalness={0.9}
          roughness={0.1} />
      </Cylinder>
    </group>
  );
}

// ─────────────────────────────────────────────
// LIBS — Laser-Induced Breakdown
// ─────────────────────────────────────────────

function LIBSGeometry() {
  const sparkRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!sparkRef.current) return;
    const t = state.clock.elapsedTime;
    const mat = sparkRef.current.material as THREE.MeshStandardMaterial;
    // Fast pulsing to simulate laser shots
    mat.emissiveIntensity =
      2 + 8 * Math.max(0, Math.sin(t * 6) ** 8);
    mat.opacity =
      0.3 + 0.7 * Math.max(0, Math.sin(t * 6) ** 8);
  });

  return (
    <group>
      {/* Target material */}
      <Box args={[2.0, 0.3, 1.2]}
        position={[0, -1.0, 0]}>
        <meshStandardMaterial
          color="#8B4513" roughness={0.9}
          metalness={0.1} />
      </Box>

      {/* Laser beam (from above) */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
        <meshStandardMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={3}
          transparent opacity={0.7} />
      </mesh>

      {/* LIBS plasma spark */}
      <mesh ref={sparkRef} position={[0, -0.85, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffeeaa"
          emissiveIntensity={2}
          transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────
// FLAME
// ─────────────────────────────────────────────

function FlameGeometry() {
  const flameRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!flameRef.current) return;
    const t = state.clock.elapsedTime;
    flameRef.current.scale.x =
      1 + 0.05 * Math.sin(t * 7);
    flameRef.current.scale.z =
      1 + 0.05 * Math.sin(t * 5.3 + 1);
  });

  return (
    <group>
      {/* Burner base */}
      <Cylinder args={[0.4, 0.5, 0.3, 16]}
        position={[0, -1.2, 0]}>
        <meshStandardMaterial
          color="#888" metalness={0.7}
          roughness={0.3} />
      </Cylinder>

      {/* Burner tube */}
      <Cylinder args={[0.15, 0.15, 0.8, 12]}
        position={[0, -0.7, 0]}>
        <meshStandardMaterial
          color="#999" metalness={0.8}
          roughness={0.2} />
      </Cylinder>

      {/* Flame body */}
      <mesh ref={flameRef} position={[0, 0.1, 0]}>
        <coneGeometry args={[0.35, 1.8, 12]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff3300"
          emissiveIntensity={2}
          transparent opacity={0.75} />
      </mesh>

      {/* Inner flame */}
      <mesh position={[0, 0.0, 0]}>
        <coneGeometry args={[0.18, 1.2, 12]} />
        <meshStandardMaterial
          color="#ffff00"
          emissive="#ffcc00"
          emissiveIntensity={3}
          transparent opacity={0.8} />
      </mesh>

      {/* Hot zone glow */}
      <PlasmaGlow
        color="#ff6600"
        intensity={0.8}
        position={[0, 0.2, 0]}
        scale={[0.5, 1.0, 0.5]}
      />
    </group>
  );
}

// ─────────────────────────────────────────────
// CCP — Capacitively Coupled Plasma
// Parallel plate reactor
// ─────────────────────────────────────────────

function CCPGeometry() {
  return (
    <group>
      {/* Powered electrode (top) */}
      <Cylinder args={[1.2, 1.2, 0.12, 32]}
        position={[0, 0.7, 0]}>
        <meshStandardMaterial
          color="#999" metalness={0.9}
          roughness={0.1} />
      </Cylinder>

      {/* Ground electrode (bottom) */}
      <Cylinder args={[1.4, 1.4, 0.12, 32]}
        position={[0, -0.7, 0]}>
        <meshStandardMaterial
          color="#777" metalness={0.9}
          roughness={0.1} />
      </Cylinder>

      {/* Plasma disc */}
      <Cylinder args={[1.1, 1.1, 0.3, 32]}
        position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#88ccff" transparent
          opacity={0.3}
          emissive="#4488ff"
          emissiveIntensity={1} />
      </Cylinder>

      <PlasmaGlow
        color="#4488ff"
        intensity={1.0}
        position={[0, 0, 0]}
        scale={[1.0, 0.25, 1.0]}
      />
    </group>
  );
}

// ─────────────────────────────────────────────
// MAIN EXPORT — select geometry by source ID
// ─────────────────────────────────────────────

export function PlasmaSourceGeometry({
  sourceId
}: {
  sourceId: PlasmaSourceId | null
}) {
  if (!sourceId) return <GenericGeometry />;

  switch (sourceId) {
    case 'dbd':           return <DBDGeometry />;
    case 'icp':           return <ICPGeometry />;
    case 'ccp':           return <CCPGeometry />;
    case 'arc':           return <ArcGeometry />;
    case 'appj':          return <APPJGeometry />;
    case 'ecr':           return <ECRGeometry />;
    case 'microwave':     return <MicrowaveGeometry />;
    case 'libs':          return <LIBSGeometry />;
    case 'hollow_cathode': return <HollowCathodeGeometry />;
    case 'flame':         return <FlameGeometry />;
    case 'dc_glow':       return <DCGlowGeometry />;
    default:              return <GenericGeometry />;
  }
}
