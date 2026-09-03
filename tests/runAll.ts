/**
 * Universal NeuralHaptics Automated Test Runner
 * Executes all test suites and verifies all 11 core acceptance requirements.
 */

import {
  distanceSegmentToSegment,
  closestPointOnSegment,
  distancePointToSegment,
  trajectoryLength,
  distanceToSphereSurface,
  trajectorySphereClearance,
} from '../src/core/geometry.ts';
import { evaluateMachineHaptics } from '../src/core/riskField.ts';
import { searchCorridors, generateCandidateEntryPoints } from '../src/core/candidateSearch.ts';
import { planStore } from '../src/core/planStore.ts';
import { toolHandlers } from '../src/webmcp/registerTools.ts';
import { computePlanDigest, canonicalizePlan } from '../src/core/approval.ts';
import { Vector3Tuple, VesselSegment, CandidateTrajectory } from '../src/core/types.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${testName}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

function assertCloseTo(actual: number, expected: number, testName: string, precision: number = 4) {
  const diff = Math.abs(actual - expected);
  const tolerance = Math.pow(10, -precision);
  assert(diff <= tolerance, testName, `expected ${expected}, got ${actual} (diff ${diff})`);
}

async function runAllTests() {
  console.log('\n\x1b[1m\x1b[36m================================================================');
  console.log('       NEURALHAPTICS AUTOMATED VERIFICATION TEST SUITE          ');
  console.log('================================================================\x1b[0m\n');

  // -------------------------------------------------------------
  // SUITE 1: GEOMETRY ENGINE & SEGMENT-TO-SEGMENT CLEARANCE
  // -------------------------------------------------------------
  console.log('\x1b[1m[Suite 1] Geometry Engine & True Segment Clearance\x1b[0m');

  {
    // Test 1: Point to segment
    const a: Vector3Tuple = [0, 0, 0];
    const b: Vector3Tuple = [10, 0, 0];
    const p1: Vector3Tuple = [5, 5, 0];
    assertCloseTo(distancePointToSegment(p1, a, b), 5.0, '1. Point projected directly onto interior of segment');

    const p2: Vector3Tuple = [-3, 4, 0];
    assertCloseTo(distancePointToSegment(p2, a, b), 5.0, '2. Point projected beyond endpoint a');

    // Test 2: True segment-to-segment clearance for skew perpendicular lines
    const a0: Vector3Tuple = [-5, 0, 0];
    const a1: Vector3Tuple = [5, 0, 0];
    const b0: Vector3Tuple = [0, -5, 4];
    const b1: Vector3Tuple = [0, 5, 4];
    const segRes = distanceSegmentToSegment(a0, a1, b0, b1);
    assertCloseTo(segRes.distance, 4.0, '3. Segment-to-segment clearance for skew perpendicular lines');
    assertCloseTo(segRes.pointOnSegment1[0], 0, '4. Closest point 1 on skew segment (X=0)');
    assertCloseTo(segRes.pointOnSegment2[2], 4, '5. Closest point 2 on skew segment (Z=4)');

    // Test 3: Parallel segments clearance
    const parA0: Vector3Tuple = [0, 0, 0];
    const parA1: Vector3Tuple = [10, 0, 0];
    const parB0: Vector3Tuple = [0, 3, 4];
    const parB1: Vector3Tuple = [10, 3, 4];
    const parRes = distanceSegmentToSegment(parA0, parA1, parB0, parB1);
    assertCloseTo(parRes.distance, 5.0, '6. True distance between parallel segments');

    // Test 4: Direct intersection of segments (distance 0)
    const intA0: Vector3Tuple = [-5, 0, 0];
    const intA1: Vector3Tuple = [5, 0, 0];
    const intB0: Vector3Tuple = [0, -5, 0];
    const intB1: Vector3Tuple = [0, 5, 0];
    const intRes = distanceSegmentToSegment(intA0, intA1, intB0, intB1);
    assertCloseTo(intRes.distance, 0.0, '7. Direct segment intersection detected (distance 0)');

    // Test 5: Trajectory length
    const tEntry: Vector3Tuple = [0, 0, 0];
    const tTarget: Vector3Tuple = [10, 20, 20];
    assertCloseTo(trajectoryLength(tEntry, tTarget), 30.0, '8. Trajectory Euclidean length calculation');

    // Test 6: Sphere clearance and penetration
    const sCenter: Vector3Tuple = [0, 0, 0];
    const sRadius = 5.0;
    const sOutside: Vector3Tuple = [0, 0, 8];
    assertCloseTo(distanceToSphereSurface(sOutside, sCenter, sRadius), 3.0, '9. Distance to outer sphere surface');

    const sEntryClear: Vector3Tuple = [-10, 8, 0];
    const sTargetClear: Vector3Tuple = [10, 8, 0];
    assertCloseTo(trajectorySphereClearance(sEntryClear, sTargetClear, sCenter, sRadius), 3.0, '10. Trajectory sphere clearance (positive clearance)');

    const sEntryPen: Vector3Tuple = [-10, 2, 0];
    const sTargetPen: Vector3Tuple = [10, 2, 0];
    assertCloseTo(trajectorySphereClearance(sEntryPen, sTargetPen, sCenter, sRadius), -3.0, '11. Trajectory sphere penetration detected (negative clearance)');
  }

  // -------------------------------------------------------------
  // SUITE 2: MACHINE HAPTICS & RISK FIELD ENGINE
  // -------------------------------------------------------------
  console.log('\n\x1b[1m[Suite 2] Machine Haptics & Risk Field Engine\x1b[0m');

  {
    const customVessel: VesselSegment = {
      id: 'test_vessel',
      displayName: 'Test Vessel',
      start: [-10, 2, 0],
      end: [10, 2, 0],
      radiusMm: 1.0,
      severityWeight: 1.0,
    };

    const entry: Vector3Tuple = [-5, 5, 0];
    const target: Vector3Tuple = [5, 5, 0];

    const evalResult = evaluateMachineHaptics(entry, target, {
      vessels: [customVessel],
      avoidanceRegions: [],
    });

    // Vessel is at Y=2, trajectory is at Y=5 -> Repulsion vector MUST point along positive Y (away from hazard)
    assert(
      evalResult.machineHaptics.repulsionVector[1] > 0.9,
      '12. Repulsion vector points strictly away from hazard along positive Y',
      `got ${evalResult.machineHaptics.repulsionVector[1]}`
    );
    assertCloseTo(evalResult.minVesselClearanceMm, 2.0, '13. Minimum vessel clearance accurately calculated (3mm - 1mm radius = 2mm)');

    // Constraint tension normalization [0, 1]
    const entrySafe: Vector3Tuple = [50, 50, 80];
    const targetSafe: Vector3Tuple = [50, 50, 0];
    const safeHaptics = evaluateMachineHaptics(entrySafe, targetSafe);
    assert(
      safeHaptics.machineHaptics.constraintTension >= 0 && safeHaptics.machineHaptics.constraintTension <= 1.0,
      '14. Constraint tension is bounded within [0, 1]'
    );
    assert(
      safeHaptics.machineHaptics.constraintTension < 0.2,
      '15. Constraint tension is low in unconstrained safe space'
    );

    // Deterministic candidate entry points
    const nominal: Vector3Tuple = [27.5, 16.0, 68.0];
    const pts1 = generateCandidateEntryPoints(nominal, 100);
    const pts2 = generateCandidateEntryPoints(nominal, 100);
    assert(JSON.stringify(pts1) === JSON.stringify(pts2), '16. Candidate entry points are strictly deterministic');

    // Deterministic corridor search and Pareto ordering
    const search1 = searchCorridors({ sampleCount: 128 });
    const search2 = searchCorridors({ sampleCount: 128 });
    console.log('    \x1b[33m[Diagnostic]\x1b[0m Evaluated:', search1.totalEvaluated, 'Rejected:', search1.rejectedCount, 'Found:', search1.candidates.length, 'Constraints:', search1.dominantConstraints);
    assert(search1.candidates.length > 0, '17. Corridor search returns candidate trajectories');
    assert(
      JSON.stringify(search1.candidates.map((c) => c.candidateId)) ===
        JSON.stringify(search2.candidates.map((c) => c.candidateId)),
      '18. Pareto candidate ranking and corridor IDs are strictly deterministic'
    );

    // Hard hazard rejection
    for (const c of search1.candidates) {
      assert(c.vesselClearanceMm > 0, `19. Candidate ${c.candidateId} has positive vascular clearance`);
      assert(c.avoidanceClearanceMm > 0, `20. Candidate ${c.candidateId} does not penetrate avoidance zone`);
      break; // check at least the top candidate
    }
  }

  // -------------------------------------------------------------
  // SUITE 3: OPTIMISTIC CONCURRENCY & REVISION MANAGEMENT
  // -------------------------------------------------------------
  console.log('\n\x1b[1m[Suite 3] Authoritative State & Optimistic Concurrency\x1b[0m');

  {
    planStore.selectCase('case_a', 'human');
    const rev0 = planStore.getState().revision;

    planStore.selectTarget('motor_pathway', 'human');
    const rev1 = planStore.getState().revision;
    assert(rev1 === rev0 + 1, '21. State revision strictly increments on target selection');

    planStore.setEntryPoint([30, 20, 70], 'human');
    const rev2 = planStore.getState().revision;
    assert(rev2 === rev1 + 1, '22. State revision strictly increments on entry point modification');

    const mockCandidate: CandidateTrajectory = {
      candidateId: 'test_cand_001',
      entryPoint: [28, 16, 68],
      targetPoint: [12, -12, -6],
      vesselClearanceMm: 3.2,
      avoidanceClearanceMm: 4.0,
      targetErrorMm: 0.1,
      lengthMm: 72.0,
      angularDeviationDeg: 2.1,
      constraintTension: 0.25,
      integratedHazardScore: 0.3,
    };

    planStore.setSearchCandidates([mockCandidate]);
    const currentRev = planStore.getState().revision;

    // Human makes an edit in between
    planStore.setPriorities({ minimumVesselClearanceMm: 3.0 }, 'human');
    const newRev = planStore.getState().revision;
    assert(newRev > currentRev, '23. Human edit increases revision mid-reasoning');

    // Agent attempts mutation with stale expectedRevision
    const conflictRes = await toolHandlers.neuralhaptics_stage_corridor(
      {
        candidateId: 'test_cand_001',
        expectedRevision: currentRev, // Stale!
      },
      'webmcp'
    );

    assert(conflictRes.ok === false, '24. Stale WebMCP mutation is rejected');
    assert(
      (conflictRes as { code?: string }).code === 'REVISION_CONFLICT',
      '25. Rejection code is REVISION_CONFLICT'
    );
    assert(conflictRes.currentRevision === newRev, '26. Conflict response returns current authoritative revision');

    // Staging with matching expectedRevision and subsequent reversible undo
    const mockCandidate2: CandidateTrajectory = {
      candidateId: 'test_cand_002',
      entryPoint: [29, 18, 66],
      targetPoint: [12, -12, -6],
      vesselClearanceMm: 3.5,
      avoidanceClearanceMm: 4.2,
      targetErrorMm: 0.2,
      lengthMm: 71.5,
      angularDeviationDeg: 1.8,
      constraintTension: 0.22,
      integratedHazardScore: 0.28,
    };

    planStore.setSearchCandidates([mockCandidate2]);
    const preStageRev = planStore.getState().revision;
    const initialEntry = [...planStore.getState().entryPoint];

    const stageRes = await toolHandlers.neuralhaptics_stage_corridor(
      {
        candidateId: 'test_cand_002',
        expectedRevision: preStageRev,
      },
      'webmcp'
    );

    assert(stageRes.ok === true, '27. Staging candidate with valid revision succeeds');
    assert(
      planStore.getState().stagedCandidate?.candidateId === 'test_cand_002',
      '28. Staged candidate is active in authoritative planStore'
    );
    assert(
      JSON.stringify(planStore.getState().previousTrajectory?.entryPoint) === JSON.stringify(initialEntry),
      '29. Previous trajectory preserved as ghost reference'
    );

    // Undo agent change
    const undoRev = planStore.getState().revision;
    const undoRes = await toolHandlers.neuralhaptics_undo_agent_change(
      { expectedRevision: undoRev },
      'webmcp'
    );

    assert(undoRes.ok === true, '30. Undo agent change succeeds');
    assert(
      JSON.stringify(planStore.getState().entryPoint) === JSON.stringify(initialEntry),
      '31. Trajectory entry point accurately restored to pre-agent position'
    );
    assert(planStore.getState().stagedCandidate === null, '32. Staged candidate cleared after undo');
  }

  // -------------------------------------------------------------
  // SUITE 4: DYNAMIC HUMAN APPROVAL GATE & CRYPTOGRAPHIC EXPORT
  // -------------------------------------------------------------
  console.log('\n\x1b[1m[Suite 4] Dynamic Human Approval Gate & SHA-256 Digest\x1b[0m');

  {
    planStore.selectCase('case_a', 'human');

    // SHA-256 Digest format verification
    const canonical = canonicalizePlan(planStore.getState());
    const digest = await computePlanDigest(canonical);
    assert(typeof digest === 'string', '33. Computed digest is string');
    assert(digest.length === 64, '34. SHA-256 digest is exactly 64 characters');
    assert(/^[0-9a-f]{64}$/.test(digest), '35. SHA-256 digest contains valid hexadecimal characters');

    // Export rejected before human approval
    assert(planStore.getState().approval.isApproved === false, '36. Initial state is unapproved');
    let preApprovalRejected = false;
    try {
      await toolHandlers.neuralhaptics_export_approved_plan({}, 'webmcp');
    } catch (e: any) {
      preApprovalRejected = e.message.includes('Export denied');
    }
    assert(preApprovalRejected, '37. neuralhaptics_export_approved_plan is rejected prior to human approval');

    // Explicit human approval
    const { digest: approvedDigest, revision: approvedRev } = await planStore.approvePlan();
    assert(planStore.getState().approval.isApproved === true, '38. Human approval marks plan as approved');
    assert(planStore.getState().approval.approvedRevision === approvedRev, '39. Approved revision recorded');
    assert(planStore.getState().approval.approvalDigest === approvedDigest, '40. Cryptographic digest stored in plan');

    // Export allowed immediately after human approval
    const exported = await toolHandlers.neuralhaptics_export_approved_plan({}, 'webmcp');
    assert(exported !== undefined, '41. Export tool executes successfully following human approval');
    assert(exported.approvalDigest === approvedDigest, '42. Export payload includes authoritative SHA-256 digest');
    assert(exported.case.id === 'case_a', '43. Export payload contains complete case parameters');
    assert(
      exported.explicitNonClinicalDisclaimer.includes('Research simulation'),
      '44. Export payload includes mandatory non-clinical research disclaimer'
    );

    // Invalidation upon subsequent mutation
    planStore.setEntryPoint([32, 19, 65], 'human');
    assert(planStore.getState().approval.isApproved === false, '45. Approval invalidated immediately upon subsequent mutation');
    assert(planStore.getState().approval.approvalDigest === null, '46. Approval digest cleared on state change');
    assert(planStore.getState().approval.approvedRevision === null, '47. Approved revision reset on state change');

    let postMutationRejected = false;
    try {
      await toolHandlers.neuralhaptics_export_approved_plan({}, 'webmcp');
    } catch (e: any) {
      postMutationRejected = e.message.includes('Export denied');
    }
    assert(postMutationRejected, '48. Export tool is revoked after subsequent mutation');
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n\x1b[1m================================================================\x1b[0m');
  console.log(`\x1b[1mRESULTS: \x1b[32m${passed} PASSED\x1b[0m | \x1b[${failed > 0 ? '31' : '32'}m${failed} FAILED\x1b[0m (Total: ${passed + failed})`);
  console.log('\x1b[1m================================================================\x1b[0m\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
