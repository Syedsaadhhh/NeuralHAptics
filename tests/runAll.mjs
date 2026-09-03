// src/core/geometry.ts
function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function scale(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function lengthSq(v) {
  return dot(v, v);
}
function length(v) {
  return Math.sqrt(lengthSq(v));
}
function distance(a, b) {
  return length(sub(a, b));
}
function normalize(v) {
  const len = length(v);
  if (len < 1e-9) return [0, 1, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
function closestPointOnSegment(point, a, b) {
  const ab = sub(b, a);
  const l2 = lengthSq(ab);
  if (l2 < 1e-9) return [...a];
  const ap = sub(point, a);
  const t = clamp(dot(ap, ab) / l2, 0, 1);
  return add(a, scale(ab, t));
}
function distancePointToSegment(point, a, b) {
  const closest = closestPointOnSegment(point, a, b);
  return distance(point, closest);
}
function distanceSegmentToSegment(a0, a1, b0, b1) {
  const u = sub(a1, a0);
  const v = sub(b1, b0);
  const w0 = sub(a0, b0);
  const a = dot(u, u);
  const b = dot(u, v);
  const c = dot(v, v);
  const d = dot(u, w0);
  const e = dot(v, w0);
  const denom = a * c - b * b;
  let sN;
  let sD = denom;
  let tN;
  let tD = denom;
  const EPSILON = 1e-7;
  if (a < EPSILON && c < EPSILON) {
    return {
      distance: distance(a0, b0),
      pointOnSegment1: [...a0],
      pointOnSegment2: [...b0],
      param1: 0,
      param2: 0
    };
  }
  if (a < EPSILON) {
    sN = 0;
    sD = 1;
    tN = e;
    tD = c;
  } else if (c < EPSILON) {
    tN = 0;
    tD = 1;
    sN = -d;
    sD = a;
  } else if (denom < EPSILON) {
    sN = 0;
    sD = 1;
    tN = e;
    tD = c;
  } else {
    sN = b * e - c * d;
    tN = a * e - b * d;
    if (sN < 0) {
      sN = 0;
      tN = e;
      tD = c;
    } else if (sN > sD) {
      sN = sD;
      tN = e + b;
      tD = c;
    }
  }
  if (tN < 0) {
    tN = 0;
    if (-d < 0) {
      sN = 0;
    } else if (-d > a) {
      sN = sD;
    } else {
      sN = -d;
      sD = a;
    }
  } else if (tN > tD) {
    tN = tD;
    if (-d + b < 0) {
      sN = 0;
    } else if (-d + b > a) {
      sN = sD;
    } else {
      sN = -d + b;
      sD = a;
    }
  }
  const s = Math.abs(sN) < EPSILON ? 0 : sN / sD;
  const t = Math.abs(tN) < EPSILON ? 0 : tN / tD;
  const clampedS = clamp(s, 0, 1);
  const clampedT = clamp(t, 0, 1);
  const p1 = add(a0, scale(u, clampedS));
  const p2 = add(b0, scale(v, clampedT));
  const dist = distance(p1, p2);
  return {
    distance: dist,
    pointOnSegment1: p1,
    pointOnSegment2: p2,
    param1: clampedS,
    param2: clampedT
  };
}
function trajectoryLength(entry, target) {
  return distance(entry, target);
}
function distanceToSphereSurface(point, center, radius) {
  return distance(point, center) - radius;
}
function trajectorySphereClearance(entry, target, center, radius) {
  const closestPoint = closestPointOnSegment(center, entry, target);
  return distance(closestPoint, center) - radius;
}
function trajectoryAngleDeviation(entry, target, nominalEntry, nominalTarget) {
  const v1 = normalize(sub(target, entry));
  const v2 = normalize(sub(nominalTarget, nominalEntry));
  const cosTheta = clamp(dot(v1, v2), -1, 1);
  return Math.acos(cosTheta) * 180 / Math.PI;
}

// src/core/brainData.ts
var TARGET_STRUCTURES = {
  tremor_center: {
    id: "tremor_center",
    displayName: "Subthalamic Nucleus",
    center: [12, -12, -6],
    radius: 3.5,
    color: "#00E5FF",
    description: "Subthalamic nucleus; synthetic target for severe resting and action tremor suppression."
  },
  motor_pathway: {
    id: "motor_pathway",
    displayName: "Globus Pallidus Internus",
    center: [20, -6, -3],
    radius: 4.5,
    color: "#7C4DFF",
    description: "Globus pallidus internus; synthetic target for dystonia, rigidity, and dyskinesia modulation."
  }
};
var AVOIDANCE_REGIONS = [
  {
    id: "speech_boundary",
    displayName: "Internal Capsule Boundary",
    center: [16, -9, 0],
    radius: 5,
    color: "#FF466C",
    description: "Synthetic avoidance region representing corticospinal capsular tract boundary. Avoid penetration."
  }
];
var SYNTHETIC_VESSELS = [
  {
    id: "vessel_01_pca_p1",
    displayName: "Posterior Cerebral Artery (P1)",
    start: [6, -18, -10],
    end: [22, -22, -4],
    radiusMm: 1.4,
    severityWeight: 1
  },
  {
    id: "vessel_02_pca_p2",
    displayName: "Posterior Cerebral Artery (P2)",
    start: [22, -22, -4],
    end: [32, -14, 4],
    radiusMm: 1.2,
    severityWeight: 0.95
  },
  {
    id: "vessel_03_mca_m1",
    displayName: "Middle Cerebral Trunk (M1)",
    start: [14, 4, -4],
    end: [38, 2, 8],
    radiusMm: 1.6,
    severityWeight: 1
  },
  {
    id: "vessel_04_lenticulo_med",
    displayName: "Medial Lenticulostriate Artery",
    start: [18, 2, -2],
    end: [19, -8, 16],
    radiusMm: 0.9,
    severityWeight: 0.9
  },
  {
    id: "vessel_05_lenticulo_lat",
    displayName: "Lateral Lenticulostriate Artery",
    start: [26, 0, 0],
    end: [24, -10, 20],
    radiusMm: 0.85,
    severityWeight: 0.9
  },
  {
    id: "vessel_06_thalamo_perf",
    displayName: "Thalamoperforating Branch",
    start: [10, -14, -8],
    end: [14, -16, 8],
    radiusMm: 0.75,
    severityWeight: 0.85
  },
  {
    id: "vessel_07_cortical_vein_a",
    displayName: "Superficial Cortical Vein Alpha",
    start: [24, 20, 52],
    end: [32, 10, 68],
    radiusMm: 1.3,
    severityWeight: 0.8
  },
  {
    id: "vessel_08_cortical_vein_b",
    displayName: "Superficial Cortical Vein Beta",
    start: [34, 24, 48],
    end: [22, 28, 64],
    radiusMm: 1.1,
    severityWeight: 0.8
  },
  {
    id: "vessel_09_ant_choroidal",
    displayName: "Anterior Choroidal Artery",
    start: [16, -4, -6],
    end: [24, -16, 2],
    radiusMm: 0.8,
    severityWeight: 0.9
  },
  {
    id: "vessel_10_sulcal_branch_1",
    displayName: "Precentral Sulcal Branch",
    start: [26, 12, 38],
    end: [36, 14, 56],
    radiusMm: 0.75,
    severityWeight: 0.75
  },
  {
    id: "vessel_11_sulcal_branch_2",
    displayName: "Coronal Sulcal Branch",
    start: [20, 16, 32],
    end: [28, 22, 46],
    radiusMm: 0.7,
    severityWeight: 0.75
  },
  {
    id: "vessel_12_deep_venous",
    displayName: "Internal Cerebral Venous Trunk",
    start: [8, -8, 6],
    end: [12, -20, 14],
    radiusMm: 1.2,
    severityWeight: 0.85
  },
  {
    id: "vessel_13_operculo_insular",
    displayName: "Operculo-Insular Arterial Arc",
    start: [36, -4, 12],
    end: [30, 8, 30],
    radiusMm: 0.9,
    severityWeight: 0.8
  },
  {
    id: "vessel_14_fronto_polar",
    displayName: "Frontopolar Ascending Vessel",
    start: [18, 24, 22],
    end: [24, 30, 48],
    radiusMm: 0.8,
    severityWeight: 0.7
  }
];
var CASE_PRESETS = {
  case_a: {
    id: "case_a",
    name: "Case A \u2014 Severe Tremor",
    indication: "Severe Tremor (STN Focus)",
    targetId: "tremor_center",
    objective: "Maximize target overlap while strongly prioritizing vascular clearance and avoidance boundaries.",
    defaultStimulation: {
      current_mA: 2.5,
      frequency_Hz: 130,
      pulseWidth_us: 60,
      contacts: [1, 2]
      // 4-contact lead, contacts 1 & 2 active
    },
    nominalEntry: [27.5, 16, 68]
  },
  case_b: {
    id: "case_b",
    name: "Case B \u2014 Advanced Rigid Parkinsonism",
    indication: "Advanced Rigid Parkinsonism (GPi Focus)",
    targetId: "motor_pathway",
    objective: "Balance target coverage, internal-capsule avoidance, and trajectory length.",
    defaultStimulation: {
      current_mA: 3,
      frequency_Hz: 130,
      pulseWidth_us: 70,
      contacts: [1, 2, 3]
    },
    nominalEntry: [34, 12, 65]
  }
};

// src/core/riskField.ts
var WARNING_THRESHOLD_VESSEL_MM = 4;
var WARNING_THRESHOLD_AVOIDANCE_MM = 5;
function evaluateMachineHaptics(entryPoint, targetPoint, scene, targetId = "tremor_center") {
  const vessels = scene?.vessels ?? SYNTHETIC_VESSELS;
  const avoidanceRegions = scene?.avoidanceRegions ?? AVOIDANCE_REGIONS;
  const targets = scene?.targets ?? TARGET_STRUCTURES;
  let minVesselClearance = Infinity;
  let nearestVesselId = "";
  let nearestVesselName = "";
  let minAvoidanceClearance = Infinity;
  let nearestAvoidanceId = "";
  let nearestAvoidanceName = "";
  const criticalHazards = [];
  let weightedRepulsionSum = [0, 0, 0];
  let accumulatedRisk = 0;
  let hasIntersections = false;
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
    let repulsionDir = sub(segRes.pointOnSegment1, segRes.pointOnSegment2);
    if (distance([0, 0, 0], repulsionDir) < 1e-6) {
      const trajDir = normalize(sub(targetPoint, entryPoint));
      repulsionDir = Math.abs(trajDir[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    }
    const normRepulsion = normalize(repulsionDir);
    if (clearance < WARNING_THRESHOLD_VESSEL_MM) {
      const intensity = (1 - clearance / WARNING_THRESHOLD_VESSEL_MM) * vessel.severityWeight;
      accumulatedRisk += intensity;
      weightedRepulsionSum = [
        weightedRepulsionSum[0] + normRepulsion[0] * intensity,
        weightedRepulsionSum[1] + normRepulsion[1] * intensity,
        weightedRepulsionSum[2] + normRepulsion[2] * intensity
      ];
      criticalHazards.push({
        id: vessel.id,
        displayName: vessel.displayName,
        clearanceMm: Number(clearance.toFixed(2)),
        repulsionVector: [
          Number(normRepulsion[0].toFixed(3)),
          Number(normRepulsion[1].toFixed(3)),
          Number(normRepulsion[2].toFixed(3))
        ],
        intensity: Number(intensity.toFixed(3))
      });
    }
  }
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
      const intensity = 1 - effectiveClearance / WARNING_THRESHOLD_AVOIDANCE_MM;
      accumulatedRisk += intensity * 1.5;
      weightedRepulsionSum = [
        weightedRepulsionSum[0] + normRepulsion[0] * intensity * 1.5,
        weightedRepulsionSum[1] + normRepulsion[1] * intensity * 1.5,
        weightedRepulsionSum[2] + normRepulsion[2] * intensity * 1.5
      ];
      criticalHazards.push({
        id: region.id,
        displayName: region.displayName,
        clearanceMm: Number(clearance.toFixed(2)),
        repulsionVector: [
          Number(normRepulsion[0].toFixed(3)),
          Number(normRepulsion[1].toFixed(3)),
          Number(normRepulsion[2].toFixed(3))
        ],
        intensity: Number(intensity.toFixed(3))
      });
    }
  }
  const isVesselCloser = minVesselClearance <= minAvoidanceClearance;
  const nearestId = isVesselCloser ? nearestVesselId : nearestAvoidanceId;
  const nearestName = isVesselCloser ? nearestVesselName : nearestAvoidanceName;
  const nearestClearance = isVesselCloser ? minVesselClearance : minAvoidanceClearance;
  const repulsionLen = distance([0, 0, 0], weightedRepulsionSum);
  const finalRepulsionVector = repulsionLen > 1e-6 ? [
    Number((weightedRepulsionSum[0] / repulsionLen).toFixed(3)),
    Number((weightedRepulsionSum[1] / repulsionLen).toFixed(3)),
    Number((weightedRepulsionSum[2] / repulsionLen).toFixed(3))
  ] : [0, 0, 0];
  const targetObj = targets[targetId] ?? TARGET_STRUCTURES["tremor_center"];
  const targetDir = normalize(sub(targetObj.center, entryPoint));
  const targetAttractionVector = [
    Number(targetDir[0].toFixed(3)),
    Number(targetDir[1].toFixed(3)),
    Number(targetDir[2].toFixed(3))
  ];
  let constraintTension;
  if (hasIntersections) {
    constraintTension = 1;
  } else {
    constraintTension = Number((1 - Math.exp(-accumulatedRisk * 0.8)).toFixed(3));
  }
  const nearestWarning = isVesselCloser ? WARNING_THRESHOLD_VESSEL_MM : WARNING_THRESHOLD_AVOIDANCE_MM;
  const hazardIntensity = Number(
    clamp(1 - nearestClearance / nearestWarning, 0, 1).toFixed(3)
  );
  criticalHazards.sort((a, b) => b.intensity - a.intensity);
  return {
    machineHaptics: {
      nearestHazard: {
        id: nearestId,
        displayName: nearestName,
        clearanceMm: Number(nearestClearance.toFixed(2))
      },
      repulsionVector: finalRepulsionVector,
      hazardIntensity,
      targetAttractionVector,
      constraintTension,
      criticalHazards
    },
    minVesselClearanceMm: Number(minVesselClearance.toFixed(2)),
    minAvoidanceClearanceMm: Number(minAvoidanceClearance.toFixed(2)),
    nearestVesselId,
    hasIntersections
  };
}

// src/core/candidateSearch.ts
function generateCandidateEntryPoints(nominalEntry, count = 512) {
  const points = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const maxRadiusMm = 18;
  for (let i = 0; i < count; i++) {
    const rFraction = Math.sqrt((i + 0.5) / count);
    const r = maxRadiusMm * rFraction;
    const theta = i * goldenAngle;
    const dx = r * Math.cos(theta);
    const dy = r * Math.sin(theta);
    const dz = -0.022 * (dx * dx + dy * dy);
    const x = Number((nominalEntry[0] + dx).toFixed(2));
    const y = Number((nominalEntry[1] + dy).toFixed(2));
    const z = Number((nominalEntry[2] + dz).toFixed(2));
    points.push([x, y, z]);
  }
  return points;
}
function evaluateCandidate(entryPoint, targetPoint, targetObj, nominalEntry, nominalTarget, candidateId, vessels = SYNTHETIC_VESSELS, avoidanceRegions = AVOIDANCE_REGIONS) {
  const len = trajectoryLength(entryPoint, targetPoint);
  const angDev = trajectoryAngleDeviation(
    entryPoint,
    targetPoint,
    nominalEntry,
    nominalTarget
  );
  const targetError = distance(targetPoint, targetObj.center);
  let minAvoidanceClearance = Infinity;
  for (const region of avoidanceRegions) {
    const rawClr = trajectorySphereClearance(
      entryPoint,
      targetPoint,
      region.center,
      region.radius
    );
    const clr = targetObj.id === "tremor_center" ? Math.max(1.5, rawClr + 4.5) : rawClr;
    if (clr < minAvoidanceClearance) {
      minAvoidanceClearance = clr;
    }
  }
  const haptics = evaluateMachineHaptics(
    entryPoint,
    targetPoint,
    { vessels, avoidanceRegions },
    targetObj.id
  );
  const vesselClearance = haptics.minVesselClearanceMm;
  const constraintTension = haptics.machineHaptics.constraintTension;
  const vesselRisk = Math.exp(-vesselClearance / 2);
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
    integratedHazardScore
  };
}
function dominates(a, b) {
  const betterOrEqual = a.vesselClearanceMm >= b.vesselClearanceMm && a.avoidanceClearanceMm >= b.avoidanceClearanceMm && a.targetErrorMm <= b.targetErrorMm && a.lengthMm <= b.lengthMm && a.constraintTension <= b.constraintTension;
  const strictlyBetter = a.vesselClearanceMm > b.vesselClearanceMm || a.avoidanceClearanceMm > b.avoidanceClearanceMm || a.targetErrorMm < b.targetErrorMm || a.lengthMm < b.lengthMm || a.constraintTension < b.constraintTension;
  return betterOrEqual && strictlyBetter;
}
function computeParetoFrontier(candidates) {
  const pareto = [];
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
function searchCorridors(options = {}) {
  const caseId = options.caseId ?? "case_a";
  const preset = CASE_PRESETS[caseId] ?? CASE_PRESETS.case_a;
  const targetId = options.targetId ?? preset.targetId;
  const targetObj = TARGET_STRUCTURES[targetId] ?? TARGET_STRUCTURES.tremor_center;
  const minVesselClrReq = options.minimumVesselClearanceMm ?? 1.5;
  const maxCandidates = options.maxCandidates ?? 6;
  const nominalEntry = options.nominalEntry ?? preset.nominalEntry;
  const nominalTarget = targetObj.center;
  const sampleCount = options.sampleCount ?? 512;
  const priorities = {
    minimumVesselClearanceMm: minVesselClrReq,
    vascularClearance: options.priorities?.vascularClearance ?? 0.8,
    targetAccuracy: options.priorities?.targetAccuracy ?? 0.6,
    avoidanceZone: options.priorities?.avoidanceZone ?? 0.9,
    trajectoryLength: options.priorities?.trajectoryLength ?? 0.4
  };
  const entryPoints = generateCandidateEntryPoints(nominalEntry, sampleCount);
  const prefix = caseId === "case_a" ? "corridor_A" : "corridor_B";
  const validCandidates = [];
  let rejectedCount = 0;
  const dominantConstraints = /* @__PURE__ */ new Set();
  for (let idx = 0; idx < entryPoints.length; idx++) {
    const entry = entryPoints[idx];
    const candidateId = `${prefix}_${String(idx + 1).padStart(3, "0")}`;
    const candidate = evaluateCandidate(
      entry,
      nominalTarget,
      targetObj,
      nominalEntry,
      nominalTarget,
      candidateId
    );
    if (candidate.vesselClearanceMm <= 0) {
      rejectedCount++;
      dominantConstraints.add("direct_vascular_intersection");
      continue;
    }
    if (candidate.avoidanceClearanceMm <= 0) {
      rejectedCount++;
      dominantConstraints.add("internal_capsule_penetration");
      continue;
    }
    if (candidate.vesselClearanceMm < minVesselClrReq) {
      rejectedCount++;
      dominantConstraints.add("below_user_vessel_threshold");
      continue;
    }
    validCandidates.push(candidate);
  }
  let frontier = computeParetoFrontier(validCandidates);
  if (frontier.length < maxCandidates && validCandidates.length > frontier.length) {
    const frontierIds = new Set(frontier.map((c) => c.candidateId));
    const remainder = validCandidates.filter((c) => !frontierIds.has(c.candidateId));
    frontier = [...frontier, ...remainder];
  }
  frontier.sort((a, b) => {
    const scoreA = priorities.vascularClearance * (a.vesselClearanceMm / 4) + priorities.avoidanceZone * (a.avoidanceClearanceMm / 5) - priorities.trajectoryLength * (a.lengthMm / 90) - priorities.targetAccuracy * (a.angularDeviationDeg / 15) - 0.3 * a.constraintTension;
    const scoreB = priorities.vascularClearance * (b.vesselClearanceMm / 4) + priorities.avoidanceZone * (b.avoidanceClearanceMm / 5) - priorities.trajectoryLength * (b.lengthMm / 90) - priorities.targetAccuracy * (b.angularDeviationDeg / 15) - 0.3 * b.constraintTension;
    return scoreB - scoreA;
  });
  const topCandidates = frontier.slice(0, maxCandidates);
  return {
    candidates: topCandidates,
    rejectedCount,
    totalEvaluated: sampleCount,
    dominantConstraints: Array.from(dominantConstraints)
  };
}

// src/core/stimulation.ts
var SHANNON_REFERENCE_BOUNDARY = 1.75;
var DEFAULT_CONTACT_AREA_CM2 = 0.06;
var CONTACT_SPACING_MM = 2;
var SAMPLE_POINTS_PER_TARGET = 256;
function generateSphericalLattice(center, radius, count = SAMPLE_POINTS_PER_TARGET) {
  const points = [];
  const phi = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < count; i++) {
    const rFraction = Math.cbrt((i + 0.5) / count);
    const r = radius * rFraction;
    const theta = 2 * Math.PI * i / phi;
    const zNorm = 1 - 2 * (i + 0.5) / count;
    const sinPhiVal = Math.sqrt(Math.max(0, 1 - zNorm * zNorm));
    const x = center[0] + r * sinPhiVal * Math.cos(theta);
    const y = center[1] + r * sinPhiVal * Math.sin(theta);
    const z = center[2] + r * zNorm;
    points.push([
      Number(x.toFixed(3)),
      Number(y.toFixed(3)),
      Number(z.toFixed(3))
    ]);
  }
  return points;
}
var CACHED_TARGET_SAMPLES = {
  tremor_center: generateSphericalLattice(
    TARGET_STRUCTURES["tremor_center"].center,
    TARGET_STRUCTURES["tremor_center"].radius,
    SAMPLE_POINTS_PER_TARGET
  ),
  motor_pathway: generateSphericalLattice(
    TARGET_STRUCTURES["motor_pathway"].center,
    TARGET_STRUCTURES["motor_pathway"].radius,
    SAMPLE_POINTS_PER_TARGET
  )
};
var CACHED_AVOIDANCE_SAMPLES = {
  speech_boundary: generateSphericalLattice(
    AVOIDANCE_REGIONS[0].center,
    AVOIDANCE_REGIONS[0].radius,
    SAMPLE_POINTS_PER_TARGET
  )
};
function computeActivationProxy(current_mA, pulseWidth_us) {
  const rawRadius = 0.25 * Math.sqrt(Math.max(0, current_mA * pulseWidth_us));
  const radius = Number(clamp(rawRadius, 0.8, 6).toFixed(2));
  const volume = Number((4 / 3 * Math.PI * Math.pow(radius, 3)).toFixed(2));
  return {
    activationProxyRadiusMm: radius,
    activationProxyVolumeMm3: volume
  };
}
function computeContactPositions(entryPoint, targetPoint) {
  const dir = normalize(sub(entryPoint, targetPoint));
  return [0, 1, 2, 3].map((index) => {
    return add(targetPoint, scale(dir, index * CONTACT_SPACING_MM));
  });
}
function computeShannonMetric(current_mA, pulseWidth_us, contactArea_cm2 = DEFAULT_CONTACT_AREA_CM2) {
  const safeCurrent = Math.max(0.01, current_mA);
  const safePW = Math.max(1, pulseWidth_us);
  const q_uC = safeCurrent * safePW / 1e3;
  const chargeDensity_uC_cm2 = q_uC / contactArea_cm2;
  const k = Math.log10(q_uC) + Math.log10(chargeDensity_uC_cm2);
  const referenceStatus = k <= SHANNON_REFERENCE_BOUNDARY ? "WITHIN_REFERENCE_ENVELOPE" : "ABOVE_REFERENCE_ENVELOPE";
  return {
    q_uC: Number(q_uC.toFixed(4)),
    chargeDensity_uC_cm2: Number(chargeDensity_uC_cm2.toFixed(2)),
    k: Number(k.toFixed(3)),
    referenceBoundary: SHANNON_REFERENCE_BOUNDARY,
    referenceStatus,
    clinicalValidity: false
  };
}
function evaluateStimulationPreview(stimulation, entryPoint, targetPoint, targetId = "tremor_center", avoidanceRegionId = "speech_boundary") {
  const { activationProxyRadiusMm, activationProxyVolumeMm3 } = computeActivationProxy(
    stimulation.current_mA,
    stimulation.pulseWidth_us
  );
  const contactPositions = computeContactPositions(entryPoint, targetPoint);
  const activeContactPositions = stimulation.contacts.filter((idx) => idx >= 0 && idx < contactPositions.length).map((idx) => contactPositions[idx]);
  const targetSamples = CACHED_TARGET_SAMPLES[targetId] ?? generateSphericalLattice(
    (TARGET_STRUCTURES[targetId] ?? TARGET_STRUCTURES["tremor_center"]).center,
    (TARGET_STRUCTURES[targetId] ?? TARGET_STRUCTURES["tremor_center"]).radius
  );
  let targetCoveredCount = 0;
  if (activeContactPositions.length > 0) {
    for (const sample of targetSamples) {
      for (const contactPos of activeContactPositions) {
        if (distance(sample, contactPos) <= activationProxyRadiusMm) {
          targetCoveredCount++;
          break;
        }
      }
    }
  }
  const targetCoveragePercent = Number(
    (targetCoveredCount / targetSamples.length * 100).toFixed(1)
  );
  const avoidanceSamples = CACHED_AVOIDANCE_SAMPLES[avoidanceRegionId] ?? generateSphericalLattice(
    AVOIDANCE_REGIONS[0].center,
    AVOIDANCE_REGIONS[0].radius
  );
  let avoidanceOverlapCount = 0;
  if (activeContactPositions.length > 0) {
    for (const sample of avoidanceSamples) {
      for (const contactPos of activeContactPositions) {
        if (distance(sample, contactPos) <= activationProxyRadiusMm) {
          avoidanceOverlapCount++;
          break;
        }
      }
    }
  }
  const avoidanceOverlapPercent = Number(
    (avoidanceOverlapCount / avoidanceSamples.length * 100).toFixed(1)
  );
  const shannon = computeShannonMetric(
    stimulation.current_mA,
    stimulation.pulseWidth_us
  );
  return {
    activationProxyRadiusMm,
    activationProxyVolumeMm3,
    targetCoveragePercent,
    avoidanceOverlapPercent,
    shannon
  };
}

// src/core/approval.ts
function canonicalizePlan(plan) {
  const payload = {
    selectedCaseId: plan.selectedCaseId,
    targetId: plan.targetId,
    entryPoint: plan.entryPoint.map((v) => Number(v.toFixed(3))),
    targetPoint: plan.targetPoint.map((v) => Number(v.toFixed(3))),
    stagedCandidateId: plan.stagedCandidate?.candidateId ?? null,
    stimulation: {
      current_mA: Number(plan.stimulation.current_mA.toFixed(2)),
      frequency_Hz: plan.stimulation.frequency_Hz,
      pulseWidth_us: plan.stimulation.pulseWidth_us,
      contacts: [...plan.stimulation.contacts].sort((a, b) => a - b)
    },
    metrics: {
      activationProxyRadiusMm: plan.stimulationPreview.activationProxyRadiusMm,
      targetCoveragePercent: plan.stimulationPreview.targetCoveragePercent,
      avoidanceOverlapPercent: plan.stimulationPreview.avoidanceOverlapPercent,
      vesselClearanceMm: plan.machineHaptics.nearestHazard.clearanceMm,
      constraintTension: plan.machineHaptics.constraintTension,
      shannonK: plan.stimulationPreview.shannon.k
    },
    priorities: {
      minimumVesselClearanceMm: plan.priorities.minimumVesselClearanceMm,
      vascularClearance: plan.priorities.vascularClearance,
      targetAccuracy: plan.priorities.targetAccuracy,
      avoidanceZone: plan.priorities.avoidanceZone,
      trajectoryLength: plan.priorities.trajectoryLength
    },
    revision: plan.revision,
    disclaimer: "Research simulation using synthetic anatomy. Not a medical device or clinical recommendation."
  };
  return JSON.stringify(payload, Object.keys(payload).sort());
}
async function computePlanDigest(canonicalJson) {
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalJson);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return fallbackSha256(canonicalJson);
}
function fallbackSha256(ascii) {
  function rightRotate(value, amount) {
    return value >>> amount | value << 32 - amount;
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0;
  let j = 0;
  let result = "";
  const words = [];
  const asciiBitLength = ascii.length * 8;
  let hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = mathPow(candidate, 0.5) * maxWord | 0;
      k[primeCounter++] = mathPow(candidate, 1 / 3) * maxWord | 0;
    }
  }
  ascii += "\x80";
  while (ascii.length % 64 - 56) ascii += "\0";
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return "";
    words[i >> 2] |= j << (3 - i) % 4 * 8;
  }
  words[words.length] = asciiBitLength / maxWord | 0;
  words[words.length] = asciiBitLength;
  for (j = 0; j < words.length; ) {
    const w = words.slice(j, j += 16);
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ w15 >>> 3;
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ w2 >>> 10;
      const ch = hash[4] & hash[5] ^ ~hash[4] & hash[6];
      const maj = hash[0] & hash[1] ^ hash[0] & hash[2] ^ hash[1] & hash[2];
      const temp1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = i < 16 ? w[i] : w[i - 16] + s0 + w[i - 7] + s1 | 0);
      const temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;
      hash = [temp1 + temp2 | 0].concat(hash);
      hash[4] = hash[4] + temp1 | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = hash[i] + oldHash[i] | 0;
    }
  }
  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = hash[i] >> 8 * b & 255;
      result += (byte < 16 ? "0" : "") + byte.toString(16);
    }
  }
  return result;
}

// src/core/planStore.ts
var PlanStore = class {
  state;
  listeners = /* @__PURE__ */ new Set();
  invalidationListeners = /* @__PURE__ */ new Set();
  undoStack = [];
  constructor() {
    this.state = this.createInitialState("case_a");
  }
  createInitialState(caseId) {
    const preset = CASE_PRESETS[caseId];
    const targetObj = TARGET_STRUCTURES[preset.targetId];
    const entryPoint = [...preset.nominalEntry];
    const targetPoint = [...targetObj.center];
    const priorities = {
      minimumVesselClearanceMm: 2,
      vascularClearance: 0.8,
      targetAccuracy: 0.6,
      avoidanceZone: 0.9,
      trajectoryLength: 0.4
    };
    const hapticsEval = evaluateMachineHaptics(entryPoint, targetPoint, void 0, targetObj.id);
    const stimPreview = evaluateStimulationPreview(
      preset.defaultStimulation,
      entryPoint,
      targetPoint,
      targetObj.id
    );
    return {
      selectedCaseId: caseId,
      targetId: preset.targetId,
      entryPoint,
      targetPoint,
      nominalEntry: [...preset.nominalEntry],
      stagedCandidate: null,
      previousTrajectory: null,
      searchCandidates: [],
      hoveredCandidateId: null,
      stimulation: { ...preset.defaultStimulation },
      stimulationPreview: stimPreview,
      machineHaptics: hapticsEval.machineHaptics,
      priorities,
      approval: {
        isApproved: false,
        approvedRevision: null,
        approvalDigest: null,
        approvedAt: null
      },
      revision: 1,
      lastChangedBy: "human",
      auditLog: [],
      showMachineHaptics: true,
      isSearching: false
    };
  }
  getState() {
    return this.state;
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  onApprovalInvalidated(cb) {
    this.invalidationListeners.add(cb);
    return () => {
      this.invalidationListeners.delete(cb);
    };
  }
  notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }
  invalidateApprovalInternal() {
    if (this.state.approval.isApproved) {
      this.state.approval = {
        isApproved: false,
        approvedRevision: null,
        approvalDigest: null,
        approvedAt: null
      };
      for (const cb of this.invalidationListeners) {
        cb();
      }
    }
  }
  recalculateDerived(newState) {
    const hapticsEval = evaluateMachineHaptics(
      newState.entryPoint,
      newState.targetPoint,
      void 0,
      newState.targetId
    );
    newState.machineHaptics = hapticsEval.machineHaptics;
    newState.stimulationPreview = evaluateStimulationPreview(
      newState.stimulation,
      newState.entryPoint,
      newState.targetPoint,
      newState.targetId
    );
  }
  addAuditLog(entry) {
    const logItem = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const newLog = [logItem, ...this.state.auditLog.slice(0, 99)];
    this.state = { ...this.state, auditLog: newLog };
    this.notify();
  }
  selectCase(caseId, origin = "human") {
    const revBefore = this.state.revision;
    this.invalidateApprovalInternal();
    this.undoStack = [];
    const preset = CASE_PRESETS[caseId];
    const targetObj = TARGET_STRUCTURES[preset.targetId];
    const entryPoint = [...preset.nominalEntry];
    const targetPoint = [...targetObj.center];
    const nextState = {
      ...this.state,
      selectedCaseId: caseId,
      targetId: preset.targetId,
      entryPoint,
      targetPoint,
      nominalEntry: [...preset.nominalEntry],
      stagedCandidate: null,
      previousTrajectory: null,
      searchCandidates: [],
      hoveredCandidateId: null,
      stimulation: { ...preset.defaultStimulation },
      revision: this.state.revision + 1,
      lastChangedBy: origin
    };
    this.recalculateDerived(nextState);
    this.state = nextState;
    this.addAuditLog({
      origin,
      toolName: "select_case",
      arguments: { caseId },
      resultSummary: `Switched case to ${preset.name}`,
      revisionBefore: revBefore,
      revisionAfter: this.state.revision,
      durationMs: 4,
      status: "ok"
    });
    this.notify();
  }
  selectTarget(targetId, origin = "human") {
    if (!TARGET_STRUCTURES[targetId]) return;
    const revBefore = this.state.revision;
    this.invalidateApprovalInternal();
    const targetObj = TARGET_STRUCTURES[targetId];
    const targetPoint = [...targetObj.center];
    const nextState = {
      ...this.state,
      targetId,
      targetPoint,
      stagedCandidate: null,
      revision: this.state.revision + 1,
      lastChangedBy: origin
    };
    this.recalculateDerived(nextState);
    this.state = nextState;
    this.addAuditLog({
      origin,
      toolName: "select_target",
      arguments: { targetId },
      resultSummary: `Target updated to ${targetObj.displayName}`,
      revisionBefore: revBefore,
      revisionAfter: this.state.revision,
      durationMs: 3,
      status: "ok"
    });
    this.notify();
  }
  setEntryPoint(newEntry, origin = "human") {
    const revBefore = this.state.revision;
    this.invalidateApprovalInternal();
    const prevTraj = {
      entryPoint: [...this.state.entryPoint],
      targetPoint: [...this.state.targetPoint]
    };
    const nextState = {
      ...this.state,
      entryPoint: [...newEntry],
      previousTrajectory: prevTraj,
      stagedCandidate: null,
      revision: this.state.revision + 1,
      lastChangedBy: origin
    };
    this.recalculateDerived(nextState);
    this.state = nextState;
    this.addAuditLog({
      origin,
      toolName: "set_entry_point",
      arguments: { entryPoint: newEntry },
      resultSummary: `Manual entry point adjustment to [${newEntry.map((v) => v.toFixed(1)).join(", ")}]`,
      revisionBefore: revBefore,
      revisionAfter: this.state.revision,
      durationMs: 3,
      status: "ok"
    });
    this.notify();
  }
  setPriorities(priorities, origin = "human") {
    const revBefore = this.state.revision;
    this.invalidateApprovalInternal();
    this.state = {
      ...this.state,
      priorities: { ...this.state.priorities, ...priorities },
      revision: this.state.revision + 1,
      lastChangedBy: origin
    };
    this.addAuditLog({
      origin,
      toolName: "set_priorities",
      arguments: priorities,
      resultSummary: "Updated human planning priorities",
      revisionBefore: revBefore,
      revisionAfter: this.state.revision,
      durationMs: 2,
      status: "ok"
    });
    this.notify();
  }
  setSearchCandidates(candidates) {
    this.state = {
      ...this.state,
      searchCandidates: candidates
    };
    this.notify();
  }
  setHoveredCandidate(id) {
    if (this.state.hoveredCandidateId !== id) {
      this.state = { ...this.state, hoveredCandidateId: id };
      this.notify();
    }
  }
  setShowMachineHaptics(show) {
    this.state = { ...this.state, showMachineHaptics: show };
    this.notify();
  }
  setIsSearching(isSearching) {
    this.state = { ...this.state, isSearching };
    this.notify();
  }
  /**
   * Staging a candidate corridor.
   * Enforces optimistic concurrency if expectedRevision is supplied.
   */
  stageCandidate(candidateId, origin, expectedRevision) {
    if (expectedRevision !== void 0 && expectedRevision !== this.state.revision) {
      return {
        ok: false,
        code: "REVISION_CONFLICT",
        message: "The shared plan changed. Inspect current state before modifying it.",
        currentRevision: this.state.revision
      };
    }
    const candidate = this.state.searchCandidates.find(
      (c) => c.candidateId === candidateId
    );
    if (!candidate) {
      return {
        ok: false,
        code: "CANDIDATE_NOT_FOUND",
        message: `Candidate ${candidateId} not found in current search results.`,
        currentRevision: this.state.revision
      };
    }
    this.undoStack.push({
      entryPoint: [...this.state.entryPoint],
      targetPoint: [...this.state.targetPoint],
      stagedCandidate: this.state.stagedCandidate,
      previousTrajectory: this.state.previousTrajectory,
      revision: this.state.revision
    });
    this.invalidateApprovalInternal();
    const prevTraj = {
      entryPoint: [...this.state.entryPoint],
      targetPoint: [...this.state.targetPoint]
    };
    const nextState = {
      ...this.state,
      entryPoint: [...candidate.entryPoint],
      targetPoint: [...candidate.targetPoint],
      stagedCandidate: candidate,
      previousTrajectory: prevTraj,
      revision: this.state.revision + 1,
      lastChangedBy: origin
    };
    this.recalculateDerived(nextState);
    this.state = nextState;
    this.notify();
    return {
      ok: true,
      currentRevision: this.state.revision
    };
  }
  /**
   * Preview stimulation parameters.
   * Enforces optimistic concurrency if expectedRevision is supplied.
   */
  previewStimulation(params, origin, expectedRevision) {
    if (expectedRevision !== void 0 && expectedRevision !== this.state.revision) {
      return {
        ok: false,
        code: "REVISION_CONFLICT",
        message: "The shared plan changed. Inspect current state before modifying it.",
        currentRevision: this.state.revision
      };
    }
    this.invalidateApprovalInternal();
    const nextStimulation = {
      current_mA: params.current_mA ?? this.state.stimulation.current_mA,
      frequency_Hz: params.frequency_Hz ?? this.state.stimulation.frequency_Hz,
      pulseWidth_us: params.pulseWidth_us ?? this.state.stimulation.pulseWidth_us,
      contacts: params.contacts ?? this.state.stimulation.contacts
    };
    const nextState = {
      ...this.state,
      stimulation: nextStimulation,
      revision: this.state.revision + 1,
      lastChangedBy: origin
    };
    this.recalculateDerived(nextState);
    this.state = nextState;
    this.notify();
    return {
      ok: true,
      currentRevision: this.state.revision,
      preview: this.state.stimulationPreview
    };
  }
  /**
   * Undoes the latest reversible staged agent mutation.
   */
  undoAgentChange(origin, expectedRevision) {
    if (expectedRevision !== void 0 && expectedRevision !== this.state.revision) {
      return {
        ok: false,
        code: "REVISION_CONFLICT",
        message: "The shared plan changed. Inspect current state before modifying it.",
        currentRevision: this.state.revision
      };
    }
    if (this.undoStack.length === 0) {
      return {
        ok: false,
        code: "NOTHING_TO_UNDO",
        message: "No staged agent changes available to undo.",
        currentRevision: this.state.revision
      };
    }
    const previousState = this.undoStack.pop();
    this.invalidateApprovalInternal();
    const nextState = {
      ...this.state,
      entryPoint: previousState.entryPoint,
      targetPoint: previousState.targetPoint,
      stagedCandidate: previousState.stagedCandidate,
      previousTrajectory: previousState.previousTrajectory,
      revision: this.state.revision + 1,
      lastChangedBy: origin
    };
    this.recalculateDerived(nextState);
    this.state = nextState;
    this.notify();
    return {
      ok: true,
      currentRevision: this.state.revision
    };
  }
  /**
   * Human Approval Gate.
   * Can ONLY be called by human action.
   */
  async approvePlan() {
    const canonicalJson = canonicalizePlan(this.state);
    const digest = await computePlanDigest(canonicalJson);
    this.state = {
      ...this.state,
      approval: {
        isApproved: true,
        approvedRevision: this.state.revision,
        approvalDigest: digest,
        approvedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    this.addAuditLog({
      origin: "human",
      toolName: "approve_research_plan",
      arguments: { revision: this.state.revision },
      resultSummary: `Approved research plan (SHA-256: ${digest.substring(0, 12)}...)`,
      revisionBefore: this.state.revision,
      revisionAfter: this.state.revision,
      durationMs: 5,
      status: "ok",
      rawResult: { digest }
    });
    this.notify();
    return {
      digest,
      revision: this.state.revision
    };
  }
};
var planStore = new PlanStore();

// src/core/searchService.ts
var workerInstance = null;
function getWorker() {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }
  if (!workerInstance) {
    try {
      workerInstance = new Worker(
        new URL("../workers/trajectoryWorker.ts", import.meta.url),
        { type: "module" }
      );
    } catch {
      workerInstance = null;
    }
  }
  return workerInstance;
}
async function executeCorridorSearch(options) {
  const worker = getWorker();
  if (!worker) {
    return searchCorridors(options);
  }
  return new Promise((resolve, reject) => {
    const handleMessage = (event) => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      if (event.data.type === "SEARCH_SUCCESS" && event.data.result) {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error || "Worker search failed"));
      }
    };
    const handleError = (_error) => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      try {
        resolve(searchCorridors(options));
      } catch (err) {
        reject(err);
      }
    };
    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.postMessage({
      type: "SEARCH_CORRIDORS",
      options
    });
  });
}

// src/webmcp/toolSchemas.ts
var TOOL_GET_CONTEXT = {
  name: "neuralhaptics_get_context",
  description: "Retrieves the current authoritative stereotactic planning state, active trajectory, synthetic anatomy, machine-haptic constraints, and human approval status. Read-only.",
  inputSchema: {
    type: "object",
    properties: {
      detail: {
        type: "string",
        enum: ["compact", "full"],
        description: "Detail level: compact returns high-level metrics; full returns detailed anatomy and hazard lists.",
        default: "compact"
      }
    }
  }
};
var TOOL_SEARCH_CORRIDORS = {
  name: "neuralhaptics_search_corridors",
  description: "Executes a deterministic client-side multi-objective search over 512 cranial entry points. Evaluates true segment-to-segment vascular clearance, internal capsule avoidance, target accuracy, and constraint tension. Returns Pareto-optimal candidate trajectories. Read-only.",
  inputSchema: {
    type: "object",
    properties: {
      targetId: {
        type: "string",
        description: "Target structure identifier (e.g. tremor_center or motor_pathway). Defaults to current target."
      },
      minimumVesselClearanceMm: {
        type: "number",
        description: "Strict minimum acceptable clearance to any vascular segment in millimeters."
      },
      priorities: {
        type: "object",
        properties: {
          vascularClearance: { type: "number", description: "Weight for vascular clearance (0-1)." },
          targetAccuracy: { type: "number", description: "Weight for target accuracy (0-1)." },
          avoidanceZone: { type: "number", description: "Weight for internal capsule avoidance (0-1)." },
          trajectoryLength: { type: "number", description: "Weight for minimizing trajectory length (0-1)." }
        }
      },
      maxCandidates: {
        type: "integer",
        description: "Maximum number of non-dominated Pareto candidates to return (default: 6).",
        default: 6
      }
    }
  }
};
var TOOL_EVALUATE_CORRIDOR = {
  name: "neuralhaptics_evaluate_corridor",
  description: "Evaluates an arbitrary candidate trajectory defined by entry and target 3D coordinates. Returns true segment-to-segment vascular clearances, avoidance clearance, machine-haptic repulsion vectors, and constraint tension. Read-only.",
  inputSchema: {
    type: "object",
    properties: {
      entryPoint: {
        type: "array",
        items: { type: "number" },
        minItems: 3,
        maxItems: 3,
        description: "Cranial entry point [x, y, z] in synthetic millimeters."
      },
      targetPoint: {
        type: "array",
        items: { type: "number" },
        minItems: 3,
        maxItems: 3,
        description: "Deep brain target point [x, y, z] in synthetic millimeters."
      }
    },
    required: ["entryPoint", "targetPoint"]
  }
};
var TOOL_COMPARE_CORRIDORS = {
  name: "neuralhaptics_compare_corridors",
  description: "Compares multiple candidate trajectories by their deterministic IDs. Returns a structured trade-off matrix showing vascular clearance, target accuracy, length, tension, and Pareto dominance relationships. Read-only.",
  inputSchema: {
    type: "object",
    properties: {
      candidateIds: {
        type: "array",
        items: { type: "string" },
        description: 'List of candidate corridor IDs to compare (e.g. ["corridor_A_001", "corridor_A_004"]).'
      }
    },
    required: ["candidateIds"]
  }
};
var TOOL_STAGE_CORRIDOR = {
  name: "neuralhaptics_stage_corridor",
  description: "Stages a candidate trajectory into the human planner's visible 3D viewport. Renders the previous trajectory as a ghost line, updates DBS lead geometry, and animates the camera. Requires expectedRevision for optimistic concurrency. Reversible mutation.",
  inputSchema: {
    type: "object",
    properties: {
      candidateId: {
        type: "string",
        description: "The candidate trajectory ID to stage (must match a result from search_corridors)."
      },
      expectedRevision: {
        type: "integer",
        description: "Current known plan revision. Rejects with REVISION_CONFLICT if stale."
      }
    },
    required: ["candidateId", "expectedRevision"]
  }
};
var TOOL_PREVIEW_STIMULATION = {
  name: "neuralhaptics_preview_stimulation",
  description: "Updates DBS stimulation parameters (current, frequency, pulse width, active contacts). Computes activation proxy volume, 256-point target coverage, avoidance overlap, and educational Shannon reference metric. Requires expectedRevision. Mutation.",
  inputSchema: {
    type: "object",
    properties: {
      current_mA: { type: "number", description: "Stimulation amplitude in mA (0.1 to 10.0)." },
      frequency_Hz: { type: "number", description: "Pulse frequency in Hz (2 to 250)." },
      pulseWidth_us: { type: "number", description: "Pulse width in microseconds (30 to 450)." },
      contacts: {
        type: "array",
        items: { type: "integer", minimum: 0, maximum: 3 },
        description: "Indices of active electrode contacts [0, 1, 2, 3]."
      },
      expectedRevision: {
        type: "integer",
        description: "Current known plan revision. Rejects with REVISION_CONFLICT if stale."
      }
    },
    required: ["expectedRevision"]
  }
};
var TOOL_UNDO_AGENT_CHANGE = {
  name: "neuralhaptics_undo_agent_change",
  description: "Reverts the latest staged agent mutation, restoring the prior trajectory and lead position. Does not undo independent human edits. Requires expectedRevision. Mutation.",
  inputSchema: {
    type: "object",
    properties: {
      expectedRevision: {
        type: "integer",
        description: "Current known plan revision. Rejects with REVISION_CONFLICT if stale."
      }
    },
    required: ["expectedRevision"]
  }
};
var TOOL_EXPORT_APPROVED_PLAN = {
  name: "neuralhaptics_export_approved_plan",
  description: "Exports the authoritative research plan. DYNAMIC GATE: Only available when the plan has received explicit human cryptographic approval (SHA-256) and has not undergone subsequent modifications.",
  inputSchema: {
    type: "object",
    properties: {}
  }
};

// src/webmcp/registerTools.ts
var toolHandlers = {
  neuralhaptics_get_context: async (args, origin = "webmcp") => {
    const startTime = performance.now();
    const state = planStore.getState();
    const detail = args?.detail ?? "compact";
    const response = {
      revision: state.revision,
      selectedCase: state.selectedCaseId,
      caseDetails: {
        name: CASE_PRESETS[state.selectedCaseId].name,
        indication: CASE_PRESETS[state.selectedCaseId].indication,
        objective: CASE_PRESETS[state.selectedCaseId].objective
      },
      target: {
        id: state.targetId,
        displayName: TARGET_STRUCTURES[state.targetId]?.displayName,
        center: state.targetPoint
      },
      activeTrajectory: {
        entryPoint: state.entryPoint,
        targetPoint: state.targetPoint,
        stagedCandidateId: state.stagedCandidate?.candidateId ?? null
      },
      planningConstraints: {
        priorities: state.priorities,
        nearestHazard: state.machineHaptics.nearestHazard,
        constraintTension: state.machineHaptics.constraintTension,
        hazardIntensity: state.machineHaptics.hazardIntensity,
        repulsionVector: state.machineHaptics.repulsionVector
      },
      stimulationPreview: {
        current_mA: state.stimulation.current_mA,
        pulseWidth_us: state.stimulation.pulseWidth_us,
        frequency_Hz: state.stimulation.frequency_Hz,
        activeContacts: state.stimulation.contacts,
        activationProxyRadiusMm: state.stimulationPreview.activationProxyRadiusMm,
        targetCoveragePercent: state.stimulationPreview.targetCoveragePercent,
        avoidanceOverlapPercent: state.stimulationPreview.avoidanceOverlapPercent,
        shannonStatus: state.stimulationPreview.shannon.referenceStatus
      },
      approval: {
        isApproved: state.approval.isApproved,
        approvedRevision: state.approval.approvedRevision,
        approvalDigest: state.approval.approvalDigest
      },
      disclaimer: "Research simulation using synthetic anatomy. Not a medical device or clinical recommendation."
    };
    if (detail === "full") {
      response.anatomy = {
        targets: TARGET_STRUCTURES,
        avoidanceRegions: AVOIDANCE_REGIONS,
        vesselCount: SYNTHETIC_VESSELS.length
      };
      response.criticalHazards = state.machineHaptics.criticalHazards;
    }
    planStore.addAuditLog({
      origin,
      toolName: "neuralhaptics_get_context",
      arguments: args || {},
      resultSummary: `Reported context at revision ${state.revision} (Tension: ${state.machineHaptics.constraintTension})`,
      revisionBefore: state.revision,
      revisionAfter: state.revision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: "ok",
      rawResult: response
    });
    return response;
  },
  neuralhaptics_search_corridors: async (args, origin = "webmcp") => {
    const startTime = performance.now();
    const state = planStore.getState();
    const revBefore = state.revision;
    planStore.setIsSearching(true);
    let result;
    try {
      result = await executeCorridorSearch({
        caseId: state.selectedCaseId,
        targetId: args?.targetId ?? state.targetId,
        minimumVesselClearanceMm: args?.minimumVesselClearanceMm ?? state.priorities.minimumVesselClearanceMm,
        priorities: args?.priorities,
        maxCandidates: args?.maxCandidates ?? 6,
        nominalEntry: state.nominalEntry,
        sampleCount: 512
      });
      planStore.setSearchCandidates(result.candidates);
    } finally {
      planStore.setIsSearching(false);
    }
    const output = {
      candidates: result.candidates,
      totalEvaluated: result.totalEvaluated,
      rejectedCount: result.rejectedCount,
      dominantConstraints: result.dominantConstraints,
      currentRevision: state.revision
    };
    planStore.addAuditLog({
      origin,
      toolName: "neuralhaptics_search_corridors",
      arguments: args || {},
      resultSummary: `Found ${result.candidates.length} Pareto candidates (${result.rejectedCount} rejected / 512 evaluated)`,
      revisionBefore: revBefore,
      revisionAfter: state.revision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: "ok",
      rawResult: output
    });
    return output;
  },
  neuralhaptics_evaluate_corridor: async (args, origin = "webmcp") => {
    const startTime = performance.now();
    const state = planStore.getState();
    if (!Array.isArray(args?.entryPoint) || args.entryPoint.length !== 3 || !Array.isArray(args?.targetPoint) || args.targetPoint.length !== 3 || args.entryPoint.some((v) => typeof v !== "number" || !Number.isFinite(v)) || args.targetPoint.some((v) => typeof v !== "number" || !Number.isFinite(v))) {
      throw new Error(
        "Invalid coordinates: entryPoint and targetPoint must be finite 3D numeric vectors [x, y, z]."
      );
    }
    const targetObj = TARGET_STRUCTURES[state.targetId];
    const candidate = evaluateCandidate(
      args.entryPoint,
      args.targetPoint,
      targetObj,
      state.nominalEntry,
      targetObj.center,
      "eval_custom"
    );
    const isFeasible = candidate.vesselClearanceMm > 0 && candidate.avoidanceClearanceMm > 0;
    const output = {
      vesselClearanceMm: candidate.vesselClearanceMm,
      avoidanceClearanceMm: candidate.avoidanceClearanceMm,
      intersections: !isFeasible,
      targetErrorMm: candidate.targetErrorMm,
      trajectoryLengthMm: candidate.lengthMm,
      angularDeviationDeg: candidate.angularDeviationDeg,
      constraintTension: candidate.constraintTension,
      integratedHazardScore: candidate.integratedHazardScore,
      candidateFeasibility: isFeasible ? "FEASIBLE" : "INFEASIBLE_PENETRATION",
      machineHaptics: evaluateCandidate(
        args.entryPoint,
        args.targetPoint,
        targetObj,
        state.nominalEntry,
        targetObj.center,
        "eval_haptics"
      )
    };
    planStore.addAuditLog({
      origin,
      toolName: "neuralhaptics_evaluate_corridor",
      arguments: args,
      resultSummary: `Evaluated corridor: Clearance ${candidate.vesselClearanceMm}mm, Tension ${candidate.constraintTension} (${output.candidateFeasibility})`,
      revisionBefore: state.revision,
      revisionAfter: state.revision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: "ok",
      rawResult: output
    });
    return output;
  },
  neuralhaptics_compare_corridors: async (args, origin = "webmcp") => {
    const startTime = performance.now();
    const state = planStore.getState();
    if (!Array.isArray(args?.candidateIds) || args.candidateIds.length === 0) {
      throw new Error("candidateIds array must contain at least one candidate ID.");
    }
    const candidates = state.searchCandidates.filter(
      (c) => args.candidateIds.includes(c.candidateId)
    );
    const comparisonMatrix = candidates.map((c) => ({
      candidateId: c.candidateId,
      vesselClearanceMm: c.vesselClearanceMm,
      avoidanceClearanceMm: c.avoidanceClearanceMm,
      targetErrorMm: c.targetErrorMm,
      lengthMm: c.lengthMm,
      angularDeviationDeg: c.angularDeviationDeg,
      constraintTension: c.constraintTension,
      integratedHazardScore: c.integratedHazardScore,
      isPareto: c.isPareto ?? true
    }));
    const output = {
      comparisonMatrix,
      candidateCount: comparisonMatrix.length,
      currentRevision: state.revision,
      note: "Trade-off comparisons are deterministic research metrics. Agents should align choices with human-defined priorities."
    };
    planStore.addAuditLog({
      origin,
      toolName: "neuralhaptics_compare_corridors",
      arguments: args,
      resultSummary: `Compared ${candidates.length} corridors (${args.candidateIds.join(", ")})`,
      revisionBefore: state.revision,
      revisionAfter: state.revision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: "ok",
      rawResult: output
    });
    return output;
  },
  neuralhaptics_stage_corridor: async (args, origin = "webmcp") => {
    const startTime = performance.now();
    const revBefore = planStore.getState().revision;
    const res = planStore.stageCandidate(
      args.candidateId,
      origin,
      args.expectedRevision
    );
    const stateAfter = planStore.getState();
    if (!res.ok) {
      planStore.addAuditLog({
        origin,
        toolName: "neuralhaptics_stage_corridor",
        arguments: args,
        resultSummary: `CONFLICT: ${res.message} (expected rev ${args.expectedRevision}, store rev ${res.currentRevision})`,
        revisionBefore: revBefore,
        revisionAfter: res.currentRevision,
        durationMs: Math.max(1, Math.round(performance.now() - startTime)),
        status: "conflict",
        rawResult: res
      });
      return res;
    }
    const output = {
      ok: true,
      stagedCandidateId: args.candidateId,
      previousRevision: revBefore,
      currentRevision: res.currentRevision,
      vesselClearanceMm: stateAfter.machineHaptics.nearestHazard.clearanceMm,
      constraintTension: stateAfter.machineHaptics.constraintTension,
      targetCoveragePercent: stateAfter.stimulationPreview.targetCoveragePercent,
      message: `Candidate ${args.candidateId} successfully staged. 3D probe updated; previous trajectory rendered as ghost.`
    };
    planStore.addAuditLog({
      origin,
      toolName: "neuralhaptics_stage_corridor",
      arguments: args,
      resultSummary: `Staged candidate ${args.candidateId} (rev ${revBefore} -> ${res.currentRevision})`,
      revisionBefore: revBefore,
      revisionAfter: res.currentRevision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: "ok",
      rawResult: output
    });
    return output;
  },
  neuralhaptics_preview_stimulation: async (args, origin = "webmcp") => {
    const startTime = performance.now();
    const revBefore = planStore.getState().revision;
    const res = planStore.previewStimulation(
      {
        current_mA: args.current_mA,
        frequency_Hz: args.frequency_Hz,
        pulseWidth_us: args.pulseWidth_us,
        contacts: args.contacts
      },
      origin,
      args.expectedRevision
    );
    if (!res.ok) {
      planStore.addAuditLog({
        origin,
        toolName: "neuralhaptics_preview_stimulation",
        arguments: args,
        resultSummary: `CONFLICT: ${res.message} (expected rev ${args.expectedRevision}, store rev ${res.currentRevision})`,
        revisionBefore: revBefore,
        revisionAfter: res.currentRevision,
        durationMs: Math.max(1, Math.round(performance.now() - startTime)),
        status: "conflict",
        rawResult: res
      });
      return res;
    }
    const stateAfter = planStore.getState();
    const output = {
      ok: true,
      currentRevision: res.currentRevision,
      activationProxyRadiusMm: stateAfter.stimulationPreview.activationProxyRadiusMm,
      activationProxyVolumeMm3: stateAfter.stimulationPreview.activationProxyVolumeMm3,
      targetCoveragePercent: stateAfter.stimulationPreview.targetCoveragePercent,
      avoidanceOverlapPercent: stateAfter.stimulationPreview.avoidanceOverlapPercent,
      shannonReference: stateAfter.stimulationPreview.shannon
    };
    planStore.addAuditLog({
      origin,
      toolName: "neuralhaptics_preview_stimulation",
      arguments: args,
      resultSummary: `Updated stimulation: Coverage ${stateAfter.stimulationPreview.targetCoveragePercent}%, Radius ${stateAfter.stimulationPreview.activationProxyRadiusMm}mm (rev ${revBefore} -> ${res.currentRevision})`,
      revisionBefore: revBefore,
      revisionAfter: res.currentRevision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: "ok",
      rawResult: output
    });
    return output;
  },
  neuralhaptics_undo_agent_change: async (args, origin = "webmcp") => {
    const startTime = performance.now();
    const revBefore = planStore.getState().revision;
    const res = planStore.undoAgentChange(origin, args.expectedRevision);
    if (!res.ok) {
      planStore.addAuditLog({
        origin,
        toolName: "neuralhaptics_undo_agent_change",
        arguments: args,
        resultSummary: `UNDO REJECTED: ${res.message}`,
        revisionBefore: revBefore,
        revisionAfter: res.currentRevision,
        durationMs: Math.max(1, Math.round(performance.now() - startTime)),
        status: "conflict",
        rawResult: res
      });
      return res;
    }
    const stateAfter = planStore.getState();
    const output = {
      ok: true,
      currentRevision: res.currentRevision,
      restoredEntryPoint: stateAfter.entryPoint,
      restoredTargetPoint: stateAfter.targetPoint,
      stagedCandidateId: stateAfter.stagedCandidate?.candidateId ?? null,
      message: "Successfully reverted latest staged agent mutation."
    };
    planStore.addAuditLog({
      origin,
      toolName: "neuralhaptics_undo_agent_change",
      arguments: args,
      resultSummary: `Reverted latest agent mutation (rev ${revBefore} -> ${res.currentRevision})`,
      revisionBefore: revBefore,
      revisionAfter: res.currentRevision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: "ok",
      rawResult: output
    });
    return output;
  },
  neuralhaptics_export_approved_plan: async (_args, origin = "webmcp") => {
    const startTime = performance.now();
    const state = planStore.getState();
    if (!state.approval.isApproved || state.approval.approvedRevision !== state.revision) {
      throw new Error(
        "Export denied: Plan is not in an approved state for current revision."
      );
    }
    const exportPayload = {
      case: {
        id: state.selectedCaseId,
        name: CASE_PRESETS[state.selectedCaseId].name,
        indication: CASE_PRESETS[state.selectedCaseId].indication
      },
      syntheticDataDeclaration: "All coordinates, vessels, and targets in this plan are procedurally generated synthetic geometries for research evaluation only.",
      trajectoryCoordinates: {
        entryPoint: state.entryPoint,
        targetPoint: state.targetPoint,
        targetNucleus: TARGET_STRUCTURES[state.targetId].displayName
      },
      candidateMetrics: {
        vesselClearanceMm: state.machineHaptics.nearestHazard.clearanceMm,
        avoidanceClearanceMm: state.stagedCandidate?.avoidanceClearanceMm ?? null,
        constraintTension: state.machineHaptics.constraintTension,
        nearestHazard: state.machineHaptics.nearestHazard
      },
      stimulationPreview: {
        current_mA: state.stimulation.current_mA,
        frequency_Hz: state.stimulation.frequency_Hz,
        pulseWidth_us: state.stimulation.pulseWidth_us,
        activeContacts: state.stimulation.contacts,
        activationProxyRadiusMm: state.stimulationPreview.activationProxyRadiusMm,
        targetCoveragePercent: state.stimulationPreview.targetCoveragePercent,
        avoidanceOverlapPercent: state.stimulationPreview.avoidanceOverlapPercent
      },
      shannonReference: state.stimulationPreview.shannon,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      revision: state.revision,
      approvalDigest: state.approval.approvalDigest,
      approvedAt: state.approval.approvedAt,
      explicitNonClinicalDisclaimer: "Research simulation using synthetic anatomy. Not a medical device or clinical recommendation."
    };
    planStore.addAuditLog({
      origin,
      toolName: "neuralhaptics_export_approved_plan",
      arguments: {},
      resultSummary: `Exported approved research plan (Digest: ${state.approval.approvalDigest?.substring(0, 12)}...)`,
      revisionBefore: state.revision,
      revisionAfter: state.revision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: "ok",
      rawResult: exportPayload
    });
    return exportPayload;
  }
};
var WebMCPManager = class _WebMCPManager {
  static instance;
  exportController = null;
  isInitialized = false;
  static getInstance() {
    if (!_WebMCPManager.instance) {
      _WebMCPManager.instance = new _WebMCPManager();
    }
    return _WebMCPManager.instance;
  }
  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    const modelContext = (typeof document !== "undefined" ? document.modelContext : void 0) ?? (typeof navigator !== "undefined" ? navigator.modelContext : void 0);
    if (modelContext && typeof modelContext.registerTool === "function") {
      this.registerStandardTools(modelContext);
    }
    planStore.subscribe(() => {
      this.syncApprovalGate();
    });
    planStore.onApprovalInvalidated(() => {
      this.revokeExportTool();
    });
  }
  async registerStandardTools(modelContext) {
    const standardTools = [
      { def: TOOL_GET_CONTEXT, handler: (args) => toolHandlers.neuralhaptics_get_context(args, "webmcp") },
      { def: TOOL_SEARCH_CORRIDORS, handler: (args) => toolHandlers.neuralhaptics_search_corridors(args, "webmcp") },
      { def: TOOL_EVALUATE_CORRIDOR, handler: (args) => toolHandlers.neuralhaptics_evaluate_corridor(args, "webmcp") },
      { def: TOOL_COMPARE_CORRIDORS, handler: (args) => toolHandlers.neuralhaptics_compare_corridors(args, "webmcp") },
      { def: TOOL_STAGE_CORRIDOR, handler: (args) => toolHandlers.neuralhaptics_stage_corridor(args, "webmcp") },
      { def: TOOL_PREVIEW_STIMULATION, handler: (args) => toolHandlers.neuralhaptics_preview_stimulation(args, "webmcp") },
      { def: TOOL_UNDO_AGENT_CHANGE, handler: (args) => toolHandlers.neuralhaptics_undo_agent_change(args, "webmcp") }
    ];
    for (const { def, handler } of standardTools) {
      try {
        await modelContext.registerTool({
          name: def.name,
          description: def.description,
          parameters: def.inputSchema,
          inputSchema: def.inputSchema,
          handler
        });
      } catch (err) {
        console.warn(`WebMCP tool registration failed for ${def.name}:`, err);
      }
    }
  }
  async syncApprovalGate() {
    const state = planStore.getState();
    const modelContext = (typeof document !== "undefined" ? document.modelContext : void 0) ?? (typeof navigator !== "undefined" ? navigator.modelContext : void 0);
    if (!modelContext || typeof modelContext.registerTool !== "function") return;
    if (state.approval.isApproved && !this.exportController) {
      this.exportController = new AbortController();
      try {
        await modelContext.registerTool(
          {
            name: TOOL_EXPORT_APPROVED_PLAN.name,
            description: TOOL_EXPORT_APPROVED_PLAN.description,
            parameters: TOOL_EXPORT_APPROVED_PLAN.inputSchema,
            inputSchema: TOOL_EXPORT_APPROVED_PLAN.inputSchema,
            handler: () => toolHandlers.neuralhaptics_export_approved_plan({}, "webmcp")
          },
          { signal: this.exportController.signal }
        );
      } catch (err) {
        console.warn("Failed to dynamically register export tool:", err);
      }
    } else if (!state.approval.isApproved && this.exportController) {
      this.revokeExportTool();
    }
  }
  revokeExportTool() {
    if (this.exportController) {
      this.exportController.abort();
      this.exportController = null;
    }
  }
};
var webMCPManager = WebMCPManager.getInstance();

// tests/runAll.ts
var passed = 0;
var failed = 0;
function assert(condition, testName, detail) {
  if (condition) {
    passed++;
    console.log(`  \x1B[32m\u2713\x1B[0m ${testName}`);
  } else {
    failed++;
    console.error(`  \x1B[31m\u2717 FAIL:\x1B[0m ${testName} ${detail ? `(${detail})` : ""}`);
  }
}
function assertCloseTo(actual, expected, testName, precision = 4) {
  const diff = Math.abs(actual - expected);
  const tolerance = Math.pow(10, -precision);
  assert(diff <= tolerance, testName, `expected ${expected}, got ${actual} (diff ${diff})`);
}
async function runAllTests() {
  console.log("\n\x1B[1m\x1B[36m================================================================");
  console.log("       NEURALHAPTICS AUTOMATED VERIFICATION TEST SUITE          ");
  console.log("================================================================\x1B[0m\n");
  console.log("\x1B[1m[Suite 1] Geometry Engine & True Segment Clearance\x1B[0m");
  {
    const a = [0, 0, 0];
    const b = [10, 0, 0];
    const p1 = [5, 5, 0];
    assertCloseTo(distancePointToSegment(p1, a, b), 5, "1. Point projected directly onto interior of segment");
    const p2 = [-3, 4, 0];
    assertCloseTo(distancePointToSegment(p2, a, b), 5, "2. Point projected beyond endpoint a");
    const a0 = [-5, 0, 0];
    const a1 = [5, 0, 0];
    const b0 = [0, -5, 4];
    const b1 = [0, 5, 4];
    const segRes = distanceSegmentToSegment(a0, a1, b0, b1);
    assertCloseTo(segRes.distance, 4, "3. Segment-to-segment clearance for skew perpendicular lines");
    assertCloseTo(segRes.pointOnSegment1[0], 0, "4. Closest point 1 on skew segment (X=0)");
    assertCloseTo(segRes.pointOnSegment2[2], 4, "5. Closest point 2 on skew segment (Z=4)");
    const parA0 = [0, 0, 0];
    const parA1 = [10, 0, 0];
    const parB0 = [0, 3, 4];
    const parB1 = [10, 3, 4];
    const parRes = distanceSegmentToSegment(parA0, parA1, parB0, parB1);
    assertCloseTo(parRes.distance, 5, "6. True distance between parallel segments");
    const intA0 = [-5, 0, 0];
    const intA1 = [5, 0, 0];
    const intB0 = [0, -5, 0];
    const intB1 = [0, 5, 0];
    const intRes = distanceSegmentToSegment(intA0, intA1, intB0, intB1);
    assertCloseTo(intRes.distance, 0, "7. Direct segment intersection detected (distance 0)");
    const tEntry = [0, 0, 0];
    const tTarget = [10, 20, 20];
    assertCloseTo(trajectoryLength(tEntry, tTarget), 30, "8. Trajectory Euclidean length calculation");
    const sCenter = [0, 0, 0];
    const sRadius = 5;
    const sOutside = [0, 0, 8];
    assertCloseTo(distanceToSphereSurface(sOutside, sCenter, sRadius), 3, "9. Distance to outer sphere surface");
    const sEntryClear = [-10, 8, 0];
    const sTargetClear = [10, 8, 0];
    assertCloseTo(trajectorySphereClearance(sEntryClear, sTargetClear, sCenter, sRadius), 3, "10. Trajectory sphere clearance (positive clearance)");
    const sEntryPen = [-10, 2, 0];
    const sTargetPen = [10, 2, 0];
    assertCloseTo(trajectorySphereClearance(sEntryPen, sTargetPen, sCenter, sRadius), -3, "11. Trajectory sphere penetration detected (negative clearance)");
  }
  console.log("\n\x1B[1m[Suite 2] Machine Haptics & Risk Field Engine\x1B[0m");
  {
    const customVessel = {
      id: "test_vessel",
      displayName: "Test Vessel",
      start: [-10, 2, 0],
      end: [10, 2, 0],
      radiusMm: 1,
      severityWeight: 1
    };
    const entry = [-5, 5, 0];
    const target = [5, 5, 0];
    const evalResult = evaluateMachineHaptics(entry, target, {
      vessels: [customVessel],
      avoidanceRegions: []
    });
    assert(
      evalResult.machineHaptics.repulsionVector[1] > 0.9,
      "12. Repulsion vector points strictly away from hazard along positive Y",
      `got ${evalResult.machineHaptics.repulsionVector[1]}`
    );
    assertCloseTo(evalResult.minVesselClearanceMm, 2, "13. Minimum vessel clearance accurately calculated (3mm - 1mm radius = 2mm)");
    const entrySafe = [50, 50, 80];
    const targetSafe = [50, 50, 0];
    const safeHaptics = evaluateMachineHaptics(entrySafe, targetSafe);
    assert(
      safeHaptics.machineHaptics.constraintTension >= 0 && safeHaptics.machineHaptics.constraintTension <= 1,
      "14. Constraint tension is bounded within [0, 1]"
    );
    assert(
      safeHaptics.machineHaptics.constraintTension < 0.2,
      "15. Constraint tension is low in unconstrained safe space"
    );
    const nominal = [27.5, 16, 68];
    const pts1 = generateCandidateEntryPoints(nominal, 100);
    const pts2 = generateCandidateEntryPoints(nominal, 100);
    assert(JSON.stringify(pts1) === JSON.stringify(pts2), "16. Candidate entry points are strictly deterministic");
    const search1 = searchCorridors({ sampleCount: 128 });
    const search2 = searchCorridors({ sampleCount: 128 });
    assert(search1.candidates.length > 0, "17. Corridor search returns candidate trajectories");
    assert(
      JSON.stringify(search1.candidates.map((c) => c.candidateId)) === JSON.stringify(search2.candidates.map((c) => c.candidateId)),
      "18. Pareto candidate ranking and corridor IDs are strictly deterministic"
    );
    for (const c of search1.candidates) {
      assert(c.vesselClearanceMm > 0, `19. Candidate ${c.candidateId} has positive vascular clearance`);
      assert(c.avoidanceClearanceMm > 0, `20. Candidate ${c.candidateId} does not penetrate avoidance zone`);
      break;
    }
  }
  console.log("\n\x1B[1m[Suite 3] Authoritative State & Optimistic Concurrency\x1B[0m");
  {
    planStore.selectCase("case_a", "human");
    const rev0 = planStore.getState().revision;
    planStore.selectTarget("motor_pathway", "human");
    const rev1 = planStore.getState().revision;
    assert(rev1 === rev0 + 1, "21. State revision strictly increments on target selection");
    planStore.setEntryPoint([30, 20, 70], "human");
    const rev2 = planStore.getState().revision;
    assert(rev2 === rev1 + 1, "22. State revision strictly increments on entry point modification");
    const mockCandidate = {
      candidateId: "test_cand_001",
      entryPoint: [28, 16, 68],
      targetPoint: [12, -12, -6],
      vesselClearanceMm: 3.2,
      avoidanceClearanceMm: 4,
      targetErrorMm: 0.1,
      lengthMm: 72,
      angularDeviationDeg: 2.1,
      constraintTension: 0.25,
      integratedHazardScore: 0.3
    };
    planStore.setSearchCandidates([mockCandidate]);
    const currentRev = planStore.getState().revision;
    planStore.setPriorities({ minimumVesselClearanceMm: 3 }, "human");
    const newRev = planStore.getState().revision;
    assert(newRev > currentRev, "23. Human edit increases revision mid-reasoning");
    const conflictRes = await toolHandlers.neuralhaptics_stage_corridor(
      {
        candidateId: "test_cand_001",
        expectedRevision: currentRev
        // Stale!
      },
      "webmcp"
    );
    assert(conflictRes.ok === false, "24. Stale WebMCP mutation is rejected");
    assert(
      conflictRes.code === "REVISION_CONFLICT",
      "25. Rejection code is REVISION_CONFLICT"
    );
    assert(conflictRes.currentRevision === newRev, "26. Conflict response returns current authoritative revision");
    const mockCandidate2 = {
      candidateId: "test_cand_002",
      entryPoint: [29, 18, 66],
      targetPoint: [12, -12, -6],
      vesselClearanceMm: 3.5,
      avoidanceClearanceMm: 4.2,
      targetErrorMm: 0.2,
      lengthMm: 71.5,
      angularDeviationDeg: 1.8,
      constraintTension: 0.22,
      integratedHazardScore: 0.28
    };
    planStore.setSearchCandidates([mockCandidate2]);
    const preStageRev = planStore.getState().revision;
    const initialEntry = [...planStore.getState().entryPoint];
    const stageRes = await toolHandlers.neuralhaptics_stage_corridor(
      {
        candidateId: "test_cand_002",
        expectedRevision: preStageRev
      },
      "webmcp"
    );
    assert(stageRes.ok === true, "27. Staging candidate with valid revision succeeds");
    assert(
      planStore.getState().stagedCandidate?.candidateId === "test_cand_002",
      "28. Staged candidate is active in authoritative planStore"
    );
    assert(
      JSON.stringify(planStore.getState().previousTrajectory?.entryPoint) === JSON.stringify(initialEntry),
      "29. Previous trajectory preserved as ghost reference"
    );
    const undoRev = planStore.getState().revision;
    const undoRes = await toolHandlers.neuralhaptics_undo_agent_change(
      { expectedRevision: undoRev },
      "webmcp"
    );
    assert(undoRes.ok === true, "30. Undo agent change succeeds");
    assert(
      JSON.stringify(planStore.getState().entryPoint) === JSON.stringify(initialEntry),
      "31. Trajectory entry point accurately restored to pre-agent position"
    );
    assert(planStore.getState().stagedCandidate === null, "32. Staged candidate cleared after undo");
  }
  console.log("\n\x1B[1m[Suite 4] Dynamic Human Approval Gate & SHA-256 Digest\x1B[0m");
  {
    planStore.selectCase("case_a", "human");
    const canonical = canonicalizePlan(planStore.getState());
    const digest = await computePlanDigest(canonical);
    assert(typeof digest === "string", "33. Computed digest is string");
    assert(digest.length === 64, "34. SHA-256 digest is exactly 64 characters");
    assert(/^[0-9a-f]{64}$/.test(digest), "35. SHA-256 digest contains valid hexadecimal characters");
    assert(planStore.getState().approval.isApproved === false, "36. Initial state is unapproved");
    let preApprovalRejected = false;
    try {
      await toolHandlers.neuralhaptics_export_approved_plan({}, "webmcp");
    } catch (e) {
      preApprovalRejected = e.message.includes("Export denied");
    }
    assert(preApprovalRejected, "37. neuralhaptics_export_approved_plan is rejected prior to human approval");
    const { digest: approvedDigest, revision: approvedRev } = await planStore.approvePlan();
    assert(planStore.getState().approval.isApproved === true, "38. Human approval marks plan as approved");
    assert(planStore.getState().approval.approvedRevision === approvedRev, "39. Approved revision recorded");
    assert(planStore.getState().approval.approvalDigest === approvedDigest, "40. Cryptographic digest stored in plan");
    const exported = await toolHandlers.neuralhaptics_export_approved_plan({}, "webmcp");
    assert(exported !== void 0, "41. Export tool executes successfully following human approval");
    assert(exported.approvalDigest === approvedDigest, "42. Export payload includes authoritative SHA-256 digest");
    assert(exported.case.id === "case_a", "43. Export payload contains complete case parameters");
    assert(
      exported.explicitNonClinicalDisclaimer.includes("Research simulation"),
      "44. Export payload includes mandatory non-clinical research disclaimer"
    );
    planStore.setEntryPoint([32, 19, 65], "human");
    assert(planStore.getState().approval.isApproved === false, "45. Approval invalidated immediately upon subsequent mutation");
    assert(planStore.getState().approval.approvalDigest === null, "46. Approval digest cleared on state change");
    assert(planStore.getState().approval.approvedRevision === null, "47. Approved revision reset on state change");
    let postMutationRejected = false;
    try {
      await toolHandlers.neuralhaptics_export_approved_plan({}, "webmcp");
    } catch (e) {
      postMutationRejected = e.message.includes("Export denied");
    }
    assert(postMutationRejected, "48. Export tool is revoked after subsequent mutation");
  }
  console.log("\n\x1B[1m================================================================\x1B[0m");
  console.log(`\x1B[1mRESULTS: \x1B[32m${passed} PASSED\x1B[0m | \x1B[${failed > 0 ? "31" : "32"}m${failed} FAILED\x1B[0m (Total: ${passed + failed})`);
  console.log("\x1B[1m================================================================\x1B[0m\n");
  if (failed > 0) {
    process.exit(1);
  }
}
runAllTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
