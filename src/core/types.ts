export type Vector3Tuple = [number, number, number];

export interface TargetStructure {
  id: string;
  displayName: string;
  center: Vector3Tuple;
  radius: number;
  color: string;
  description: string;
}

export interface AvoidanceRegion {
  id: string;
  displayName: string;
  center: Vector3Tuple;
  radius: number;
  color: string;
  description: string;
}

export interface VesselSegment {
  id: string;
  displayName: string;
  start: Vector3Tuple;
  end: Vector3Tuple;
  radiusMm: number;
  severityWeight: number;
}

export interface StimulationParams {
  current_mA: number;
  frequency_Hz: number;
  pulseWidth_us: number;
  contacts: number[]; // e.g. [0, 1, 2, 3]
}

export interface ShannonMetric {
  q_uC: number;
  chargeDensity_uC_cm2: number;
  k: number;
  referenceBoundary: number; // 1.75
  referenceStatus: 'WITHIN_REFERENCE_ENVELOPE' | 'ABOVE_REFERENCE_ENVELOPE';
  clinicalValidity: false;
}

export interface StimulationPreview {
  activationProxyRadiusMm: number;
  activationProxyVolumeMm3: number;
  targetCoveragePercent: number;
  avoidanceOverlapPercent: number;
  shannon: ShannonMetric;
}

export interface NearestHazard {
  id: string;
  displayName: string;
  clearanceMm: number;
  pointOnTrajectory: Vector3Tuple;
  pointOnHazard: Vector3Tuple;
  type: 'vessel' | 'avoidance';
}

export interface CriticalHazardItem {
  id: string;
  displayName: string;
  clearanceMm: number;
  repulsionVector: Vector3Tuple;
  intensity: number;
}

export interface MachineHapticsVector {
  nearestHazard: {
    id: string;
    displayName: string;
    clearanceMm: number;
  };
  repulsionVector: Vector3Tuple;
  hazardIntensity: number; // 0 - 1
  targetAttractionVector: Vector3Tuple;
  constraintTension: number; // 0 - 1
  criticalHazards: CriticalHazardItem[];
}

export interface CandidateTrajectory {
  candidateId: string;
  entryPoint: Vector3Tuple;
  targetPoint: Vector3Tuple;
  vesselClearanceMm: number;
  avoidanceClearanceMm: number;
  targetErrorMm: number;
  lengthMm: number;
  angularDeviationDeg: number;
  constraintTension: number;
  integratedHazardScore: number;
  isPareto?: boolean;
}

export interface HumanPriorities {
  minimumVesselClearanceMm: number;
  vascularClearance: number; // weight 0-1
  targetAccuracy: number; // weight 0-1
  avoidanceZone: number; // weight 0-1
  trajectoryLength: number; // weight 0-1
}

export interface CasePreset {
  id: 'case_a' | 'case_b';
  name: string;
  indication: string;
  targetId: string;
  objective: string;
  defaultStimulation: StimulationParams;
  nominalEntry: Vector3Tuple;
}

export interface ApprovalState {
  isApproved: boolean;
  approvedRevision: number | null;
  approvalDigest: string | null;
  approvedAt: string | null;
}

export type MutationOrigin = 'human' | 'webmcp' | 'local-harness';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  origin: MutationOrigin;
  toolName: string;
  arguments: Record<string, unknown>;
  resultSummary: string;
  revisionBefore: number;
  revisionAfter: number;
  durationMs: number;
  status: 'ok' | 'conflict' | 'error';
  rawResult?: unknown;
}

export interface PlanState {
  selectedCaseId: 'case_a' | 'case_b';
  targetId: string;
  entryPoint: Vector3Tuple;
  targetPoint: Vector3Tuple;
  nominalEntry: Vector3Tuple;
  stagedCandidate: CandidateTrajectory | null;
  previousTrajectory: { entryPoint: Vector3Tuple; targetPoint: Vector3Tuple } | null;
  searchCandidates: CandidateTrajectory[];
  hoveredCandidateId: string | null;
  stimulation: StimulationParams;
  stimulationPreview: StimulationPreview;
  machineHaptics: MachineHapticsVector;
  priorities: HumanPriorities;
  approval: ApprovalState;
  revision: number;
  lastChangedBy: MutationOrigin;
  auditLog: AuditLogEntry[];
  showMachineHaptics: boolean;
  isSearching: boolean;
}

export type WebMCPProtocolStatus =
  | 'WebMCP Active'
  | 'WebMCP Compatibility Mode'
  | 'WebMCP Unavailable — Local Harness';
