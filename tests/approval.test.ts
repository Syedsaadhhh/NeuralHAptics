import { describe, it, expect, beforeEach } from 'vitest';
import { planStore } from '../src/core/planStore';
import { toolHandlers } from '../src/webmcp/registerTools';
import { computePlanDigest, canonicalizePlan } from '../src/core/approval';

describe('Dynamic Human Approval Gate', () => {
  beforeEach(() => {
    planStore.selectCase('case_a', 'human');
  });

  it('generates a valid 64-character hexadecimal SHA-256 digest for canonical plan', async () => {
    const canonical = canonicalizePlan(planStore.getState());
    const digest = await computePlanDigest(canonical);

    expect(typeof digest).toBe('string');
    expect(digest.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(digest)).toBe(true);
  });

  it('rejects export before human approval', async () => {
    expect(planStore.getState().approval.isApproved).toBe(false);

    await expect(
      toolHandlers.neuralhaptics_export_approved_plan({}, 'webmcp')
    ).rejects.toThrow(/Export denied/);
  });

  it('allows export immediately after explicit human approval', async () => {
    const { digest, revision } = await planStore.approvePlan();

    expect(planStore.getState().approval.isApproved).toBe(true);
    expect(planStore.getState().approval.approvedRevision).toBe(revision);
    expect(planStore.getState().approval.approvalDigest).toBe(digest);

    // Export tool execution succeeds
    const exported = await toolHandlers.neuralhaptics_export_approved_plan({}, 'webmcp');
    expect(exported).toBeDefined();
    expect(exported.approvalDigest).toBe(digest);
    expect(exported.case.id).toBe('case_a');
    expect(exported.explicitNonClinicalDisclaimer).toContain('Research simulation');
  });

  it('invalidates approval and revokes export upon subsequent state mutation', async () => {
    // 1. Human approves plan
    await planStore.approvePlan();
    expect(planStore.getState().approval.isApproved).toBe(true);

    // Export works
    await expect(
      toolHandlers.neuralhaptics_export_approved_plan({}, 'webmcp')
    ).resolves.toBeDefined();

    // 2. Human or agent mutates planning state (e.g. adjusts entry point)
    planStore.setEntryPoint([32, 19, 65], 'human');

    // 3. Approval must now be invalidated
    expect(planStore.getState().approval.isApproved).toBe(false);
    expect(planStore.getState().approval.approvalDigest).toBeNull();
    expect(planStore.getState().approval.approvedRevision).toBeNull();

    // 4. Export tool must now be rejected
    await expect(
      toolHandlers.neuralhaptics_export_approved_plan({}, 'webmcp')
    ).rejects.toThrow(/Export denied/);
  });
});
