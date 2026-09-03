import React, { useState } from 'react';
import { PlanState } from '../core/types';
import { planStore } from '../core/planStore';
import { localHarness } from '../webmcp/localHarness';
import { trajectoryLength, distance } from '../core/geometry';
import { TARGET_STRUCTURES } from '../core/brainData';
import { Check, RotateCcw, ChevronDown, ChevronRight, Bot } from 'lucide-react';

interface AgentProposalPanelProps {
  planState: PlanState;
}

export const AgentProposalPanel: React.FC<AgentProposalPanelProps> = ({ planState }) => {
  const {
    entryPoint,
    targetPoint,
    targetId,
    stagedCandidate,
    machineHaptics,
    approval,
    revision,
    auditLog,
  } = planState;

  const [isApproving, setIsApproving] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showDevHarness, setShowDevHarness] = useState(false);

  const targetObj = TARGET_STRUCTURES[targetId] || TARGET_STRUCTURES.stn_target;
  const clearanceMm = machineHaptics.nearestHazard.clearanceMm;
  const targetErrorMm = distance(targetPoint, targetObj.center);
  const lengthMm = trajectoryLength(entryPoint, targetPoint);
  const tension = machineHaptics.constraintTension;

  const isAccepted = approval.isApproved && approval.approvedRevision === revision;

  const handleAccept = async () => {
    setIsApproving(true);
    try {
      await planStore.approvePlan();
    } finally {
      setIsApproving(false);
    }
  };

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      await localHarness.undoAgentChange();
    } finally {
      setIsUndoing(false);
    }
  };

  const handleDownload = () => {
    const data = {
      plan: {
        case: planState.selectedCaseId,
        target: planState.targetId,
        revision: planState.revision,
        trajectory: {
          entry: planState.entryPoint,
          target: planState.targetPoint,
        },
        metrics: {
          vesselClearanceMm: clearanceMm,
          targetErrorMm: targetErrorMm,
          trajectoryLengthMm: lengthMm,
          constraintTension: tension,
        },
        approval: {
          isApproved: approval.isApproved,
          approvedRevision: approval.approvedRevision,
          approvedAt: approval.approvedAt,
        },
      },
      disclaimer: 'Research simulation using synthetic anatomy. Not a medical device or clinical recommendation.',
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neuralhaptics-plan-${planState.selectedCaseId}-rev${revision}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3 text-slate-200 text-xs select-none">
      {/* Primary Card: AGENT PROPOSAL */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-100">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span className="tracking-wide text-[11px] uppercase">Agent Proposal</span>
          </div>
          {stagedCandidate ? (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-semibold border border-amber-500/40">
              {stagedCandidate.candidateId}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
              Active Path
            </span>
          )}
        </div>

        {/* 4 Focused Metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-slate-950/70 p-2 rounded border border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-sans">Vessel Clearance</div>
            <div className={`text-sm font-bold ${clearanceMm >= 2.5 ? 'text-emerald-400' : clearanceMm >= 1.5 ? 'text-amber-400' : 'text-rose-400'}`}>
              {clearanceMm.toFixed(1)} mm
            </div>
          </div>

          <div className="bg-slate-950/70 p-2 rounded border border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-sans">Target Error</div>
            <div className="text-sm font-bold text-slate-200">
              {targetErrorMm.toFixed(1)} mm
            </div>
          </div>

          <div className="bg-slate-950/70 p-2 rounded border border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-sans">Trajectory Length</div>
            <div className="text-sm font-bold text-slate-200">
              {lengthMm.toFixed(1)} mm
            </div>
          </div>

          <div className="bg-slate-950/70 p-2 rounded border border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-sans">Haptic Tension</div>
            <div className="text-sm font-bold text-purple-300">
              {tension.toFixed(2)} / 1.0
            </div>
          </div>
        </div>

        {/* Short Explanation */}
        <div className="text-[11px] text-slate-400 font-sans leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800/60">
          {stagedCandidate ? (
            <span>
              Staged candidate <strong className="text-slate-200">{stagedCandidate.candidateId}</strong> optimizes vascular distance (
              <strong className="text-emerald-400">{clearanceMm.toFixed(1)}mm</strong>) while strictly clearing the Internal Capsule.
            </span>
          ) : (
            <span>
              Exposing authoritative 3D spatial semantics (target attraction, hazard clearances, repulsion tensors) directly to WebMCP.
            </span>
          )}
        </div>

        {/* Acceptance / Undo Buttons */}
        <div className="flex gap-2 pt-1">
          {isAccepted ? (
            <div className="w-full flex items-center justify-between p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Plan Accepted (Rev #{approval.approvedRevision})
              </span>
              <button
                onClick={handleDownload}
                className="text-[10px] text-cyan-400 hover:underline font-mono"
              >
                Export JSON
              </button>
            </div>
          ) : (
            <button
              onClick={handleAccept}
              disabled={isApproving}
              className="flex-1 py-2 px-3 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-colors active:scale-[0.99] disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isApproving ? 'Accepting...' : 'Accept Plan'}</span>
            </button>
          )}

          <button
            onClick={handleUndo}
            disabled={isUndoing}
            className="py-2 px-3 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs flex items-center gap-1 transition-colors active:scale-[0.99] disabled:opacity-50"
            title="Undo staged agent change"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Undo</span>
          </button>
        </div>
      </div>

      {/* Collapsible: WebMCP Activity (Default Collapsed) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowAudit(!showAudit)}
          className="w-full p-2.5 flex items-center justify-between text-left text-xs font-medium text-slate-300 hover:bg-slate-850/60 transition-colors"
        >
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            {showAudit ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            <span>WebMCP Activity</span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-cyan-400 font-semibold">{auditLog.length} calls</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {showAudit ? 'Collapse' : 'Expand'}
          </span>
        </button>

        {showAudit && (
          <div className="p-2 border-t border-slate-800 space-y-1.5 max-h-56 overflow-y-auto font-mono text-[10px]">
            {auditLog.length === 0 ? (
              <div className="py-4 text-center text-slate-500">No calls recorded yet.</div>
            ) : (
              auditLog.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="p-1.5 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <span className="text-cyan-300 font-semibold">{entry.toolName}</span>
                    <div className="text-[9px] text-slate-500 truncate">{entry.resultSummary}</div>
                  </div>
                  <div className="text-right text-slate-500 flex-shrink-0">
                    <div>{entry.durationMs}ms</div>
                    <div>rev {entry.revisionAfter}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Developer Disclosure: Local Test Harness */}
      <div className="text-[10px] text-slate-500">
        <button
          onClick={() => setShowDevHarness(!showDevHarness)}
          className="hover:text-slate-400 transition-colors flex items-center gap-1 font-mono"
        >
          <span>{showDevHarness ? '▾' : '▸'} Developer Simulation Tools</span>
        </button>

        {showDevHarness && (
          <div className="mt-1.5 p-2 rounded bg-slate-950 border border-slate-800/80 flex gap-1.5">
            <button
              onClick={() => localHarness.searchCorridors({ minimumVesselClearanceMm: 2.0 })}
              className="flex-1 py-1 px-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] border border-slate-700"
            >
              Simulate Search
            </button>
            <button
              onClick={async () => {
                const res = await localHarness.searchCorridors({ minimumVesselClearanceMm: 2.0 });
                if (res.candidates.length > 0) {
                  await localHarness.stageCorridor(res.candidates[0].candidateId);
                }
              }}
              className="flex-1 py-1 px-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] border border-slate-700"
            >
              Simulate Stage
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
