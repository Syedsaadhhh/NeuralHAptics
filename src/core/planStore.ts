import {
  PlanState,
  MutationOrigin,
  CandidateTrajectory,
  StimulationParams,
  HumanPriorities,
  AuditLogEntry,
  Vector3Tuple,
} from './types';
import { CASE_PRESETS, TARGET_STRUCTURES } from './brainData';
import { evaluateMachineHaptics } from './riskField';
import { evaluateStimulationPreview } from './stimulation';
import { canonicalizePlan, computePlanDigest } from './approval';

type Listener = () => void;
type InvalidationCallback = () => void;

interface UndoState {
  entryPoint: Vector3Tuple;
  targetPoint: Vector3Tuple;
  stagedCandidate: CandidateTrajectory | null;
  previousTrajectory: { entryPoint: Vector3Tuple; targetPoint: Vector3Tuple } | null;
  revision: number;
}

class PlanStore {
  private state: PlanState;
  private listeners = new Set<Listener>();
  private invalidationListeners = new Set<InvalidationCallback>();
  private undoStack: UndoState[] = [];

  constructor() {
    this.state = this.createInitialState('case_a');
  }

  private createInitialState(caseId: 'case_a' | 'case_b'): PlanState {
    const preset = CASE_PRESETS[caseId];
    const targetObj = TARGET_STRUCTURES[preset.targetId];
    const entryPoint = [...preset.nominalEntry] as Vector3Tuple;
    const targetPoint = [...targetObj.center] as Vector3Tuple;

    const priorities: HumanPriorities = {
      minimumVesselClearanceMm: 2.0,
      vascularClearance: 0.8,
      targetAccuracy: 0.6,
      avoidanceZone: 0.9,
      trajectoryLength: 0.4,
    };

    const hapticsEval = evaluateMachineHaptics(entryPoint, targetPoint, undefined, targetObj.id);
    const stimPreview = evaluateStimulationPreview(
      preset.defaultStimulation,
      entryPoint,
      targetPoint,
      targetObj.id
    );

    return {
      selectedCaseId: caseId,
      targetId: preset.targetId,
      entryPoint,
      targetPoint,
      nominalEntry: [...preset.nominalEntry] as Vector3Tuple,
      stagedCandidate: null,
      previousTrajectory: null,
      searchCandidates: [],
      hoveredCandidateId: null,
      stimulation: { ...preset.defaultStimulation },
      stimulationPreview: stimPreview,
      machineHaptics: hapticsEval.machineHaptics,
      priorities,
      approval: {
        isApproved: false,
        approvedRevision: null,
        approvalDigest: null,
        approvedAt: null,
      },
      revision: 1,
      lastChangedBy: 'human',
      auditLog: [],
      showMachineHaptics: true,
      isSearching: false,
    };
  }

  public getState(): PlanState {
    return this.state;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onApprovalInvalidated(cb: InvalidationCallback): () => void {
    this.invalidationListeners.add(cb);
    return () => {
      this.invalidationListeners.delete(cb);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private invalidateApprovalInternal() {
    if (this.state.approval.isApproved) {
      this.state.approval = {
        isApproved: false,
        approvedRevision: null,
        approvalDigest: null,
        approvedAt: null,
      };
      for (const cb of this.invalidationListeners) {
        cb();
      }
    }
  }

  private recalculateDerived(newState: PlanState) {
    const hapticsEval = evaluateMachineHaptics(
      newState.entryPoint,
      newState.targetPoint,
      undefined,
      newState.targetId
    );
    newState.machineHaptics = hapticsEval.machineHaptics;

    newState.stimulationPreview = evaluateStimulationPreview(
      newState.stimulation,
      newState.entryPoint,
      newState.targetPoint,
      newState.targetId
    );
  }

  public addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const logItem: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    // Keep audit log bounded to 100 entries
    const newLog = [logItem, ...this.state.auditLog.slice(0, 99)];
    this.state = { ...this.state, auditLog: newLog };
    this.notify();
  }

  public selectCase(caseId: 'case_a' | 'case_b', origin: MutationOrigin = 'human') {
    const revBefore = this.state.revision;
    this.invalidateApprovalInternal();
    this.undoStack = [];

    const preset = CASE_PRESETS[caseId];
    const targetObj = TARGET_STRUCTURES[preset.targetId];
    const entryPoint = [...preset.nominalEntry] as Vector3Tuple;
    const targetPoint = [...targetObj.center] as Vector3Tuple;

    const nextState: PlanState = {
      ...this.state,
      selectedCaseId: caseId,
      targetId: preset.targetId,
      entryPoint,
      targetPoint,
      nominalEntry: [...preset.nominalEntry] as Vector3Tuple,
      stagedCandidate: null,
      previousTrajectory: null,
      searchCandidates: [],
      hoveredCandidateId: null,
      stimulation: { ...preset.defaultStimulation },
      revision: this.state.revision + 1,
      lastChangedBy: origin,
    };

    this.recalculateDerived(nextState);
    this.state = nextState;

    this.addAuditLog({
      origin,
      toolName: 'select_case',
      arguments: { caseId },
      resultSummary: `Switched case to ${preset.name}`,
      revisionBefore: revBefore,
      revisionAfter: this.state.revision,
      durationMs: 4,
      status: 'ok',
    });

    this.notify();
  }

  public selectTarget(targetId: string, origin: MutationOrigin = 'human') {
    if (!TARGET_STRUCTURES[targetId]) return;
    const revBefore = this.state.revision;
    this.invalidateApprovalInternal();

    const targetObj = TARGET_STRUCTURES[targetId];
    const targetPoint = [...targetObj.center] as Vector3Tuple;

    const nextState: PlanState = {
      ...this.state,
      targetId,
      targetPoint,
      stagedCandidate: null,
      revision: this.state.revision + 1,
      lastChangedBy: origin,
    };

    this.recalculateDerived(nextState);
    this.state = nextState;

    this.addAuditLog({
      origin,
      toolName: 'select_target',
      arguments: { targetId },
      resultSummary: `Target updated to ${targetObj.displayName}`,
      revisionBefore: revBefore,
      revisionAfter: this.state.revision,
      durationMs: 3,
      status: 'ok',
    });

    this.notify();
  }

  public setEntryPoint(newEntry: Vector3Tuple, origin: MutationOrigin = 'human') {
    const revBefore = this.state.revision;
    this.invalidateApprovalInternal();

    const prevTraj = {
      entryPoint: [...this.state.entryPoint] as Vector3Tuple,
      targetPoint: [...this.state.targetPoint] as Vector3Tuple,
    };

    const nextState: PlanState = {
      ...this.state,
      entryPoint: [...newEntry],
      previousTrajectory: prevTraj,
      stagedCandidate: null,
      revision: this.state.revision + 1,
      lastChangedBy: origin,
    };

    this.recalculateDerived(nextState);
    this.state = nextState;

    this.addAuditLog({
      origin,
      toolName: 'set_entry_point',
      arguments: { entryPoint: newEntry },
      resultSummary: `Manual entry point adjustment to [${newEntry.map((v) => v.toFixed(1)).join(', ')}]`,
      revisionBefore: revBefore,
      revisionAfter: this.state.revision,
      durationMs: 3,
      status: 'ok',
    });

    this.notify();
  }

  public setPriorities(
    priorities: Partial<HumanPriorities>,
    origin: MutationOrigin = 'human'
  ) {
    const revBefore = this.state.revision;
    this.invalidateApprovalInternal();

    this.state = {
      ...this.state,
      priorities: { ...this.state.priorities, ...priorities },
      revision: this.state.revision + 1,
      lastChangedBy: origin,
    };

    this.addAuditLog({
      origin,
      toolName: 'set_priorities',
      arguments: priorities,
      resultSummary: 'Updated human planning priorities',
      revisionBefore: revBefore,
      revisionAfter: this.state.revision,
      durationMs: 2,
      status: 'ok',
    });

    this.notify();
  }

  public setSearchCandidates(candidates: CandidateTrajectory[]) {
    this.state = {
      ...this.state,
      searchCandidates: candidates,
    };
    this.notify();
  }

  public setHoveredCandidate(id: string | null) {
    if (this.state.hoveredCandidateId !== id) {
      this.state = { ...this.state, hoveredCandidateId: id };
      this.notify();
    }
  }

  public setShowMachineHaptics(show: boolean) {
    this.state = { ...this.state, showMachineHaptics: show };
    this.notify();
  }

  public setIsSearching(isSearching: boolean) {
    this.state = { ...this.state, isSearching };
    this.notify();
  }

  /**
   * Staging a candidate corridor.
   * Enforces optimistic concurrency if expectedRevision is supplied.
   */
  public stageCandidate(
    candidateId: string,
    origin: MutationOrigin,
    expectedRevision?: number
  ): { ok: boolean; code?: string; message?: string; currentRevision: number } {
    if (expectedRevision !== undefined && expectedRevision !== this.state.revision) {
      return {
        ok: false,
        code: 'REVISION_CONFLICT',
        message: 'The shared plan changed. Inspect current state before modifying it.',
        currentRevision: this.state.revision,
      };
    }

    const candidate = this.state.searchCandidates.find(
      (c) => c.candidateId === candidateId
    );

    if (!candidate) {
      return {
        ok: false,
        code: 'CANDIDATE_NOT_FOUND',
        message: `Candidate ${candidateId} not found in current search results.`,
        currentRevision: this.state.revision,
      };
    }

    // Save previous state for undo capability
    this.undoStack.push({
      entryPoint: [...this.state.entryPoint],
      targetPoint: [...this.state.targetPoint],
      stagedCandidate: this.state.stagedCandidate,
      previousTrajectory: this.state.previousTrajectory,
      revision: this.state.revision,
    });

    this.invalidateApprovalInternal();

    const prevTraj = {
      entryPoint: [...this.state.entryPoint] as Vector3Tuple,
      targetPoint: [...this.state.targetPoint] as Vector3Tuple,
    };

    const nextState: PlanState = {
      ...this.state,
      entryPoint: [...candidate.entryPoint],
      targetPoint: [...candidate.targetPoint],
      stagedCandidate: candidate,
      previousTrajectory: prevTraj,
      revision: this.state.revision + 1,
      lastChangedBy: origin,
    };

    this.recalculateDerived(nextState);
    this.state = nextState;

    this.notify();

    return {
      ok: true,
      currentRevision: this.state.revision,
    };
  }

  /**
   * Preview stimulation parameters.
   * Enforces optimistic concurrency if expectedRevision is supplied.
   */
  public previewStimulation(
    params: Partial<StimulationParams>,
    origin: MutationOrigin,
    expectedRevision?: number
  ): {
    ok: boolean;
    code?: string;
    message?: string;
    currentRevision: number;
    preview?: PlanState['stimulationPreview'];
  } {
    if (expectedRevision !== undefined && expectedRevision !== this.state.revision) {
      return {
        ok: false,
        code: 'REVISION_CONFLICT',
        message: 'The shared plan changed. Inspect current state before modifying it.',
        currentRevision: this.state.revision,
      };
    }

    this.invalidateApprovalInternal();

    const nextStimulation: StimulationParams = {
      current_mA: params.current_mA ?? this.state.stimulation.current_mA,
      frequency_Hz: params.frequency_Hz ?? this.state.stimulation.frequency_Hz,
      pulseWidth_us: params.pulseWidth_us ?? this.state.stimulation.pulseWidth_us,
      contacts: params.contacts ?? this.state.stimulation.contacts,
    };

    const nextState: PlanState = {
      ...this.state,
      stimulation: nextStimulation,
      revision: this.state.revision + 1,
      lastChangedBy: origin,
    };

    this.recalculateDerived(nextState);
    this.state = nextState;

    this.notify();

    return {
      ok: true,
      currentRevision: this.state.revision,
      preview: this.state.stimulationPreview,
    };
  }

  /**
   * Undoes the latest reversible staged agent mutation.
   */
  public undoAgentChange(
    origin: MutationOrigin,
    expectedRevision?: number
  ): { ok: boolean; code?: string; message?: string; currentRevision: number } {
    if (expectedRevision !== undefined && expectedRevision !== this.state.revision) {
      return {
        ok: false,
        code: 'REVISION_CONFLICT',
        message: 'The shared plan changed. Inspect current state before modifying it.',
        currentRevision: this.state.revision,
      };
    }

    if (this.undoStack.length === 0) {
      return {
        ok: false,
        code: 'NOTHING_TO_UNDO',
        message: 'No staged agent changes available to undo.',
        currentRevision: this.state.revision,
      };
    }

    const previousState = this.undoStack.pop()!;
    this.invalidateApprovalInternal();

    const nextState: PlanState = {
      ...this.state,
      entryPoint: previousState.entryPoint,
      targetPoint: previousState.targetPoint,
      stagedCandidate: previousState.stagedCandidate,
      previousTrajectory: previousState.previousTrajectory,
      revision: this.state.revision + 1,
      lastChangedBy: origin,
    };

    this.recalculateDerived(nextState);
    this.state = nextState;

    this.notify();

    return {
      ok: true,
      currentRevision: this.state.revision,
    };
  }

  /**
   * Human Approval Gate.
   * Can ONLY be called by human action.
   */
  public async approvePlan(): Promise<{ digest: string; revision: number }> {
    const canonicalJson = canonicalizePlan(this.state);
    const digest = await computePlanDigest(canonicalJson);

    this.state = {
      ...this.state,
      approval: {
        isApproved: true,
        approvedRevision: this.state.revision,
        approvalDigest: digest,
        approvedAt: new Date().toISOString(),
      },
    };

    this.addAuditLog({
      origin: 'human',
      toolName: 'approve_research_plan',
      arguments: { revision: this.state.revision },
      resultSummary: `Approved research plan (SHA-256: ${digest.substring(0, 12)}...)`,
      revisionBefore: this.state.revision,
      revisionAfter: this.state.revision,
      durationMs: 5,
      status: 'ok',
      rawResult: { digest },
    });

    this.notify();

    return {
      digest,
      revision: this.state.revision,
    };
  }
}

export const planStore = new PlanStore();
