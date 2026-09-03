import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * High-performance procedural translucent cerebral hemispheres with sulcal curves.
 * 100% zero-allocation during render frames for 60+ FPS stability.
 */
export const CortexModel: React.FC = () => {
  // Pre-compute and memoize sulcal curve geometries once
  const { sulcalLines } = useMemo(() => {
    const seedPoints = [
      // Central sulcus
      [
        [15, 5, 45],
        [28, 0, 52],
        [42, -5, 48],
        [50, -12, 35],
      ],
      // Sylvian fissure
      [
        [18, 15, 10],
        [32, 10, 15],
        [46, -2, 20],
        [54, -18, 18],
      ],
      // Superior frontal sulcus
      [
        [12, 28, 40],
        [18, 20, 55],
        [24, 8, 62],
      ],
      // Precentral sulcus
      [
        [16, 12, 48],
        [28, 8, 56],
        [40, 2, 50],
      ],
      // Postcentral sulcus
      [
        [18, -4, 46],
        [30, -8, 54],
        [44, -14, 46],
      ],
      // Parieto-occipital sulcus
      [
        [14, -35, 32],
        [25, -38, 38],
        [36, -35, 28],
      ],
    ];

    const mat = new THREE.LineBasicMaterial({
      color: 0x00F0FF,
      transparent: true,
      opacity: 0.3,
      linewidth: 1,
    });

    const lines = seedPoints.map((pts) => {
      const v3s = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      const curve = new THREE.CatmullRomCurve3(v3s);
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(32));
      return new THREE.Line(geo, mat);
    });

    return { sulcalLines: lines };
  }, []);

  return (
    <group name="CortexModel">
      {/* Right Hemisphere Translucent Anatomical Shell */}
      <mesh position={[24, 0, 25]} scale={[1.05, 1.25, 1.1]}>
        <sphereGeometry args={[38, 24, 24]} />
        <meshStandardMaterial
          color="#121A2D"
          emissive="#00F0FF"
          emissiveIntensity={0.03}
          roughness={0.65}
          metalness={0.2}
          transparent={true}
          opacity={0.12}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Left Hemisphere Translucent Anatomical Shell */}
      <mesh position={[-24, 0, 25]} scale={[1.05, 1.25, 1.1]}>
        <sphereGeometry args={[38, 24, 24]} />
        <meshStandardMaterial
          color="#121A2D"
          emissive="#8B5CF6"
          emissiveIntensity={0.02}
          roughness={0.65}
          metalness={0.2}
          transparent={true}
          opacity={0.06}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Procedural Sulcal Indentation Curves */}
      {sulcalLines.map((lineObj, i) => (
        <primitive key={i} object={lineObj} />
      ))}

      {/* Subtle Sagittal Reference Plane */}
      <gridHelper
        args={[110, 22, 0x2A3A5B, 0x141B2D]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      />
    </group>
  );
};
