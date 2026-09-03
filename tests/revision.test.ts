import { describe, it, expect, beforeEach } from 'vitest';
import { planStore } from '../src/core/planStore';
import { toolHandlers } from '../src/webmcp/registerTools';
import { CandidateTrajectory } from '../src/core/types';

describe('Optimistic Concurrency & Revision Management', () => {
  beforeEach(() => {
    planStore.selectCase('case_a', 'human');
  });

  it('increments revision on every state mutation', () => {
    const rev0 = planStore.getState().revision;

    planStore.selectTarget('motor_pathway', 'human');
    const rev1 = planStore.getState().revision;
    expect(rev1).toBe(rev0 + 1);

    planStore.setEntryPoint([30, 20, 70], 'human');
    const rev2 = planStore.getState().revision;
    expect(rev2).toBe(rev1 + 1);
  });

  it('rejects stale WebMCP stage_corridor calls with REVISION_CONFLICT', async () => {
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
    expect(newRev).toBeGreaterThan(currentRev);

    // Agent attempts mutation with stale expectedRevision
    const res = await toolHandlers.neuralhaptics_stage_corridor(
      {
        candidateId: 'test_cand_001',
        expectedRevision: currentRev, // Stale!
      },
      'webmcp'
    );

    expect(res.ok).toBe(false);
    expect((res as { code?: string }).code).toBe('REVISION_CONFLICT');
    expect(res.currentRevision).toBe(newRev);
  });

  it('allows staging when expectedRevision matches current revision and supports undo', async () => {
    const mockCandidate: CandidateTrajectory = {
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

    planStore.setSearchCandidates([mockCandidate]);
    const currentRev = planStore.getState().revision;
    const initialEntry = [...planStore.getState().entryPoint];

    // Stage corridor with correct expectedRevision
    const stageRes = await toolHandlers.neuralhaptics_stage_corridor(
      {
        candidateId: 'test_cand_002',
        expectedRevision: currentRev,
      },
      'webmcp'
    );

    expect(stageRes.ok).toBe(true);
    expect(planStore.getState().stagedCandidate?.candidateId).toBe('test_cand_002');
    expect(planStore.getState().entryPoint).toEqual([29, 18, 66]);
    expect(planStore.getState().previousTrajectory?.entryPoint).toEqual(initialEntry);

    // Undo the agent change
    const undoRev = planStore.getState().revision;
    const undoRes = await toolHandlers.neuralhaptics_undo_agent_change(
      { expectedRevision: undoRev },
      'webmcp'
    );

    expect(undoRes.ok).toBe(true);
    expect(planStore.getState().entryPoint).toEqual(initialEntry);
    expect(planStore.getState().stagedCandidate).toBeNull();
  });
});
