import React, { useMemo } from 'react';
import * as THREE from 'three';
import { MachineHapticsVector, Vector3Tuple } from '../core/types';
import { closestPointOnSegment } from '../core/geometry';
import { SYNTHETIC_VESSELS, AVOIDANCE_REGIONS } from '../core/brainData';

interface MachineHapticsOverlayProps {
  machineHaptics: MachineHapticsVector;
  entryPoint: Vector3Tuple;
  targetPoint: Vector3Tuple;
  visible: boolean;
}

export const MachineHapticsOverlay: React.FC<MachineHapticsOverlayProps> = ({
  machineHaptics,
  entryPoint,
  targetPoint,
  visible,
}) => {
  if (!visible) return null;

  const { nearestHazard, repulsionVector, hazardIntensity, criticalHazards } = machineHaptics;

  // Compute 3D arrow positions, orientations, and lengths
  const arrowData = useMemo(() => {
    const arrows: Array<{
      origin: THREE.Vector3;
      quaternion: THREE.Quaternion;
      length: number;
      color: string;
      emissive: string;
    }> = [];

    const yAxis = new THREE.Vector3(0, 1, 0);

    // 1. Primary Nearest Hazard
    const vId = nearestHazard.id;
    const vessel = SYNTHETIC_VESSELS.find((v) => v.id === vId);
    const avoidance = AVOIDANCE_REGIONS.find((a) => a.id === vId);

    let anchorPt: Vector3Tuple = entryPoint;

    if (vessel) {
      const vMid: Vector3Tuple = [
        (vessel.start[0] + vessel.end[0]) / 2,
        (vessel.start[1] + vessel.end[1]) / 2,
        (vessel.start[2] + vessel.end[2]) / 2,
      ];
      anchorPt = closestPointOnSegment(vMid, entryPoint, targetPoint);
    } else if (avoidance) {
      anchorPt = closestPointOnSegment(avoidance.center, entryPoint, targetPoint);
    }

    const mainOrigin = new THREE.Vector3(...anchorPt);
    const mainDir = new THREE.Vector3(...repulsionVector).normalize();
    const arrowLen = Math.max(3.5, hazardIntensity * 10.0);

    if (mainDir.lengthSq() > 0.1) {
      const quat = new THREE.Quaternion().setFromUnitVectors(yAxis, mainDir);
      const isDangerous = hazardIntensity > 0.6;
      arrows.push({
        origin: mainOrigin,
        quaternion: quat,
        length: arrowLen,
        color: isDangerous ? '#FF3B69' : '#00F0FF',
        emissive: isDangerous ? '#FF0033' : '#00D4B2',
      });
    }

    // 2. Secondary Critical Hazards
    for (const crit of criticalHazards.slice(1, 3)) {
      const vSec = SYNTHETIC_VESSELS.find((v) => v.id === crit.id);
      if (vSec) {
        const vMid: Vector3Tuple = [
          (vSec.start[0] + vSec.end[0]) / 2,
          (vSec.start[1] + vSec.end[1]) / 2,
          (vSec.start[2] + vSec.end[2]) / 2,
        ];
        const pt = closestPointOnSegment(vMid, entryPoint, targetPoint);
        const origin = new THREE.Vector3(...pt);
        const dir = new THREE.Vector3(...crit.repulsionVector).normalize();
        if (dir.lengthSq() > 0.1) {
          const quat = new THREE.Quaternion().setFromUnitVectors(yAxis, dir);
          arrows.push({
            origin,
            quaternion: quat,
            length: Math.max(2.5, crit.intensity * 8.0),
            color: '#8B5CF6',
            emissive: '#7C3AED',
          });
        }
      }
    }

    return arrows;
  }, [nearestHazard, repulsionVector, hazardIntensity, criticalHazards, entryPoint, targetPoint]);

  return (
    <group name="MachineHapticsOverlay">
      {arrowData.map((arrow, idx) => {
        const shaftLen = arrow.length * 0.7;
        const headLen = arrow.length * 0.3;
        return (
          <group key={idx} position={arrow.origin} quaternion={arrow.quaternion}>
            {/* Shaft */}
            <mesh position={[0, shaftLen / 2, 0]}>
              <cylinderGeometry args={[0.2, 0.2, shaftLen, 16]} />
              <meshStandardMaterial
                color={arrow.color}
                emissive={arrow.emissive}
                emissiveIntensity={0.8}
                roughness={0.2}
              />
            </mesh>
            {/* Cone Head */}
            <mesh position={[0, shaftLen + headLen / 2, 0]}>
              <coneGeometry args={[0.65, headLen, 16]} />
              <meshStandardMaterial
                color={arrow.color}
                emissive={arrow.emissive}
                emissiveIntensity={1.0}
                roughness={0.15}
              />
            </mesh>
            {/* Anchor Ring */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.3, 0.6, 16]} />
              <meshBasicMaterial color={arrow.color} side={THREE.DoubleSide} transparent opacity={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
