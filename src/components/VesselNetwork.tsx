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

      // Create a slight natural curvature between start and end
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      // Small lateral deviation for organic vessel appearance
      const normal = new THREE.Vector3(p2.y - p1.y, p1.x - p2.x, 0).normalize().multiplyScalar(1.5);
      mid.add(normal);

      const curve = new THREE.CatmullRomCurve3([p1, mid, p2]);
      const geometry = new THREE.TubeGeometry(curve, 16, vessel.radiusMm, 8, false);

      return {
        id: vessel.id,
        displayName: vessel.displayName,
        geometry,
        radiusMm: vessel.radiusMm,
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
              color={isNearest ? '#FF2A55' : '#D32F2F'}
              emissive={isNearest ? '#FF1744' : '#500010'}
              emissiveIntensity={isNearest ? 0.6 : 0.2}
              roughness={0.4}
              metalness={0.2}
              transparent={true}
              opacity={0.92}
            />
          </mesh>
        );
      })}
    </group>
  );
};
