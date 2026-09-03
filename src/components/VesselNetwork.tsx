import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SYNTHETIC_VESSELS } from '../core/brainData';

interface VesselNetworkProps {
  nearestHazardId?: string;
}

export const VesselNetwork: React.FC<VesselNetworkProps> = ({ nearestHazardId }) => {
  // Memoize tube geometries for the 14 synthetic vascular segments
  const vesselGeometries = useMemo(() => {
    return SYNTHETIC_VESSELS.map((vessel) => {
      const p1 = new THREE.Vector3(...vessel.start);
      const p2 = new THREE.Vector3(...vessel.end);

      // Create organic curvature
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const normal = new THREE.Vector3(p2.y - p1.y, p1.x - p2.x, 0).normalize().multiplyScalar(1.5);
      mid.add(normal);

      const curve = new THREE.CatmullRomCurve3([p1, mid, p2]);
      // Thin, low-poly vascular path (reduced by ~60%)
      const visualRadius = Math.max(0.3, vessel.radiusMm * 0.4);
      const geometry = new THREE.TubeGeometry(curve, 12, visualRadius, 5, false);

      return {
        id: vessel.id,
        displayName: vessel.displayName,
        geometry,
        radiusMm: visualRadius,
      };
    });
  }, []);

  return (
    <group name="VesselNetwork">
      {vesselGeometries.map((v) => {
        const isNearest = v.id === nearestHazardId;
        return (
          <mesh key={v.id} geometry={v.geometry}>
            <meshStandardMaterial
              color={isNearest ? '#FF1744' : '#E11D48'}
              emissive={isNearest ? '#FF0055' : '#880020'}
              emissiveIntensity={isNearest ? 0.85 : 0.25}
              roughness={0.25}
              metalness={0.35}
              transparent={true}
              opacity={0.95}
            />
          </mesh>
        );
      })}
    </group>
  );
};
