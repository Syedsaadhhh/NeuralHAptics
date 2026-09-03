import { planStore } from '../core/planStore';
import { executeCorridorSearch } from '../core/searchService';
import { evaluateCandidate } from '../core/candidateSearch';
import { TARGET_STRUCTURES, CASE_PRESETS, SYNTHETIC_VESSELS, AVOIDANCE_REGIONS } from '../core/brainData';
import {
  TOOL_GET_CONTEXT,
  TOOL_SEARCH_CORRIDORS,
  TOOL_EVALUATE_CORRIDOR,
  TOOL_COMPARE_CORRIDORS,
  TOOL_STAGE_CORRIDOR,
  TOOL_PREVIEW_STIMULATION,
  TOOL_UNDO_AGENT_CHANGE,
  TOOL_EXPORT_APPROVED_PLAN,
  ToolDefinition,
} from './toolSchemas';
import { MutationOrigin, WebMCPProtocolStatus, Vector3Tuple } from '../core/types';

interface ModelContextTool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
  handler: (args: any) => Promise<any> | any;
}

interface ModelContextAPI {
  registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => void;
  unregisterTool?: (toolName: string) => void;
}

declare global {
  interface Document {
    modelContext?: ModelContextAPI;
  }
  interface Navigator {
    modelContext?: ModelContextAPI;
  }
}

export function detectProtocolStatus(): WebMCPProtocolStatus {
  if (typeof document !== 'undefined' && document.modelContext) {
    return 'WebMCP Active';
  }
  if (typeof navigator !== 'undefined' && navigator.modelContext) {
    return 'WebMCP Compatibility Mode';
  }
  return 'WebMCP Unavailable — Local Harness';
}

/**
 * Universal Tool Handlers.
 * Used identically by native WebMCP and by the Local Development Harness.
 */
export const toolHandlers = {
  neuralhaptics_get_context: async (
    args: { detail?: 'compact' | 'full' },
    origin: MutationOrigin = 'webmcp'
  ) => {
    const startTime = performance.now();
    const state = planStore.getState();
    const detail = args?.detail ?? 'compact';

    const response: Record<string, unknown> = {
      revision: state.revision,
      selectedCase: state.selectedCaseId,
      caseDetails: {
        name: CASE_PRESETS[state.selectedCaseId].name,
        indication: CASE_PRESETS[state.selectedCaseId].indication,
        objective: CASE_PRESETS[state.selectedCaseId].objective,
      },
      target: {
        id: state.targetId,
        displayName: TARGET_STRUCTURES[state.targetId]?.displayName,
        center: state.targetPoint,
      },
      activeTrajectory: {
        entryPoint: state.entryPoint,
        targetPoint: state.targetPoint,
        stagedCandidateId: state.stagedCandidate?.candidateId ?? null,
      },
      planningConstraints: {
        priorities: state.priorities,
        nearestHazard: state.machineHaptics.nearestHazard,
        constraintTension: state.machineHaptics.constraintTension,
        hazardIntensity: state.machineHaptics.hazardIntensity,
        repulsionVector: state.machineHaptics.repulsionVector,
      },
      stimulationPreview: {
        current_mA: state.stimulation.current_mA,
        pulseWidth_us: state.stimulation.pulseWidth_us,
        frequency_Hz: state.stimulation.frequency_Hz,
        activeContacts: state.stimulation.contacts,
        activationProxyRadiusMm: state.stimulationPreview.activationProxyRadiusMm,
        targetCoveragePercent: state.stimulationPreview.targetCoveragePercent,
        avoidanceOverlapPercent: state.stimulationPreview.avoidanceOverlapPercent,
        shannonStatus: state.stimulationPreview.shannon.referenceStatus,
      },
      approval: {
        isApproved: state.approval.isApproved,
        approvedRevision: state.approval.approvedRevision,
        approvalDigest: state.approval.approvalDigest,
      },
      disclaimer:
        'Research simulation using synthetic anatomy. Not a medical device or clinical recommendation.',
    };

    if (detail === 'full') {
      response.anatomy = {
        targets: TARGET_STRUCTURES,
        avoidanceRegions: AVOIDANCE_REGIONS,
        vesselCount: SYNTHETIC_VESSELS.length,
      };
      response.criticalHazards = state.machineHaptics.criticalHazards;
    }

    planStore.addAuditLog({
      origin,
      toolName: 'neuralhaptics_get_context',
      arguments: args || {},
      resultSummary: `Reported context at revision ${state.revision} (Tension: ${state.machineHaptics.constraintTension})`,
      revisionBefore: state.revision,
      revisionAfter: state.revision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: 'ok',
      rawResult: response,
    });

    return response;
  },

  neuralhaptics_search_corridors: async (
    args: {
      targetId?: string;
      minimumVesselClearanceMm?: number;
      priorities?: {
        vascularClearance?: number;
        targetAccuracy?: number;
        avoidanceZone?: number;
        trajectoryLength?: number;
      };
      maxCandidates?: number;
    },
    origin: MutationOrigin = 'webmcp'
  ) => {
    const startTime = performance.now();
    const state = planStore.getState();
    const revBefore = state.revision;

    planStore.setIsSearching(true);
    let result;
    try {
      result = await executeCorridorSearch({
        caseId: state.selectedCaseId,
        targetId: args?.targetId ?? state.targetId,
        minimumVesselClearanceMm:
          args?.minimumVesselClearanceMm ?? state.priorities.minimumVesselClearanceMm,
        priorities: args?.priorities,
        maxCandidates: args?.maxCandidates ?? 6,
        nominalEntry: state.nominalEntry,
        sampleCount: 512,
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
      currentRevision: state.revision,
    };

    planStore.addAuditLog({
      origin,
      toolName: 'neuralhaptics_search_corridors',
      arguments: args || {},
      resultSummary: `Found ${result.candidates.length} Pareto candidates (${result.rejectedCount} rejected / 512 evaluated)`,
      revisionBefore: revBefore,
      revisionAfter: state.revision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: 'ok',
      rawResult: output,
    });

    return output;
  },

  neuralhaptics_evaluate_corridor: async (
    args: {
      entryPoint: Vector3Tuple;
      targetPoint: Vector3Tuple;
    },
    origin: MutationOrigin = 'webmcp'
  ) => {
    const startTime = performance.now();
    const state = planStore.getState();

    // Input bounds validation
    if (
      !Array.isArray(args?.entryPoint) ||
      args.entryPoint.length !== 3 ||
      !Array.isArray(args?.targetPoint) ||
      args.targetPoint.length !== 3 ||
      args.entryPoint.some((v) => typeof v !== 'number' || !Number.isFinite(v)) ||
      args.targetPoint.some((v) => typeof v !== 'number' || !Number.isFinite(v))
    ) {
      throw new Error(
        'Invalid coordinates: entryPoint and targetPoint must be finite 3D numeric vectors [x, y, z].'
      );
    }

    const targetObj = TARGET_STRUCTURES[state.targetId];
    const candidate = evaluateCandidate(
      args.entryPoint,
      args.targetPoint,
      targetObj,
      state.nominalEntry,
      targetObj.center,
      'eval_custom'
    );

    const isFeasible =
      candidate.vesselClearanceMm > 0 && candidate.avoidanceClearanceMm > 0;

    const output = {
      vesselClearanceMm: candidate.vesselClearanceMm,
      avoidanceClearanceMm: candidate.avoidanceClearanceMm,
      intersections: !isFeasible,
      targetErrorMm: candidate.targetErrorMm,
      trajectoryLengthMm: candidate.lengthMm,
      angularDeviationDeg: candidate.angularDeviationDeg,
      constraintTension: candidate.constraintTension,
      integratedHazardScore: candidate.integratedHazardScore,
      candidateFeasibility: isFeasible ? 'FEASIBLE' : 'INFEASIBLE_PENETRATION',
      machineHaptics: evaluateCandidate(
        args.entryPoint,
        args.targetPoint,
        targetObj,
        state.nominalEntry,
        targetObj.center,
        'eval_haptics'
      ),
    };

    planStore.addAuditLog({
      origin,
      toolName: 'neuralhaptics_evaluate_corridor',
      arguments: args,
      resultSummary: `Evaluated corridor: Clearance ${candidate.vesselClearanceMm}mm, Tension ${candidate.constraintTension} (${output.candidateFeasibility})`,
      revisionBefore: state.revision,
      revisionAfter: state.revision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: 'ok',
      rawResult: output,
    });

    return output;
  },

  neuralhaptics_compare_corridors: async (
    args: { candidateIds: string[] },
    origin: MutationOrigin = 'webmcp'
  ) => {
    const startTime = performance.now();
    const state = planStore.getState();

    if (!Array.isArray(args?.candidateIds) || args.candidateIds.length === 0) {
      throw new Error('candidateIds array must contain at least one candidate ID.');
    }

    const candidates = state.searchCandidates.filter((c) =>
      args.candidateIds.includes(c.candidateId)
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
      isPareto: c.isPareto ?? true,
    }));

    const output = {
      comparisonMatrix,
      candidateCount: comparisonMatrix.length,
      currentRevision: state.revision,
      note: 'Trade-off comparisons are deterministic research metrics. Agents should align choices with human-defined priorities.',
    };

    planStore.addAuditLog({
      origin,
      toolName: 'neuralhaptics_compare_corridors',
      arguments: args,
      resultSummary: `Compared ${candidates.length} corridors (${args.candidateIds.join(', ')})`,
      revisionBefore: state.revision,
      revisionAfter: state.revision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: 'ok',
      rawResult: output,
    });

    return output;
  },

  neuralhaptics_stage_corridor: async (
    args: { candidateId: string; expectedRevision: number },
    origin: MutationOrigin = 'webmcp'
  ) => {
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
        toolName: 'neuralhaptics_stage_corridor',
        arguments: args,
        resultSummary: `CONFLICT: ${res.message} (expected rev ${args.expectedRevision}, store rev ${res.currentRevision})`,
        revisionBefore: revBefore,
        revisionAfter: res.currentRevision,
        durationMs: Math.max(1, Math.round(performance.now() - startTime)),
        status: 'conflict',
        rawResult: res,
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
      message: `Candidate ${args.candidateId} successfully staged. 3D probe updated; previous trajectory rendered as ghost.`,
    };

    planStore.addAuditLog({
      origin,
      toolName: 'neuralhaptics_stage_corridor',
      arguments: args,
      resultSummary: `Staged candidate ${args.candidateId} (rev ${revBefore} -> ${res.currentRevision})`,
      revisionBefore: revBefore,
      revisionAfter: res.currentRevision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: 'ok',
      rawResult: output,
    });

    return output;
  },

  neuralhaptics_preview_stimulation: async (
    args: {
      current_mA?: number;
      frequency_Hz?: number;
      pulseWidth_us?: number;
      contacts?: number[];
      expectedRevision: number;
    },
    origin: MutationOrigin = 'webmcp'
  ) => {
    const startTime = performance.now();
    const revBefore = planStore.getState().revision;

    const res = planStore.previewStimulation(
      {
        current_mA: args.current_mA,
        frequency_Hz: args.frequency_Hz,
        pulseWidth_us: args.pulseWidth_us,
        contacts: args.contacts,
      },
      origin,
      args.expectedRevision
    );

    if (!res.ok) {
      planStore.addAuditLog({
        origin,
        toolName: 'neuralhaptics_preview_stimulation',
        arguments: args,
        resultSummary: `CONFLICT: ${res.message} (expected rev ${args.expectedRevision}, store rev ${res.currentRevision})`,
        revisionBefore: revBefore,
        revisionAfter: res.currentRevision,
        durationMs: Math.max(1, Math.round(performance.now() - startTime)),
        status: 'conflict',
        rawResult: res,
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
      shannonReference: stateAfter.stimulationPreview.shannon,
    };

    planStore.addAuditLog({
      origin,
      toolName: 'neuralhaptics_preview_stimulation',
      arguments: args,
      resultSummary: `Updated stimulation: Coverage ${stateAfter.stimulationPreview.targetCoveragePercent}%, Radius ${stateAfter.stimulationPreview.activationProxyRadiusMm}mm (rev ${revBefore} -> ${res.currentRevision})`,
      revisionBefore: revBefore,
      revisionAfter: res.currentRevision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: 'ok',
      rawResult: output,
    });

    return output;
  },

  neuralhaptics_undo_agent_change: async (
    args: { expectedRevision: number },
    origin: MutationOrigin = 'webmcp'
  ) => {
    const startTime = performance.now();
    const revBefore = planStore.getState().revision;

    const res = planStore.undoAgentChange(origin, args.expectedRevision);

    if (!res.ok) {
      planStore.addAuditLog({
        origin,
        toolName: 'neuralhaptics_undo_agent_change',
        arguments: args,
        resultSummary: `UNDO REJECTED: ${res.message}`,
        revisionBefore: revBefore,
        revisionAfter: res.currentRevision,
        durationMs: Math.max(1, Math.round(performance.now() - startTime)),
        status: 'conflict',
        rawResult: res,
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
      message: 'Successfully reverted latest staged agent mutation.',
    };

    planStore.addAuditLog({
      origin,
      toolName: 'neuralhaptics_undo_agent_change',
      arguments: args,
      resultSummary: `Reverted latest agent mutation (rev ${revBefore} -> ${res.currentRevision})`,
      revisionBefore: revBefore,
      revisionAfter: res.currentRevision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: 'ok',
      rawResult: output,
    });

    return output;
  },

  neuralhaptics_export_approved_plan: async (
    _args: Record<string, unknown>,
    origin: MutationOrigin = 'webmcp'
  ) => {
    const startTime = performance.now();
    const state = planStore.getState();

    if (!state.approval.isApproved || state.approval.approvedRevision !== state.revision) {
      throw new Error(
        'Export denied: Plan is not in an approved state for current revision.'
      );
    }

    const exportPayload = {
      case: {
        id: state.selectedCaseId,
        name: CASE_PRESETS[state.selectedCaseId].name,
        indication: CASE_PRESETS[state.selectedCaseId].indication,
      },
      syntheticDataDeclaration:
        'All coordinates, vessels, and targets in this plan are procedurally generated synthetic geometries for research evaluation only.',
      trajectoryCoordinates: {
        entryPoint: state.entryPoint,
        targetPoint: state.targetPoint,
        targetNucleus: TARGET_STRUCTURES[state.targetId].displayName,
      },
      candidateMetrics: {
        vesselClearanceMm: state.machineHaptics.nearestHazard.clearanceMm,
        avoidanceClearanceMm: state.stagedCandidate?.avoidanceClearanceMm ?? null,
        constraintTension: state.machineHaptics.constraintTension,
        nearestHazard: state.machineHaptics.nearestHazard,
      },
      stimulationPreview: {
        current_mA: state.stimulation.current_mA,
        frequency_Hz: state.stimulation.frequency_Hz,
        pulseWidth_us: state.stimulation.pulseWidth_us,
        activeContacts: state.stimulation.contacts,
        activationProxyRadiusMm: state.stimulationPreview.activationProxyRadiusMm,
        targetCoveragePercent: state.stimulationPreview.targetCoveragePercent,
        avoidanceOverlapPercent: state.stimulationPreview.avoidanceOverlapPercent,
      },
      shannonReference: state.stimulationPreview.shannon,
      timestamp: new Date().toISOString(),
      revision: state.revision,
      approvalDigest: state.approval.approvalDigest,
      approvedAt: state.approval.approvedAt,
      explicitNonClinicalDisclaimer:
        'Research simulation using synthetic anatomy. Not a medical device or clinical recommendation.',
    };

    planStore.addAuditLog({
      origin,
      toolName: 'neuralhaptics_export_approved_plan',
      arguments: {},
      resultSummary: `Exported approved research plan (Digest: ${state.approval.approvalDigest?.substring(0, 12)}...)`,
      revisionBefore: state.revision,
      revisionAfter: state.revision,
      durationMs: Math.max(1, Math.round(performance.now() - startTime)),
      status: 'ok',
      rawResult: exportPayload,
    });

    return exportPayload;
  },
};

/**
 * WebMCP Manager: Registers native tools on document.modelContext / navigator.modelContext.
 * Dynamically handles the Human Approval Gate export tool registration with AbortController.
 */
class WebMCPManager {
  private static instance: WebMCPManager;
  private exportController: AbortController | null = null;
  private isInitialized = false;

  public static getInstance(): WebMCPManager {
    if (!WebMCPManager.instance) {
      WebMCPManager.instance = new WebMCPManager();
    }
    return WebMCPManager.instance;
  }

  public initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const modelContext =
      (typeof document !== 'undefined' ? document.modelContext : undefined) ??
      (typeof navigator !== 'undefined' ? navigator.modelContext : undefined);

    if (modelContext && typeof modelContext.registerTool === 'function') {
      this.registerStandardTools(modelContext);
    }

    // Subscribe to planStore changes to manage the dynamic approval gate
    planStore.subscribe(() => {
      this.syncApprovalGate();
    });

    // When approval is invalidated, ensure export tool registration is aborted
    planStore.onApprovalInvalidated(() => {
      this.revokeExportTool();
    });
  }

  private registerStandardTools(modelContext: ModelContextAPI) {
    const standardTools: Array<{ def: ToolDefinition; handler: (args: any) => Promise<any> }> = [
      { def: TOOL_GET_CONTEXT, handler: (args) => toolHandlers.neuralhaptics_get_context(args, 'webmcp') },
      { def: TOOL_SEARCH_CORRIDORS, handler: (args) => toolHandlers.neuralhaptics_search_corridors(args, 'webmcp') },
      { def: TOOL_EVALUATE_CORRIDOR, handler: (args) => toolHandlers.neuralhaptics_evaluate_corridor(args, 'webmcp') },
      { def: TOOL_COMPARE_CORRIDORS, handler: (args) => toolHandlers.neuralhaptics_compare_corridors(args, 'webmcp') },
      { def: TOOL_STAGE_CORRIDOR, handler: (args) => toolHandlers.neuralhaptics_stage_corridor(args, 'webmcp') },
      { def: TOOL_PREVIEW_STIMULATION, handler: (args) => toolHandlers.neuralhaptics_preview_stimulation(args, 'webmcp') },
      { def: TOOL_UNDO_AGENT_CHANGE, handler: (args) => toolHandlers.neuralhaptics_undo_agent_change(args, 'webmcp') },
    ];

    for (const { def, handler } of standardTools) {
      try {
        modelContext.registerTool({
          name: def.name,
          description: def.description,
          parameters: def.inputSchema,
          inputSchema: def.inputSchema,
          handler,
        });
      } catch (err) {
        console.warn(`WebMCP tool registration failed for ${def.name}:`, err);
      }
    }
  }

  private syncApprovalGate() {
    const state = planStore.getState();
    const modelContext =
      (typeof document !== 'undefined' ? document.modelContext : undefined) ??
      (typeof navigator !== 'undefined' ? navigator.modelContext : undefined);

    if (!modelContext || typeof modelContext.registerTool !== 'function') return;

    if (state.approval.isApproved && !this.exportController) {
      // Human approved: dynamically register neuralhaptics_export_approved_plan with its own AbortController
      this.exportController = new AbortController();
      try {
        modelContext.registerTool(
          {
            name: TOOL_EXPORT_APPROVED_PLAN.name,
            description: TOOL_EXPORT_APPROVED_PLAN.description,
            parameters: TOOL_EXPORT_APPROVED_PLAN.inputSchema,
            inputSchema: TOOL_EXPORT_APPROVED_PLAN.inputSchema,
            handler: () => toolHandlers.neuralhaptics_export_approved_plan({}, 'webmcp'),
          },
          { signal: this.exportController.signal }
        );
      } catch (err) {
        console.warn('Failed to dynamically register export tool:', err);
      }
    } else if (!state.approval.isApproved && this.exportController) {
      this.revokeExportTool();
    }
  }

  private revokeExportTool() {
    if (this.exportController) {
      this.exportController.abort();
      this.exportController = null;
    }
  }
}

export const webMCPManager = WebMCPManager.getInstance();
