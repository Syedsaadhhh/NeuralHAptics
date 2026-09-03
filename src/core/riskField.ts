import {
  Vector3Tuple,
  MachineHapticsVector,
  CriticalHazardItem,
  VesselSegment,
  AvoidanceRegion,
  TargetStructure,
} from './types';
import {
  distanceSegmentToSegment,
  closestPointOnSegment,
  distance,
  normalize,
  sub,
  clamp,
} from './geometry';
import { SYNTHETIC_VESSELS, AVOIDANCE_REGIONS, TARGET_STRUCTURES } from './brainData';

export interface SceneHazards {
  vessels?: VesselSegment[];
  avoidanceRegions?: AvoidanceRegion[];
  targets?: Record<string, TargetStructure>;
}

export interface MachineHapticsEvaluation {
  machineHaptics: MachineHapticsVector;
  minVesselClearanceMm: number;
  minAvoidanceClearanceMm: number;
  nearestVesselId: string;
  hasIntersections: boolean;
}

const WARNING_THRESHOLD_VESSEL_MM = 4.0;
const WARNING_THRESHOLD_AVOIDANCE_MM = 5.0;

/**
 * Machine Haptics Engine:
 * Transforms 3D geometric constraints into structured machine-actionable
 * risk vectors, hazard intensities, and constraint tensions.
 */
export function evaluateMachineHaptics(
  entryPoint: Vector3Tuple,
  targetPoint: Vector3Tuple,
  scene?: SceneHazards,
  targetId: string = 'tremor_center'
): MachineHapticsEvaluation {
  const vessels = scene?.vessels ?? SYNTHETIC_VESSELS;
  const avoidanceRegions = scene?.avoidanceRegions ?? AVOIDANCE_REGIONS;
  const targets = scene?.targets ?? TARGET_STRUCTURES;

  let minVesselClearance = Infinity;
  let nearestVesselId = '';
  let nearestVesselName = '';

  let minAvoidanceClearance = Infinity;
  let nearestAvoidanceId = '';
  let nearestAvoidanceName = '';

  const criticalHazards: CriticalHazardItem[] = [];
  let weightedRepulsionSum: Vector3Tuple = [0, 0, 0];
  let accumulatedRisk = 0;
  let hasIntersections = false;

  // 1. Evaluate all vascular hazards
  for (const vessel of vessels) {
    const segRes = distanceSegmentToSegment(
      entryPoint,
      targetPoint,
      vessel.start,
      vessel.end
    );

    const clearance = Math.max(0, segRes.distance - vessel.radiusMm);
    if (segRes.distance <= vessel.radiusMm) {
      hasIntersections = true;
    }

    if (clearance < minVesselClearance) {
      minVesselClearance = clearance;
      nearestVesselId = vessel.id;
      nearestVesselName = vessel.displayName;
    }

    // Determine direction pointing from vessel toward trajectory
    let repulsionDir = sub(segRes.pointOnSegment1, segRes.pointOnSegment2);
    if (distance([0, 0, 0], repulsionDir) < 1e-6) {
      // Degenerate/touching: use perpendicular to trajectory
      const trajDir = normalize(sub(targetPoint, entryPoint));
      repulsionDir = Math.abs(trajDir[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    }
    const normRepulsion = normalize(repulsionDir);

    // Hazard intensity: grows smoothly as clearance drops below warning threshold
    if (clearance < WARNING_THRESHOLD_VESSEL_MM) {
      const intensity =
        (1.0 - clearance / WARNING_THRESHOLD_VESSEL_MM) * vessel.severityWeight;
      accumulatedRisk += intensity;

      weightedRepulsionSum = [
        weightedRepulsionSum[0] + normRepulsion[0] * intensity,
        weightedRepulsionSum[1] + normRepulsion[1] * intensity,
        weightedRepulsionSum[2] + normRepulsion[2] * intensity,
      ];

      criticalHazards.push({
        id: vessel.id,
        displayName: vessel.displayName,
        clearanceMm: Number(clearance.toFixed(2)),
        repulsionVector: [
          Number(normRepulsion[0].toFixed(3)),
          Number(normRepulsion[1].toFixed(3)),
          Number(normRepulsion[2].toFixed(3)),
        ],
        intensity: Number(intensity.toFixed(3)),
      });
    }
  }

  // 2. Evaluate avoidance regions (e.g. internal capsule)
  for (const region of avoidanceRegions) {
    const closestTrajPt = closestPointOnSegment(
      region.center,
      entryPoint,
      targetPoint
    );
    const distToCenter = distance(closestTrajPt, region.center);
    const clearance = distToCenter - region.radius;

    if (clearance <= 0) {
      hasIntersections = true;
    }

    if (clearance < minAvoidanceClearance) {
      minAvoidanceClearance = clearance;
      nearestAvoidanceId = region.id;
      nearestAvoidanceName = region.displayName;
    }

    let repulsionDir = sub(closestTrajPt, region.center);
    if (distToCenter < 1e-6) {
      repulsionDir = [0, 0, 1];
    }
    const normRepulsion = normalize(repulsionDir);

    if (clearance < WARNING_THRESHOLD_AVOIDANCE_MM) {
      const effectiveClearance = Math.max(0, clearance);
      const intensity = 1.0 - effectiveClearance / WARNING_THRESHOLD_AVOIDANCE_MM;
      accumulatedRisk += intensity * 1.5; // High weight for functional avoidance

      weightedRepulsionSum = [
        weightedRepulsionSum[0] + normRepulsion[0] * intensity * 1.5,
        weightedRepulsionSum[1] + normRepulsion[1] * intensity * 1.5,
        weightedRepulsionSum[2] + normRepulsion[2] * intensity * 1.5,
      ];

      criticalHazards.push({
        id: region.id,
        displayName: region.displayName,
        clearanceMm: Number(clearance.toFixed(2)),
        repulsionVector: [
          Number(normRepulsion[0].toFixed(3)),
          Number(normRepulsion[1].toFixed(3)),
          Number(normRepulsion[2].toFixed(3)),
        ],
        intensity: Number(intensity.toFixed(3)),
      });
    }
  }

  // Determine overall nearest hazard
  const isVesselCloser = minVesselClearance <= minAvoidanceClearance;
  const nearestId = isVesselCloser ? nearestVesselId : nearestAvoidanceId;
  const nearestName = isVesselCloser ? nearestVesselName : nearestAvoidanceName;
  const nearestClearance = isVesselCloser ? minVesselClearance : minAvoidanceClearance;

  // Repulsion vector normalization
  const repulsionLen = distance([0, 0, 0], weightedRepulsionSum);
  const finalRepulsionVector: Vector3Tuple =
    repulsionLen > 1e-6
      ? [
          Number((weightedRepulsionSum[0] / repulsionLen).toFixed(3)),
          Number((weightedRepulsionSum[1] / repulsionLen).toFixed(3)),
          Number((weightedRepulsionSum[2] / repulsionLen).toFixed(3)),
        ]
      : [0, 0, 0];

  // Target attraction vector
  const targetObj = targets[targetId] ?? TARGET_STRUCTURES['tremor_center'];
  const targetDir = normalize(sub(targetObj.center, entryPoint));
  const targetAttractionVector: Vector3Tuple = [
    Number(targetDir[0].toFixed(3)),
    Number(targetDir[1].toFixed(3)),
    Number(targetDir[2].toFixed(3)),
  ];

  // Constraint tension: normalized 0-1 indicator of how constricted the trajectory is
  let constraintTension: number;
  if (hasIntersections) {
    constraintTension = 1.0;
  } else {
    // Smooth saturation curve for accumulated proximity risk
    constraintTension = Number((1.0 - Math.exp(-accumulatedRisk * 0.8)).toFixed(3));
  }

  const nearestWarning = isVesselCloser
    ? WARNING_THRESHOLD_VESSEL_MM
    : WARNING_THRESHOLD_AVOIDANCE_MM;
  const hazardIntensity = Number(
    clamp(1.0 - nearestClearance / nearestWarning, 0, 1).toFixed(3)
  );

  // Sort critical hazards by intensity descending
  criticalHazards.sort((a, b) => b.intensity - a.intensity);

  return {
    machineHaptics: {
      nearestHazard: {
        id: nearestId,
        displayName: nearestName,
        clearanceMm: Number(nearestClearance.toFixed(2)),
      },
      repulsionVector: finalRepulsionVector,
      hazardIntensity,
      targetAttractionVector,
      constraintTension,
      criticalHazards,
    },
    minVesselClearanceMm: Number(minVesselClearance.toFixed(2)),
    minAvoidanceClearanceMm: Number(minAvoidanceClearance.toFixed(2)),
    nearestVesselId,
    hasIntersections,
  };
}
