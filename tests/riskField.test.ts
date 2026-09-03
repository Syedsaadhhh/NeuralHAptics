import { describe, it, expect } from 'vitest';
import { evaluateMachineHaptics } from '../src/core/riskField';
import { searchCorridors, generateCandidateEntryPoints } from '../src/core/candidateSearch';
import { Vector3Tuple, VesselSegment } from '../src/core/types';

describe('Machine Haptics & Risk Field Engine', () => {
  it('calculates repulsion vector pointing strictly away from the nearest hazard', () => {
    // Vessel along X axis at Y=2, Z=0 with radius 1.0mm
    const customVessel: VesselSegment = {
      id: 'test_vessel',
      displayName: 'Test Vessel',
      start: [-10, 2, 0],
      end: [10, 2, 0],
      radiusMm: 1.0,
      severityWeight: 1.0,
    };

    // Trajectory at Y=5 (above vessel in Y direction)
    const entry: Vector3Tuple = [-5, 5, 0];
    const target: Vector3Tuple = [5, 5, 0];

    const evalResult = evaluateMachineHaptics(entry, target, {
      vessels: [customVessel],
      avoidanceRegions: [],
    });

    // Vessel is at Y=2, trajectory is at Y=5 -> Repulsion vector MUST point along positive Y (away from vessel)
    expect(evalResult.machineHaptics.repulsionVector[1]).toBeGreaterThan(0.9);
    expect(evalResult.machineHaptics.repulsionVector[0]).toBeCloseTo(0, 2);
    expect(evalResult.machineHaptics.repulsionVector[2]).toBeCloseTo(0, 2);
    expect(evalResult.minVesselClearanceMm).toBeCloseTo(2.0); // 3.0 center-to-center - 1.0 radius = 2.0
  });

  it('computes constraint tension normalized between 0 and 1', () => {
    const entrySafe: Vector3Tuple = [50, 50, 80];
    const targetSafe: Vector3Tuple = [50, 50, 0];

    const safeResult = evaluateMachineHaptics(entrySafe, targetSafe);
    expect(safeResult.machineHaptics.constraintTension).toBeGreaterThanOrEqual(0);
    expect(safeResult.machineHaptics.constraintTension).toBeLessThanOrEqual(1.0);
    // Far from hazards: tension should be very low
    expect(safeResult.machineHaptics.constraintTension).toBeLessThan(0.2);
  });

  it('generates deterministic candidate entry points and orders Pareto candidates', () => {
    const nominal: Vector3Tuple = [27.5, 16.0, 68.0];
    const pts1 = generateCandidateEntryPoints(nominal, 100);
    const pts2 = generateCandidateEntryPoints(nominal, 100);

    // Exact determinism
    expect(pts1).toEqual(pts2);

    const search1 = searchCorridors({ sampleCount: 128 });
    const search2 = searchCorridors({ sampleCount: 128 });

    expect(search1.candidates.length).toBeGreaterThan(0);
    expect(search1.candidates.map((c) => c.candidateId)).toEqual(
      search2.candidates.map((c) => c.candidateId)
    );
  });

  it('rejects candidates that intersect vessels or avoidance boundaries', () => {
    const search = searchCorridors({
      sampleCount: 64,
    });

    // Each returned candidate MUST have positive clearances
    for (const cand of search.candidates) {
      expect(cand.vesselClearanceMm).toBeGreaterThan(0);
      expect(cand.avoidanceClearanceMm).toBeGreaterThan(0);
    }
    expect(search.rejectedCount).toBeGreaterThanOrEqual(0);
  });
});
