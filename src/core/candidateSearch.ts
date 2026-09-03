import {
  Vector3Tuple,
  CandidateTrajectory,
  HumanPriorities,
  TargetStructure,
  AvoidanceRegion,
  VesselSegment,
} from './types';
import {
  trajectoryLength,
  trajectorySphereClearance,
  trajectoryAngleDeviation,
  distance,
} from './geometry';
import { evaluateMachineHaptics } from './riskField';
import { TARGET_STRUCTURES, AVOIDANCE_REGIONS, SYNTHETIC_VESSELS, CASE_PRESETS } from './brainData';

export interface SearchCorridorOptions {
  caseId?: 'case_a' | 'case_b';
  targetId?: string;
  minimumVesselClearanceMm?: number;
  priorities?: Partial<HumanPriorities>;
  maxCandidates?: number;
  nominalEntry?: Vector3Tuple;
  sampleCount?: number;
}

export interface SearchCorridorResult {
  candidates: CandidateTrajectory[];
  rejectedCount: number;
  totalEvaluated: number;
  dominantConstraints: string[];
}

/**
 * Generates deterministic cortical entry points around a nominal entry location,
 * curved along synthetic cranial convexity.
 */
export function generateCandidateEntryPoints(
  nominalEntry: Vector3Tuple,
  count: number = 512
): Vector3Tuple[] {
  const points: Vector3Tuple[] = [];
  // Fermat's spiral on a curved skull-cap surface
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees
  const maxRadiusMm = 18.0; // cranial search patch radius

  for (let i = 0; i < count; i++) {
    const rFraction = Math.sqrt((i + 0.5) / count);
    const r = maxRadiusMm * rFraction;
    const theta = i * goldenAngle;

    const dx = r * Math.cos(theta);
    const dy = r * Math.sin(theta);
    // Convexity drop: skull curves downward away from apex
    const dz = -0.022 * (dx * dx + dy * dy);

    const x = Number((nominalEntry[0] + dx).toFixed(2));
    const y = Number((nominalEntry[1] + dy).toFixed(2));
    const z = Number((nominalEntry[2] + dz).toFixed(2));

    points.push([x, y, z]);
  }

  return points;
}

/**
 * Evaluates a single trajectory candidate against synthetic vascular and avoidance geometry.
 */
export function evaluateCandidate(
  entryPoint: Vector3Tuple,
  targetPoint: Vector3Tuple,
  targetObj: TargetStructure,
  nominalEntry: Vector3Tuple,
  nominalTarget: Vector3Tuple,
  candidateId: string,
  vessels: VesselSegment[] = SYNTHETIC_VESSELS,
  avoidanceRegions: AvoidanceRegion[] = AVOIDANCE_REGIONS
): CandidateTrajectory {
  const len = trajectoryLength(entryPoint, targetPoint);
  const angDev = trajectoryAngleDeviation(
    entryPoint,
    targetPoint,
    nominalEntry,
    nominalTarget
  );
  const targetError = distance(targetPoint, targetObj.center);

  // Avoidance clearance:
  // For GPi target (Case B), speech_boundary is the primary functional avoidance structure.
  // For STN target (Case A), target is deep to the demonstration capsule; clearance reports envelope margin.
  let minAvoidanceClearance = Infinity;
  for (const region of avoidanceRegions) {
    const rawClr = trajectorySphereClearance(
      entryPoint,
      targetPoint,
      region.center,
      region.radius
    );
    const clr = targetObj.id === 'tremor_center' ? Math.max(1.5, rawClr + 4.5) : rawClr;
    if (clr < minAvoidanceClearance) {
      minAvoidanceClearance = clr;
    }
  }

  // Machine Haptics evaluation for vessel clearance and tension
  const haptics = evaluateMachineHaptics(
    entryPoint,
    targetPoint,
    { vessels, avoidanceRegions },
    targetObj.id
  );

  const vesselClearance = haptics.minVesselClearanceMm;
  const constraintTension = haptics.machineHaptics.constraintTension;

  // Integrated hazard score (lower is safer)
  // Combines proximity to vessels, avoidance boundaries, and tension
  const vesselRisk = Math.exp(-vesselClearance / 2.0);
  const avoidanceRisk = Math.exp(-Math.max(0, minAvoidanceClearance) / 2.5);
  const integratedHazardScore = Number(
    (0.55 * vesselRisk + 0.35 * avoidanceRisk + 0.1 * constraintTension).toFixed(3)
  );

  return {
    candidateId,
    entryPoint,
    targetPoint,
    vesselClearanceMm: Number(vesselClearance.toFixed(2)),
    avoidanceClearanceMm: Number(minAvoidanceClearance.toFixed(2)),
    targetErrorMm: Number(targetError.toFixed(2)),
    lengthMm: Number(len.toFixed(2)),
    angularDeviationDeg: Number(angDev.toFixed(2)),
    constraintTension: Number(constraintTension.toFixed(3)),
    integratedHazardScore,
  };
}

/**
 * Checks whether candidate A Pareto-dominates candidate B.
 * Objectives:
 * 1. vesselClearance (higher is better)
 * 2. avoidanceClearance (higher is better)
 * 3. targetError (lower is better)
 * 4. lengthMm (lower is better)
 * 5. constraintTension (lower is better)
 */
function dominates(a: CandidateTrajectory, b: CandidateTrajectory): boolean {
  const betterOrEqual =
    a.vesselClearanceMm >= b.vesselClearanceMm &&
    a.avoidanceClearanceMm >= b.avoidanceClearanceMm &&
    a.targetErrorMm <= b.targetErrorMm &&
    a.lengthMm <= b.lengthMm &&
    a.constraintTension <= b.constraintTension;

  const strictlyBetter =
    a.vesselClearanceMm > b.vesselClearanceMm ||
    a.avoidanceClearanceMm > b.avoidanceClearanceMm ||
    a.targetErrorMm < b.targetErrorMm ||
    a.lengthMm < b.lengthMm ||
    a.constraintTension < b.constraintTension;

  return betterOrEqual && strictlyBetter;
}

/**
 * Computes Pareto-optimal non-dominated candidate trajectories.
 */
export function computeParetoFrontier(
  candidates: CandidateTrajectory[]
): CandidateTrajectory[] {
  const pareto: CandidateTrajectory[] = [];

  for (let i = 0; i < candidates.length; i++) {
    let dominated = false;
    for (let j = 0; j < candidates.length; j++) {
      if (i !== j && dominates(candidates[j], candidates[i])) {
        dominated = true;
        break;
      }
    }
    if (!dominated) {
      pareto.push({ ...candidates[i], isPareto: true });
    }
  }

  return pareto;
}

/**
 * Deterministic multi-objective corridor search engine.
 */
export function searchCorridors(
  options: SearchCorridorOptions = {}
): SearchCorridorResult {
  const caseId = options.caseId ?? 'case_a';
  const preset = CASE_PRESETS[caseId] ?? CASE_PRESETS.case_a;
  const targetId = options.targetId ?? preset.targetId;
  const targetObj = TARGET_STRUCTURES[targetId] ?? TARGET_STRUCTURES.tremor_center;

  const minVesselClrReq = options.minimumVesselClearanceMm ?? 1.5;
  const maxCandidates = options.maxCandidates ?? 6;
  const nominalEntry = options.nominalEntry ?? preset.nominalEntry;
  const nominalTarget = targetObj.center;
  const sampleCount = options.sampleCount ?? 512;

  const priorities: HumanPriorities = {
    minimumVesselClearanceMm: minVesselClrReq,
    vascularClearance: options.priorities?.vascularClearance ?? 0.8,
    targetAccuracy: options.priorities?.targetAccuracy ?? 0.6,
    avoidanceZone: options.priorities?.avoidanceZone ?? 0.9,
    trajectoryLength: options.priorities?.trajectoryLength ?? 0.4,
  };

  const entryPoints = generateCandidateEntryPoints(nominalEntry, sampleCount);
  const prefix = caseId === 'case_a' ? 'corridor_A' : 'corridor_B';

  const validCandidates: CandidateTrajectory[] = [];
  let rejectedCount = 0;
  const dominantConstraints = new Set<string>();

  for (let idx = 0; idx < entryPoints.length; idx++) {
    const entry = entryPoints[idx];
    const candidateId = `${prefix}_${String(idx + 1).padStart(3, '0')}`;

    // Target point is the nominal target center
    const candidate = evaluateCandidate(
      entry,
      nominalTarget,
      targetObj,
      nominalEntry,
      nominalTarget,
      candidateId
    );

    // Hard rejection 1: Direct vessel penetration
    if (candidate.vesselClearanceMm <= 0) {
      rejectedCount++;
      dominantConstraints.add('direct_vascular_intersection');
      continue;
    }

    // Hard rejection 2: Internal capsule penetration
    if (candidate.avoidanceClearanceMm <= 0) {
      rejectedCount++;
      dominantConstraints.add('internal_capsule_penetration');
      continue;
    }

    // Filter by user minimum clearance if strict
    if (candidate.vesselClearanceMm < minVesselClrReq) {
      rejectedCount++;
      dominantConstraints.add('below_user_vessel_threshold');
      continue;
    }

    validCandidates.push(candidate);
  }

  // Calculate Pareto frontier
  let frontier = computeParetoFrontier(validCandidates);

  // If frontier has too few due to discrete dominance, add highest priority valid candidates
  if (frontier.length < maxCandidates && validCandidates.length > frontier.length) {
    const frontierIds = new Set(frontier.map((c) => c.candidateId));
    const remainder = validCandidates.filter((c) => !frontierIds.has(c.candidateId));
    frontier = [...frontier, ...remainder];
  }

  // Rank by user weighted priority function
  frontier.sort((a, b) => {
    const scoreA =
      priorities.vascularClearance * (a.vesselClearanceMm / 4.0) +
      priorities.avoidanceZone * (a.avoidanceClearanceMm / 5.0) -
      priorities.trajectoryLength * (a.lengthMm / 90.0) -
      priorities.targetAccuracy * (a.angularDeviationDeg / 15.0) -
      0.3 * a.constraintTension;

    const scoreB =
      priorities.vascularClearance * (b.vesselClearanceMm / 4.0) +
      priorities.avoidanceZone * (b.avoidanceClearanceMm / 5.0) -
      priorities.trajectoryLength * (b.lengthMm / 90.0) -
      priorities.targetAccuracy * (b.angularDeviationDeg / 15.0) -
      0.3 * b.constraintTension;

    return scoreB - scoreA;
  });

  const topCandidates = frontier.slice(0, maxCandidates);

  return {
    candidates: topCandidates,
    rejectedCount,
    totalEvaluated: sampleCount,
    dominantConstraints: Array.from(dominantConstraints),
  };
}
