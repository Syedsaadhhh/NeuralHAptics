import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Vector3Tuple } from '../core/types';

interface DBSLeadProps {
  entryPoint: Vector3Tuple;
  targetPoint: Vector3Tuple;
  activeContacts: number[];
}

export const DBSLead: React.FC<DBSLeadProps> = ({
  entryPoint,
  targetPoint,
  activeContacts,
}) => {
  const { orientation, position, shaftLength, contactOffsets } = useMemo(() => {
    const pTarget = new THREE.Vector3(...targetPoint);
    const pEntry = new THREE.Vector3(...entryPoint);

    const dir = new THREE.Vector3().subVectors(pEntry, pTarget);
    const len = dir.length();
    dir.normalize();

    // Default cylinder geometry is aligned with Y axis (0, 1, 0)
    const yAxis = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(yAxis, dir);

    // Center position of the shaft
    const midPoint = new THREE.Vector3()
      .addVectors(pTarget, pEntry)
      .multiplyScalar(0.5);

    // Contact center offsets along trajectory from target
    const offsets = [0, 1, 2, 3].map((idx) => {
      const distFromTarget = idx * 2.0;
      return pTarget.clone().add(dir.clone().multiplyScalar(distFromTarget));
    });

    return {
      orientation: quat,
      position: midPoint,
      shaftLength: len,
      contactOffsets: offsets,
    };
  }, [entryPoint, targetPoint]);

  return (
    <group name="DBSLead">
      {/* Insulated Main Lead Shaft */}
      <mesh position={position} quaternion={orientation}>
        <cylinderGeometry args={[0.62, 0.62, shaftLength, 16]} />
        <meshStandardMaterial
          color="#334155"
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>

      {/* 4 Platinum-Iridium Electrode Contact Rings */}
      {contactOffsets.map((contactPos, idx) => {
        const isActive = activeContacts.includes(idx);
        return (
          <mesh key={idx} position={contactPos} quaternion={orientation}>
            <cylinderGeometry args={[0.65, 0.65, 1.4, 20]} />
            <meshStandardMaterial
              color={isActive ? '#FFB300' : '#CBD5E1'}
              emissive={isActive ? '#FF8F00' : '#1E293B'}
              emissiveIntensity={isActive ? 0.9 : 0.1}
              metalness={0.85}
              roughness={0.2}
            />
          </mesh>
        );
      })}

      {/* Cortical Entry Ring Marker */}
      <mesh position={entryPoint}>
        <ringGeometry args={[1.2, 2.2, 24]} />
        <meshBasicMaterial color="#00E5FF" side={THREE.DoubleSide} transparent opacity={0.7} />
      </mesh>
    </group>
  );
};
