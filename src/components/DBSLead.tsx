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
  const { orientation, position, shaftLength, contactOffsets, laserLine } = useMemo(() => {
    const pTarget = new THREE.Vector3(...targetPoint);
    const pEntry = new THREE.Vector3(...entryPoint);

    const dir = new THREE.Vector3().subVectors(pEntry, pTarget);
    const len = dir.length();
    dir.normalize();

    // Cylinder geometry aligned with Y axis (0, 1, 0)
    const yAxis = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(yAxis, dir);

    // Center position of the shaft
    const midPoint = new THREE.Vector3()
      .addVectors(pTarget, pEntry)
      .multiplyScalar(0.5);

    // 4 Electrode Contact Centers (2mm spacing)
    const offsets = [0, 1, 2, 3].map((idx) => {
      const distFromTarget = idx * 2.0;
      return pTarget.clone().add(dir.clone().multiplyScalar(distFromTarget));
    });

    // Trajectory laser line
    const lGeo = new THREE.BufferGeometry().setFromPoints([pEntry, pTarget]);
    const lMat = new THREE.LineBasicMaterial({ color: 0x00F0FF, transparent: true, opacity: 0.4 });
    const lLine = new THREE.Line(lGeo, lMat);

    return {
      orientation: quat,
      position: midPoint,
      shaftLength: len,
      contactOffsets: offsets,
      laserLine: lLine,
    };
  }, [entryPoint, targetPoint]);

  return (
    <group name="DBSLead">
      {/* Laser Trajectory Guide */}
      <primitive object={laserLine} />

      {/* Insulated Main Lead Shaft (Polyurethane/Tefzel Coating) */}
      <mesh position={position} quaternion={orientation}>
        <cylinderGeometry args={[0.65, 0.65, shaftLength, 24]} />
        <meshStandardMaterial
          color="#384968"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* 4 Platinum-Iridium Electrode Contact Rings */}
      {contactOffsets.map((contactPos, idx) => {
        const isActive = activeContacts.includes(idx);
        return (
          <mesh key={idx} position={contactPos} quaternion={orientation}>
            <cylinderGeometry args={[0.72, 0.72, 1.5, 24]} />
            <meshStandardMaterial
              color={isActive ? '#FBBF24' : '#E2E8F0'}
              emissive={isActive ? '#F59E0B' : '#475569'}
              emissiveIntensity={isActive ? 1.2 : 0.15}
              metalness={0.9}
              roughness={0.15}
            />
          </mesh>
        );
      })}

      {/* Cortical Burr Hole Collar Ring */}
      <group position={entryPoint}>
        <mesh>
          <ringGeometry args={[1.2, 2.4, 32]} />
          <meshBasicMaterial color="#00F0FF" side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.2]}>
          <ringGeometry args={[2.5, 2.7, 32]} />
          <meshBasicMaterial color="#00F0FF" side={THREE.DoubleSide} transparent opacity={0.4} />
        </mesh>
      </group>
    </group>
  );
};
