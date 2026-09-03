import { PlanState } from './types';

/**
 * Canonically serializes the plan state for deterministic cryptographic hashing.
 * Sorts all object keys lexicographically and strips ephemeral UI state (e.g. hoveredCandidateId, auditLog).
 */
export function canonicalizePlan(plan: PlanState): string {
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
      contacts: [...plan.stimulation.contacts].sort((a, b) => a - b),
    },
    metrics: {
      activationProxyRadiusMm: plan.stimulationPreview.activationProxyRadiusMm,
      targetCoveragePercent: plan.stimulationPreview.targetCoveragePercent,
      avoidanceOverlapPercent: plan.stimulationPreview.avoidanceOverlapPercent,
      vesselClearanceMm: plan.machineHaptics.nearestHazard.clearanceMm,
      constraintTension: plan.machineHaptics.constraintTension,
      shannonK: plan.stimulationPreview.shannon.k,
    },
    priorities: {
      minimumVesselClearanceMm: plan.priorities.minimumVesselClearanceMm,
      vascularClearance: plan.priorities.vascularClearance,
      targetAccuracy: plan.priorities.targetAccuracy,
      avoidanceZone: plan.priorities.avoidanceZone,
      trajectoryLength: plan.priorities.trajectoryLength,
    },
    revision: plan.revision,
    disclaimer:
      'Research simulation using synthetic anatomy. Not a medical device or clinical recommendation.',
  };

  return JSON.stringify(payload, Object.keys(payload).sort());
}

/**
 * Computes a SHA-256 hexadecimal digest of canonical plan JSON using Web Crypto.
 */
export async function computePlanDigest(canonicalJson: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalJson);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback pure-JS SHA-256 for environments lacking SubtleCrypto
  return fallbackSha256(canonicalJson);
}

/**
 * Pure JS SHA-256 fallback for testing or restricted runtimes.
 */
function fallbackSha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0;
  let j = 0;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 =
        hash[7] +
        (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) +
        ch +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
      const temp2 =
        (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) +
        maj;

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (8 * b)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}
