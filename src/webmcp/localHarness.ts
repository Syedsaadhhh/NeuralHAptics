import { toolHandlers } from './registerTools';
import { planStore } from '../core/planStore';
import { Vector3Tuple } from '../core/types';

/**
 * Local Development Harness.
 * Executes identical tool logic tagged as 'local-harness' for local evaluation,
 * automated testing, and browsers where native WebMCP is unavailable.
 */
export const localHarness = {
  async getContext(detail: 'compact' | 'full' = 'compact') {
    return toolHandlers.neuralhaptics_get_context({ detail }, 'local-harness');
  },

  async searchCorridors(options?: {
    targetId?: string;
    minimumVesselClearanceMm?: number;
    priorities?: {
      vascularClearance?: number;
      targetAccuracy?: number;
      avoidanceZone?: number;
      trajectoryLength?: number;
    };
    maxCandidates?: number;
  }) {
    return toolHandlers.neuralhaptics_search_corridors(options || {}, 'local-harness');
  },

  async evaluateCorridor(entryPoint: Vector3Tuple, targetPoint: Vector3Tuple) {
    return toolHandlers.neuralhaptics_evaluate_corridor(
      { entryPoint, targetPoint },
      'local-harness'
    );
  },

  async compareCorridors(candidateIds: string[]) {
    return toolHandlers.neuralhaptics_compare_corridors(
      { candidateIds },
      'local-harness'
    );
  },

  async stageCorridor(candidateId: string, expectedRevision?: number) {
    const rev = expectedRevision ?? planStore.getState().revision;
    return toolHandlers.neuralhaptics_stage_corridor(
      { candidateId, expectedRevision: rev },
      'local-harness'
    );
  },

  async previewStimulation(
    params: {
      current_mA?: number;
      frequency_Hz?: number;
      pulseWidth_us?: number;
      contacts?: number[];
    },
    expectedRevision?: number
  ) {
    const rev = expectedRevision ?? planStore.getState().revision;
    return toolHandlers.neuralhaptics_preview_stimulation(
      { ...params, expectedRevision: rev },
      'local-harness'
    );
  },

  async undoAgentChange(expectedRevision?: number) {
    const rev = expectedRevision ?? planStore.getState().revision;
    return toolHandlers.neuralhaptics_undo_agent_change(
      { expectedRevision: rev },
      'local-harness'
    );
  },

  async exportApprovedPlan() {
    return toolHandlers.neuralhaptics_export_approved_plan({}, 'local-harness');
  },
};
