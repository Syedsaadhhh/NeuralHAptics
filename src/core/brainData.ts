import { TargetStructure, AvoidanceRegion, VesselSegment, CasePreset } from './types';

export const TARGET_STRUCTURES: Record<string, TargetStructure> = {
  tremor_center: {
    id: 'tremor_center',
    displayName: 'Subthalamic Nucleus',
    center: [12, -12, -6],
    radius: 3.5,
    color: '#00E5FF',
    description: 'Subthalamic nucleus; synthetic target for severe resting and action tremor suppression.',
  },
  motor_pathway: {
    id: 'motor_pathway',
    displayName: 'Globus Pallidus Internus',
    center: [20, -6, -3],
    radius: 4.5,
    color: '#7C4DFF',
    description: 'Globus pallidus internus; synthetic target for dystonia, rigidity, and dyskinesia modulation.',
  },
};

export const AVOIDANCE_REGIONS: AvoidanceRegion[] = [
  {
    id: 'speech_boundary',
    displayName: 'Internal Capsule Boundary',
    center: [16, -9, 0],
    radius: 5.0,
    color: '#FF466C',
    description: 'Synthetic avoidance region representing corticospinal capsular tract boundary. Avoid penetration.',
  },
];

// 14 carefully placed synthetic vessel segments creating realistic corridor trade-offs
export const SYNTHETIC_VESSELS: VesselSegment[] = [
  {
    id: 'vessel_01_pca_p1',
    displayName: 'Posterior Cerebral Artery (P1)',
    start: [6, -18, -10],
    end: [22, -22, -4],
    radiusMm: 1.4,
    severityWeight: 1.0,
  },
  {
    id: 'vessel_02_pca_p2',
    displayName: 'Posterior Cerebral Artery (P2)',
    start: [22, -22, -4],
    end: [32, -14, 4],
    radiusMm: 1.2,
    severityWeight: 0.95,
  },
  {
    id: 'vessel_03_mca_m1',
    displayName: 'Middle Cerebral Trunk (M1)',
    start: [14, 4, -4],
    end: [38, 2, 8],
    radiusMm: 1.6,
    severityWeight: 1.0,
  },
  {
    id: 'vessel_04_lenticulo_med',
    displayName: 'Medial Lenticulostriate Artery',
    start: [18, 2, -2],
    end: [19, -8, 16],
    radiusMm: 0.9,
    severityWeight: 0.9,
  },
  {
    id: 'vessel_05_lenticulo_lat',
    displayName: 'Lateral Lenticulostriate Artery',
    start: [26, 0, 0],
    end: [24, -10, 20],
    radiusMm: 0.85,
    severityWeight: 0.9,
  },
  {
    id: 'vessel_06_thalamo_perf',
    displayName: 'Thalamoperforating Branch',
    start: [10, -14, -8],
    end: [14, -16, 8],
    radiusMm: 0.75,
    severityWeight: 0.85,
  },
  {
    id: 'vessel_07_cortical_vein_a',
    displayName: 'Superficial Cortical Vein Alpha',
    start: [24, 20, 52],
    end: [32, 10, 68],
    radiusMm: 1.3,
    severityWeight: 0.8,
  },
  {
    id: 'vessel_08_cortical_vein_b',
    displayName: 'Superficial Cortical Vein Beta',
    start: [34, 24, 48],
    end: [22, 28, 64],
    radiusMm: 1.1,
    severityWeight: 0.8,
  },
  {
    id: 'vessel_09_ant_choroidal',
    displayName: 'Anterior Choroidal Artery',
    start: [16, -4, -6],
    end: [24, -16, 2],
    radiusMm: 0.8,
    severityWeight: 0.9,
  },
  {
    id: 'vessel_10_sulcal_branch_1',
    displayName: 'Precentral Sulcal Branch',
    start: [26, 12, 38],
    end: [36, 14, 56],
    radiusMm: 0.75,
    severityWeight: 0.75,
  },
  {
    id: 'vessel_11_sulcal_branch_2',
    displayName: 'Coronal Sulcal Branch',
    start: [20, 16, 32],
    end: [28, 22, 46],
    radiusMm: 0.7,
    severityWeight: 0.75,
  },
  {
    id: 'vessel_12_deep_venous',
    displayName: 'Internal Cerebral Venous Trunk',
    start: [8, -8, 6],
    end: [12, -20, 14],
    radiusMm: 1.2,
    severityWeight: 0.85,
  },
  {
    id: 'vessel_13_operculo_insular',
    displayName: 'Operculo-Insular Arterial Arc',
    start: [36, -4, 12],
    end: [30, 8, 30],
    radiusMm: 0.9,
    severityWeight: 0.8,
  },
  {
    id: 'vessel_14_fronto_polar',
    displayName: 'Frontopolar Ascending Vessel',
    start: [18, 24, 22],
    end: [24, 30, 48],
    radiusMm: 0.8,
    severityWeight: 0.7,
  },
];

export const CASE_PRESETS: Record<'case_a' | 'case_b', CasePreset> = {
  case_a: {
    id: 'case_a',
    name: 'Case A — Severe Tremor',
    indication: 'Severe Tremor (STN Focus)',
    targetId: 'tremor_center',
    objective: 'Maximize target overlap while strongly prioritizing vascular clearance and avoidance boundaries.',
    defaultStimulation: {
      current_mA: 2.5,
      frequency_Hz: 130,
      pulseWidth_us: 60,
      contacts: [1, 2], // 4-contact lead, contacts 1 & 2 active
    },
    nominalEntry: [27.5, 16.0, 68.0],
  },
  case_b: {
    id: 'case_b',
    name: 'Case B — Advanced Rigid Parkinsonism',
    indication: 'Advanced Rigid Parkinsonism (GPi Focus)',
    targetId: 'motor_pathway',
    objective: 'Balance target coverage, internal-capsule avoidance, and trajectory length.',
    defaultStimulation: {
      current_mA: 3.0,
      frequency_Hz: 130,
      pulseWidth_us: 70,
      contacts: [1, 2, 3],
    },
    nominalEntry: [34.0, 12.0, 65.0],
  },
};
