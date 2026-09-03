import { Vector3Tuple } from './types';

// Vector utilities
export function add(a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(v: Vector3Tuple, s: number): Vector3Tuple {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function dot(a: Vector3Tuple, b: Vector3Tuple): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function lengthSq(v: Vector3Tuple): number {
  return dot(v, v);
}

export function length(v: Vector3Tuple): number {
  return Math.sqrt(lengthSq(v));
}

export function distance(a: Vector3Tuple, b: Vector3Tuple): number {
  return length(sub(a, b));
}

export function normalize(v: Vector3Tuple): Vector3Tuple {
  const len = length(v);
  if (len < 1e-9) return [0, 1, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Calculates the point on segment AB closest to point P.
 */
export function closestPointOnSegment(
  point: Vector3Tuple,
  a: Vector3Tuple,
  b: Vector3Tuple
): Vector3Tuple {
  const ab = sub(b, a);
  const l2 = lengthSq(ab);
  if (l2 < 1e-9) return [...a];

  const ap = sub(point, a);
  const t = clamp(dot(ap, ab) / l2, 0, 1);
  return add(a, scale(ab, t));
}

/**
 * Calculates the Euclidean distance from point P to segment AB.
 */
export function distancePointToSegment(
  point: Vector3Tuple,
  a: Vector3Tuple,
  b: Vector3Tuple
): number {
  const closest = closestPointOnSegment(point, a, b);
  return distance(point, closest);
}

export interface SegmentDistanceResult {
  distance: number;
  pointOnSegment1: Vector3Tuple;
  pointOnSegment2: Vector3Tuple;
  param1: number;
  param2: number;
}

/**
 * Computes the true minimum distance between two 3D line segments:
 * Segment 1: a0 -> a1
 * Segment 2: b0 -> b1
 * Returns distance, closest points on both segments, and segment parameters.
 */
export function distanceSegmentToSegment(
  a0: Vector3Tuple,
  a1: Vector3Tuple,
  b0: Vector3Tuple,
  b1: Vector3Tuple
): SegmentDistanceResult {
  const u = sub(a1, a0);
  const v = sub(b1, b0);
  const w0 = sub(a0, b0);

  const a = dot(u, u); // squared length of segment 1
  const b = dot(u, v);
  const c = dot(v, v); // squared length of segment 2
  const d = dot(u, w0);
  const e = dot(v, w0);

  const denom = a * c - b * b;
  let sN: number;
  let sD = denom;
  let tN: number;
  let tD = denom;

  const EPSILON = 1e-7;

  // If segments are almost degenerate points
  if (a < EPSILON && c < EPSILON) {
    return {
      distance: distance(a0, b0),
      pointOnSegment1: [...a0],
      pointOnSegment2: [...b0],
      param1: 0,
      param2: 0,
    };
  }

  // If segment 1 is a point
  if (a < EPSILON) {
    sN = 0.0;
    sD = 1.0;
    tN = e;
    tD = c;
  }
  // If segment 2 is a point
  else if (c < EPSILON) {
    tN = 0.0;
    tD = 1.0;
    sN = -d;
    sD = a;
  }
  // If segments are parallel
  else if (denom < EPSILON) {
    sN = 0.0;
    sD = 1.0;
    tN = e;
    tD = c;
  } else {
    // General skew lines
    sN = b * e - c * d;
    tN = a * e - b * d;

    if (sN < 0.0) {
      sN = 0.0;
      tN = e;
      tD = c;
    } else if (sN > sD) {
      sN = sD;
      tN = e + b;
      tD = c;
    }
  }

  if (tN < 0.0) {
    tN = 0.0;
    if (-d < 0.0) {
      sN = 0.0;
    } else if (-d > a) {
      sN = sD;
    } else {
      sN = -d;
      sD = a;
    }
  } else if (tN > tD) {
    tN = tD;
    if (-d + b < 0.0) {
      sN = 0;
    } else if (-d + b > a) {
      sN = sD;
    } else {
      sN = -d + b;
      sD = a;
    }
  }

  const s = Math.abs(sN) < EPSILON ? 0.0 : sN / sD;
  const t = Math.abs(tN) < EPSILON ? 0.0 : tN / tD;

  const clampedS = clamp(s, 0.0, 1.0);
  const clampedT = clamp(t, 0.0, 1.0);

  const p1 = add(a0, scale(u, clampedS));
  const p2 = add(b0, scale(v, clampedT));
  const dist = distance(p1, p2);

  return {
    distance: dist,
    pointOnSegment1: p1,
    pointOnSegment2: p2,
    param1: clampedS,
    param2: clampedT,
  };
}

/**
 * Calculates the Euclidean trajectory length from entry to target.
 */
export function trajectoryLength(entry: Vector3Tuple, target: Vector3Tuple): number {
  return distance(entry, target);
}

/**
 * Calculates the Euclidean distance from a point to a sphere's outer surface.
 * Negative if inside the sphere.
 */
export function distanceToSphereSurface(
  point: Vector3Tuple,
  center: Vector3Tuple,
  radius: number
): number {
  return distance(point, center) - radius;
}

/**
 * Calculates the minimum clearance from a trajectory segment (entry -> target)
 * to a sphere's surface. Negative if the trajectory penetrates the sphere.
 */
export function trajectorySphereClearance(
  entry: Vector3Tuple,
  target: Vector3Tuple,
  center: Vector3Tuple,
  radius: number
): number {
  const closestPoint = closestPointOnSegment(center, entry, target);
  return distance(closestPoint, center) - radius;
}

/**
 * Computes angular deviation (in degrees) between trajectory vector and nominal vector.
 */
export function trajectoryAngleDeviation(
  entry: Vector3Tuple,
  target: Vector3Tuple,
  nominalEntry: Vector3Tuple,
  nominalTarget: Vector3Tuple
): number {
  const v1 = normalize(sub(target, entry));
  const v2 = normalize(sub(nominalTarget, nominalEntry));
  const cosTheta = clamp(dot(v1, v2), -1.0, 1.0);
  return (Math.acos(cosTheta) * 180) / Math.PI;
}
