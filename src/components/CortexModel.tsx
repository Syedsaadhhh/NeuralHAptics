import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Stylized procedural translucent cerebral hemispheres with subtle sulcal curves.
 * Highly performant, 100% procedural (no external copyrighted assets).
 */
export const CortexModel: React.FC = () => {
  // Procedural sulcal curves
  const sulcalLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    const seedPoints = [
      // Central sulcus approximation
      [
        [15, 5, 45],
        [28, 0, 52],
        [42, -5, 48],
        [50, -12, 35],
      ],
      // Sylvian fissure approximation
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

    for (const pts of seedPoints) {
      const v3s = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      const curve = new THREE.CatmullRomCurve3(v3s);
      lines.push(curve.getPoints(24));
    }

    return lines;
  }, []);

  return (
    <group name="CortexModel">
      {/* Right Hemisphere Translucent Shell */}
      <mesh position={[24, 0, 25]} scale={[1.05, 1.25, 1.1]}>
        <sphereGeometry args={[38, 32, 32]} />
        <meshStandardMaterial
          color="#161B26"
          roughness={0.8}
          metalness={0.1}
          transparent={true}
          opacity={0.12}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Left Hemisphere Translucent Shell */}
      <mesh position={[-24, 0, 25]} scale={[1.05, 1.25, 1.1]}>
        <sphereGeometry args={[38, 32, 32]} />
        <meshStandardMaterial
          color="#161B26"
          roughness={0.8}
          metalness={0.1}
          transparent={true}
          opacity={0.06}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Procedural Sulcal Indentation Curves */}
      {sulcalLines.map((pts, i) => {
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.25 });
        const lineObj = new THREE.Line(lineGeo, lineMat);
        return <primitive key={i} object={lineObj} />;
      })}

      {/* Subtle Sagittal Midplane Reference */}
      <gridHelper
        args={[100, 20, 0x242c3d, 0x161b26]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      />
    </group>
  );
};
