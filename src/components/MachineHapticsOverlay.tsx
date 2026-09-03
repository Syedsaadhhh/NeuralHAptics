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

  // Compute 3D arrow anchors on the trajectory closest to the nearest hazard
  const arrowData = useMemo(() => {
    const arrows: Array<{ origin: THREE.Vector3; direction: THREE.Vector3; length: number; color: string }> = [];

    // Find nearest hazard geometric position
    const vId = nearestHazard.id;
    const vessel = SYNTHETIC_VESSELS.find((v) => v.id === vId);
    const avoidance = AVOIDANCE_REGIONS.find((a) => a.id === vId);

    let anchorPt: Vector3Tuple = entryPoint;

    if (vessel) {
      // Find closest point on trajectory to vessel start/end
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
    const arrowLen = Math.max(2.5, hazardIntensity * 8.0);

    if (mainDir.lengthSq() > 0.1) {
      arrows.push({
        origin: mainOrigin,
        direction: mainDir,
        length: arrowLen,
        color: hazardIntensity > 0.6 ? '#FF466C' : '#00E5FF',
      });
    }

    // Additional secondary hazard arrows if multiple critical hazards exist
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
          arrows.push({
            origin,
            direction: dir,
            length: Math.max(2.0, crit.intensity * 6.0),
            color: '#7C4DFF',
          });
        }
      }
    }

    return arrows;
  }, [nearestHazard, repulsionVector, hazardIntensity, criticalHazards, entryPoint, targetPoint]);

  return (
    <group name="MachineHapticsOverlay">
      {arrowData.map((arrow, idx) => (
        <group key={idx}>
          {/* 3D Arrow Helper */}
          <primitive
            object={
              new THREE.ArrowHelper(
                arrow.direction,
                arrow.origin,
                arrow.length,
                new THREE.Color(arrow.color),
                1.4,
                0.8
              )
            }
          />
          {/* Subtle glowing anchor sphere */}
          <mesh position={[arrow.origin.x, arrow.origin.y, arrow.origin.z]}>
            <sphereGeometry args={[0.5, 12, 12]} />
            <meshBasicMaterial color={arrow.color} transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
