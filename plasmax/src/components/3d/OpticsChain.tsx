import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { 
  Cylinder, 
  Box, 
  RoundedBox,
  Text
} from '@react-three/drei';
import * as THREE from 'three';

// ─────────────────────────────────────────────
// COLLECTION LENS
// Glass disc with antireflection coating look
// ─────────────────────────────────────────────

export function CollectionLens({
  position = [0, 0, 0] as [number,number,number],
  isUV = false
}: {
  position?: [number,number,number];
  isUV?: boolean;
}) {
  const lensColor   = isUV ? '#e8f4ff' : '#c8e8ff';
  const coatingColor = isUV ? '#aaccff' : '#88bbff';

  return (
    <group position={position}>
      {/* Main lens body */}
      <Cylinder
        args={[0.28, 0.28, 0.08, 32]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <meshStandardMaterial
          color={lensColor}
          transparent
          opacity={0.55}
          roughness={0.0}
          metalness={0.0}
          envMapIntensity={1.5}
        />
      </Cylinder>

      {/* Antireflection coating rings */}
      {[0.10, 0.17, 0.23].map((r, i) => (
        <Cylinder
          key={i}
          args={[r, r, 0.085, 32, 1, true]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <meshStandardMaterial
            color={coatingColor}
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
          />
        </Cylinder>
      ))}

      {/* Lens barrel (metal ring) */}
      <Cylinder
        args={[0.30, 0.30, 0.10, 32, 1, true]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <meshStandardMaterial
          color="#778899"
          metalness={0.8}
          roughness={0.2}
          side={THREE.DoubleSide}
        />
      </Cylinder>

      {/* UV label */}
      {isUV && (
        <Text
          position={[0, 0.38, 0]}
          fontSize={0.08}
          color="#aaccff"
          anchorX="center"
          anchorY="middle"
        >
          UV-grade
        </Text>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────
// OPTICAL FIBER
// Curved tube from lens to spectrometer
// ─────────────────────────────────────────────

export function OpticalFiber({
  from = [0, 0, 0] as [number,number,number],
  to   = [4, 0, 0] as [number,number,number],
  color = '#ffcc44',
  isUV = false
}: {
  from?: [number,number,number];
  to?:   [number,number,number];
  color?: string;
  isUV?: boolean;
}) {
  const fiberColor = isUV ? '#aaddff' : color;

  // Build a curved path using CatmullRomCurve3
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end   = new THREE.Vector3(...to);

    // Control points for a natural-looking curve
    const mid1 = new THREE.Vector3(
      start.x + (end.x - start.x) * 0.3,
      start.y + 0.8,
      start.z + 0.3
    );
    const mid2 = new THREE.Vector3(
      start.x + (end.x - start.x) * 0.7,
      end.y + 0.8,
      end.z - 0.3
    );

    return new THREE.CatmullRomCurve3([
      start, mid1, mid2, end
    ]);
  }, [from, to]);

  const tubeGeom = useMemo(() =>
    new THREE.TubeGeometry(curve, 60, 0.04, 8, false),
    [curve]
  );

  const jackGeom = useMemo(() =>
    new THREE.TubeGeometry(curve, 60, 0.055, 8, false),
    [curve]
  );

  useEffect(() => {
    return () => {
      tubeGeom.dispose();
      jackGeom.dispose();
    };
  }, [tubeGeom, jackGeom]);

  // Animated light pulse traveling along fiber
  const pulseRef = useRef<THREE.Mesh>(null);
  const pulseT   = useRef(0);

  useFrame((_, delta) => {
    if (!pulseRef.current) return;
    pulseT.current = (pulseT.current + delta * 0.4) % 1;
    const pt = curve.getPoint(pulseT.current);
    pulseRef.current.position.copy(pt);
  });

  return (
    <group>
      {/* Outer jacket */}
      <mesh geometry={jackGeom}>
        <meshStandardMaterial
          color={isUV ? '#334466' : '#333322'}
          roughness={0.8}
          metalness={0.0}
        />
      </mesh>

      {/* Inner fiber core */}
      <mesh geometry={tubeGeom}>
        <meshStandardMaterial
          color={fiberColor}
          emissive={fiberColor}
          emissiveIntensity={0.4}
          transparent
          opacity={0.85}
          roughness={0.1}
        />
      </mesh>

      {/* Light pulse */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={fiberColor}
          emissiveIntensity={3}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────
// SPECTROMETER BOX
// Realistic spectrometer with grating inside
// ─────────────────────────────────────────────

export function SpectrometerBox({
  position = [0, 0, 0] as [number,number,number],
  modelName = 'Spectrometer',
  focalLength = 320
}: {
  position?:    [number,number,number];
  modelName?:   string;
  focalLength?: number;
}) {
  const gratRef = useRef<THREE.Mesh>(null);

  // Grating shimmer animation
  useFrame((state) => {
    if (!gratRef.current) return;
    const t = state.clock.elapsedTime;
    const mat = gratRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity =
      0.1 + 0.15 * Math.sin(t * 1.5);
  });

  // Scale body with focal length
  const bodyLength = Math.max(1.6,
    focalLength / 200
  );

  return (
    <group position={position}>

      {/* Main body */}
      <RoundedBox
        args={[bodyLength, 0.7, 0.9]}
        radius={0.04}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color="#222833"
          metalness={0.6}
          roughness={0.4}
        />
      </RoundedBox>

      {/* Front panel */}
      <Box args={[0.06, 0.68, 0.88]}
        position={[-bodyLength / 2 + 0.03, 0, 0]}
      >
        <meshStandardMaterial
          color="#1a2030"
          metalness={0.5}
          roughness={0.5}
        />
      </Box>

      {/* Entry slit */}
      <Box args={[0.08, 0.3, 0.015]}
        position={[-bodyLength / 2, 0, 0.1]}
      >
        <meshStandardMaterial
          color="#000010"
          metalness={0.9}
        />
      </Box>

      {/* Slit aperture glow */}
      <Box args={[0.04, 0.18, 0.01]}
        position={[-bodyLength / 2, 0, 0.1]}
      >
        <meshStandardMaterial
          color="#ffeecc"
          emissive="#ffeecc"
          emissiveIntensity={1.5}
          transparent
          opacity={0.8}
        />
      </Box>

      {/* Diffraction grating (visible through top) */}
      <mesh
        ref={gratRef}
        position={[bodyLength * 0.1, 0.25, 0]}
        rotation={[0, 0, Math.PI * 0.15]}
      >
        <boxGeometry args={[0.5, 0.04, 0.6]} />
        <meshStandardMaterial
          color="#334466"
          emissive="#2244aa"
          emissiveIntensity={0.1}
          metalness={1.0}
          roughness={0.0}
        />
      </mesh>

      {/* Rainbow dispersion from grating */}
      {[
        '#ff4444', '#ff8844', '#ffff44',
        '#44ff44', '#44aaff', '#8844ff'
      ].map((col, i) => (
        <mesh
          key={i}
          position={[
            bodyLength * 0.15 + i * 0.06,
            0.22,
            (i - 2.5) * 0.08
          ]}
          rotation={[0, 0, Math.PI * 0.15]}
        >
          <boxGeometry args={[0.3, 0.015, 0.04]} />
          <meshStandardMaterial
            color={col}
            emissive={col}
            emissiveIntensity={1.2}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}

      {/* CCD detector */}
      <Box args={[0.35, 0.08, 0.55]}
        position={[bodyLength * 0.3, -0.22, 0]}
        rotation={[0, 0, -0.1]}
      >
        <meshStandardMaterial
          color="#112233"
          metalness={0.8}
          roughness={0.2}
          emissive="#001133"
          emissiveIntensity={0.5}
        />
      </Box>

      {/* CCD pixel array indicator */}
      <Box args={[0.28, 0.03, 0.48]}
        position={[bodyLength * 0.3, -0.18, 0]}
      >
        <meshStandardMaterial
          color="#001155"
          emissive="#0033aa"
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </Box>

      {/* Model name label */}
      <Text
        position={[0, -0.42, 0.46]}
        fontSize={0.09}
        color="#8899aa"
        anchorX="center"
        anchorY="middle"
      >
        {modelName}
      </Text>

      {/* Focal length indicator */}
      <Text
        position={[0, -0.42, -0.46]}
        fontSize={0.07}
        color="#556677"
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI, 0]}
      >
        f = {focalLength}mm
      </Text>

      {/* Cable connectors */}
      {[-0.2, 0.2].map((z, i) => (
        <Cylinder
          key={i}
          args={[0.04, 0.04, 0.15, 8]}
          position={[bodyLength / 2, -0.2, z]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <meshStandardMaterial
            color="#445566"
            metalness={0.7}
            roughness={0.3}
          />
        </Cylinder>
      ))}

    </group>
  );
}

// ─────────────────────────────────────────────
// FIBER CONNECTOR — SMA connector at both ends
// ─────────────────────────────────────────────

export function FiberConnector({
  position = [0, 0, 0] as [number,number,number],
  rotation = [0, 0, 0] as [number,number,number]
}: {
  position?: [number,number,number];
  rotation?: [number,number,number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <Cylinder args={[0.06, 0.06, 0.15, 12]}>
        <meshStandardMaterial
          color="#aabbcc"
          metalness={0.9}
          roughness={0.1}
        />
      </Cylinder>
      <Cylinder
        args={[0.045, 0.045, 0.06, 12]}
        position={[0, 0.1, 0]}
      >
        <meshStandardMaterial
          color="#ffcc44"
          emissive="#ffaa00"
          emissiveIntensity={0.5}
        />
      </Cylinder>
    </group>
  );
}

// ─────────────────────────────────────────────
// LABEL CARD — floating info label in 3D space
// ─────────────────────────────────────────────

export function Label3D({
  position = [0, 0, 0] as [number,number,number],
  title,
  subtitle,
  color = '#00f0ff'
}: {
  position?: [number,number,number];
  title:     string;
  subtitle?: string;
  color?:    string;
}) {
  return (
    <group position={position}>
      <Text
        fontSize={0.12}
        color={color}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.005}
        outlineColor="#000000"
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          position={[0, -0.16, 0]}
          fontSize={0.08}
          color="#888888"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.004}
          outlineColor="#000000"
        >
          {subtitle}
        </Text>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────
// COMPLETE OPTICS CHAIN
// Lens + fiber + spectrometer assembled
// ─────────────────────────────────────────────

export function OpticsChain({
  lensPosition    = [1.8, 0, 0] as [number,number,number],
  spectPosition   = [5.5, 0, 0] as [number,number,number],
  isUV            = false,
  spectrometerName = 'Spectrometer',
  focalLength     = 320,
  showLabels      = true
}: {
  lensPosition?:     [number,number,number];
  spectPosition?:    [number,number,number];
  isUV?:             boolean;
  spectrometerName?: string;
  focalLength?:      number;
  showLabels?:       boolean;
}) {
  // Fiber start: just after lens
  const fiberFrom: [number,number,number] = [
    lensPosition[0] + 0.35,
    lensPosition[1],
    lensPosition[2]
  ];

  // Fiber end: at spectrometer entry slit
  const fiberTo: [number,number,number] = [
    spectPosition[0] - 0.9,
    spectPosition[1],
    spectPosition[2]
  ];

  return (
    <group>

      {/* Collection lens */}
      <CollectionLens
        position={lensPosition}
        isUV={isUV}
      />
      {showLabels && (
        <Label3D
          position={[
            lensPosition[0],
            lensPosition[1] + 0.55,
            lensPosition[2]
          ]}
          title="Collection Lens"
          subtitle={isUV
            ? 'UV fused silica f/4'
            : 'BK7 glass f/4'}
          color={isUV ? '#aaddff' : '#00f0ff'}
        />
      )}

      {/* Fiber connectors */}
      <FiberConnector
        position={fiberFrom}
        rotation={[0, 0, Math.PI / 2]}
      />
      <FiberConnector
        position={fiberTo}
        rotation={[0, 0, Math.PI / 2]}
      />

      {/* Optical fiber */}
      <OpticalFiber
        from={fiberFrom}
        to={fiberTo}
        isUV={isUV}
      />
      {showLabels && (
        <Label3D
          position={[
            (fiberFrom[0] + fiberTo[0]) / 2,
            (fiberFrom[1] + fiberTo[1]) / 2 + 1.3,
            (fiberFrom[2] + fiberTo[2]) / 2
          ]}
          title="Optical Fiber"
          subtitle={isUV
            ? '200μm UV-VIS, NA=0.22'
            : '400μm VIS-NIR, NA=0.22'}
          color="#ffcc44"
        />
      )}

      {/* Spectrometer */}
      <SpectrometerBox
        position={spectPosition}
        modelName={spectrometerName}
        focalLength={focalLength}
      />
      {showLabels && (
        <Label3D
          position={[
            spectPosition[0],
            spectPosition[1] + 0.65,
            spectPosition[2]
          ]}
          title={spectrometerName}
          subtitle={`f=${focalLength}mm`}
          color="#ff6b35"
        />
      )}

    </group>
  );
}
