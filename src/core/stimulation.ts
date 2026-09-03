import {
  Vector3Tuple,
  StimulationParams,
  StimulationPreview,
  ShannonMetric,
} from './types';
import { distance, normalize, sub, add, scale, clamp } from './geometry';
import { TARGET_STRUCTURES, AVOIDANCE_REGIONS } from './brainData';

const SHANNON_REFERENCE_BOUNDARY = 1.75;
const DEFAULT_CONTACT_AREA_CM2 = 0.06; // Standard 1.5mm cylindrical DBS band contact area
const CONTACT_SPACING_MM = 2.0; // Distance between successive contact centers
const SAMPLE_POINTS_PER_TARGET = 256;

/**
 * Deterministic spherical sample points inside a sphere of given radius and center.
 * Uses a golden-ratio spiral with cubic-root radial distribution for uniform volumetric density.
 */
export function generateSphericalLattice(
  center: Vector3Tuple,
  radius: number,
  count: number = SAMPLE_POINTS_PER_TARGET
): Vector3Tuple[] {
  const points: Vector3Tuple[] = [];
  const phi = (1 + Math.sqrt(5)) / 2; // golden ratio

  for (let i = 0; i < count; i++) {
    // Uniform volumetric distribution: r proportional to (i/count)^(1/3)
    const rFraction = Math.cbrt((i + 0.5) / count);
    const r = radius * rFraction;

    const theta = 2 * Math.PI * i / phi;
    const zNorm = 1 - (2 * (i + 0.5)) / count;
    const sinPhiVal = Math.sqrt(Math.max(0, 1 - zNorm * zNorm));

    const x = center[0] + r * sinPhiVal * Math.cos(theta);
    const y = center[1] + r * sinPhiVal * Math.sin(theta);
    const z = center[2] + r * zNorm;

    points.push([
      Number(x.toFixed(3)),
      Number(y.toFixed(3)),
      Number(z.toFixed(3)),
    ]);
  }
  return points;
}

// Pre-cached sample points for deterministic reproducible evaluation
const CACHED_TARGET_SAMPLES: Record<string, Vector3Tuple[]> = {
  tremor_center: generateSphericalLattice(
    TARGET_STRUCTURES['tremor_center'].center,
    TARGET_STRUCTURES['tremor_center'].radius,
    SAMPLE_POINTS_PER_TARGET
  ),
  motor_pathway: generateSphericalLattice(
    TARGET_STRUCTURES['motor_pathway'].center,
    TARGET_STRUCTURES['motor_pathway'].radius,
    SAMPLE_POINTS_PER_TARGET
  ),
};

const CACHED_AVOIDANCE_SAMPLES: Record<string, Vector3Tuple[]> = {
  speech_boundary: generateSphericalLattice(
    AVOIDANCE_REGIONS[0].center,
    AVOIDANCE_REGIONS[0].radius,
    SAMPLE_POINTS_PER_TARGET
  ),
};

/**
 * Computes deterministic activation proxy radius and volume.
 * Explicitly named activation proxy — NOT a medically validated VTA.
 */
export function computeActivationProxy(
  current_mA: number,
  pulseWidth_us: number
): { activationProxyRadiusMm: number; activationProxyVolumeMm3: number } {
  // r_mm = clamp(0.25 * sqrt(current_mA * pulseWidth_us), 0.8, 6.0)
  const rawRadius = 0.25 * Math.sqrt(Math.max(0, current_mA * pulseWidth_us));
  const radius = Number(clamp(rawRadius, 0.8, 6.0).toFixed(2));
  const volume = Number(((4 / 3) * Math.PI * Math.pow(radius, 3)).toFixed(2));

  return {
    activationProxyRadiusMm: radius,
    activationProxyVolumeMm3: volume,
  };
}

/**
 * Computes 3D positions for the 4 electrode contact centers along the trajectory.
 * Contact 0 is at targetPoint, contact 1..3 step back toward entryPoint.
 */
export function computeContactPositions(
  entryPoint: Vector3Tuple,
  targetPoint: Vector3Tuple
): Vector3Tuple[] {
  const dir = normalize(sub(entryPoint, targetPoint));
  return [0, 1, 2, 3].map((index) => {
    return add(targetPoint, scale(dir, index * CONTACT_SPACING_MM));
  });
}

/**
 * Computes the educational Shannon relationship.
 * Never claims clinical validity or guaranteed tissue safety.
 */
export function computeShannonMetric(
  current_mA: number,
  pulseWidth_us: number,
  contactArea_cm2: number = DEFAULT_CONTACT_AREA_CM2
): ShannonMetric {
  const safeCurrent = Math.max(0.01, current_mA);
  const safePW = Math.max(1, pulseWidth_us);

  // Q_uC = current_mA * pulseWidth_us / 1000
  const q_uC = (safeCurrent * safePW) / 1000;
  const chargeDensity_uC_cm2 = q_uC / contactArea_cm2;

  // k = log10(Q_uC) + log10(chargeDensity_uC_cm2)
  const k = Math.log10(q_uC) + Math.log10(chargeDensity_uC_cm2);

  const referenceStatus =
    k <= SHANNON_REFERENCE_BOUNDARY
      ? 'WITHIN_REFERENCE_ENVELOPE'
      : 'ABOVE_REFERENCE_ENVELOPE';

  return {
    q_uC: Number(q_uC.toFixed(4)),
    chargeDensity_uC_cm2: Number(chargeDensity_uC_cm2.toFixed(2)),
    k: Number(k.toFixed(3)),
    referenceBoundary: SHANNON_REFERENCE_BOUNDARY,
    referenceStatus,
    clinicalValidity: false,
  };
}

/**
 * Computes full stimulation preview metrics including target coverage and avoidance overlap.
 */
export function evaluateStimulationPreview(
  stimulation: StimulationParams,
  entryPoint: Vector3Tuple,
  targetPoint: Vector3Tuple,
  targetId: string = 'tremor_center',
  avoidanceRegionId: string = 'speech_boundary'
): StimulationPreview {
  const { activationProxyRadiusMm, activationProxyVolumeMm3 } = computeActivationProxy(
    stimulation.current_mA,
    stimulation.pulseWidth_us
  );

  const contactPositions = computeContactPositions(entryPoint, targetPoint);
  const activeContactPositions = stimulation.contacts
    .filter((idx) => idx >= 0 && idx < contactPositions.length)
    .map((idx) => contactPositions[idx]);

  // Target Coverage calculation
  const targetSamples =
    CACHED_TARGET_SAMPLES[targetId] ??
    generateSphericalLattice(
      (TARGET_STRUCTURES[targetId] ?? TARGET_STRUCTURES['tremor_center']).center,
      (TARGET_STRUCTURES[targetId] ?? TARGET_STRUCTURES['tremor_center']).radius
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
    ((targetCoveredCount / targetSamples.length) * 100).toFixed(1)
  );

  // Avoidance Overlap calculation
  const avoidanceSamples =
    CACHED_AVOIDANCE_SAMPLES[avoidanceRegionId] ??
    generateSphericalLattice(
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
    ((avoidanceOverlapCount / avoidanceSamples.length) * 100).toFixed(1)
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
    shannon,
  };
}
