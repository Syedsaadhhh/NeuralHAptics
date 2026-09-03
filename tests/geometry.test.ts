import { describe, it, expect } from 'vitest';
import {
  distanceSegmentToSegment,
  closestPointOnSegment,
  distancePointToSegment,
  trajectoryLength,
  distanceToSphereSurface,
  trajectorySphereClearance,
} from '../src/core/geometry';
import { Vector3Tuple } from '../src/core/types';

describe('Geometry Engine', () => {
  it('calculates point-to-segment distance correctly', () => {
    const a: Vector3Tuple = [0, 0, 0];
    const b: Vector3Tuple = [10, 0, 0];

    // Point projected directly onto the interior of the segment
    const p1: Vector3Tuple = [5, 5, 0];
    expect(distancePointOnSegment(p1, a, b)).toBeCloseTo(5.0);

    // Point projected beyond endpoint a
    const p2: Vector3Tuple = [-3, 4, 0];
    expect(distancePointToSegment(p2, a, b)).toBeCloseTo(5.0);

    // Point projected beyond endpoint b
    const p3: Vector3Tuple = [14, 3, 0];
    expect(distancePointToSegment(p3, a, b)).toBeCloseTo(5.0);
  });

  it('calculates true segment-to-segment clearance for skew perpendicular lines', () => {
    // Segment 1 along X axis at Z=0
    const a0: Vector3Tuple = [-5, 0, 0];
    const a1: Vector3Tuple = [5, 0, 0];

    // Segment 2 along Y axis at Z=4
    const b0: Vector3Tuple = [0, -5, 4];
    const b1: Vector3Tuple = [0, 5, 4];

    const result = distanceSegmentToSegment(a0, a1, b0, b1);
    expect(result.distance).toBeCloseTo(4.0, 5);
    expect(result.pointOnSegment1[0]).toBeCloseTo(0);
    expect(result.pointOnSegment1[1]).toBeCloseTo(0);
    expect(result.pointOnSegment1[2]).toBeCloseTo(0);

    expect(result.pointOnSegment2[0]).toBeCloseTo(0);
    expect(result.pointOnSegment2[1]).toBeCloseTo(0);
    expect(result.pointOnSegment2[2]).toBeCloseTo(4);
  });

  it('calculates true segment-to-segment distance for parallel segments', () => {
    const a0: Vector3Tuple = [0, 0, 0];
    const a1: Vector3Tuple = [10, 0, 0];

    const b0: Vector3Tuple = [0, 3, 4];
    const b1: Vector3Tuple = [10, 3, 4];

    // Separation is sqrt(3^2 + 4^2) = 5
    const result = distanceSegmentToSegment(a0, a1, b0, b1);
    expect(result.distance).toBeCloseTo(5.0, 4);
  });

  it('detects direct intersection of segments (distance 0)', () => {
    const a0: Vector3Tuple = [-5, 0, 0];
    const a1: Vector3Tuple = [5, 0, 0];

    const b0: Vector3Tuple = [0, -5, 0];
    const b1: Vector3Tuple = [0, 5, 0];

    const result = distanceSegmentToSegment(a0, a1, b0, b1);
    expect(result.distance).toBeCloseTo(0, 5);
  });

  it('calculates trajectory length correctly', () => {
    const entry: Vector3Tuple = [0, 0, 0];
    const target: Vector3Tuple = [10, 20, 20]; // length = sqrt(100 + 400 + 400) = 30
    expect(trajectoryLength(entry, target)).toBeCloseTo(30.0, 5);
  });

  it('calculates sphere clearance and detects penetration', () => {
    const center: Vector3Tuple = [0, 0, 0];
    const radius = 5.0;

    // Point outside sphere
    const outside: Vector3Tuple = [0, 0, 8];
    expect(distanceToSphereSurface(outside, center, radius)).toBeCloseTo(3.0);

    // Trajectory passing 8mm from center with radius 5mm -> clearance 3mm
    const entry1: Vector3Tuple = [-10, 8, 0];
    const target1: Vector3Tuple = [10, 8, 0];
    expect(trajectorySphereClearance(entry1, target1, center, radius)).toBeCloseTo(3.0);

    // Trajectory penetrating sphere (passing 2mm from center) -> clearance -3mm
    const entry2: Vector3Tuple = [-10, 2, 0];
    const target2: Vector3Tuple = [10, 2, 0];
    expect(trajectorySphereClearance(entry2, target2, center, radius)).toBeCloseTo(-3.0);
  });
});

function distancePointOnSegment(point: Vector3Tuple, a: Vector3Tuple, b: Vector3Tuple) {
  const closest = closestPointOnSegment(point, a, b);
  const dx = point[0] - closest[0];
  const dy = point[1] - closest[1];
  const dz = point[2] - closest[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
