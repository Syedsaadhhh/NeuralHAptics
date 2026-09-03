import React, { useState } from 'react';
import { PlanState } from '../core/types';
import { planStore } from '../core/planStore';
import { ShieldCheck, Lock, Download, Copy, Check, AlertTriangle, KeyRound, Sparkles } from 'lucide-react';

interface ApprovalGateProps {
  planState: PlanState;
}

export const ApprovalGate: React.FC<ApprovalGateProps> = ({ planState }) => {
  const [copied, setCopied] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const { approval, revision } = planState;
  const isCurrentlyApproved = approval.isApproved && approval.approvedRevision === revision;

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await planStore.approvePlan();
    } finally {
      setIsApproving(false);
    }
  };

  const handleCopyDigest = () => {
    if (approval.approvalDigest) {
      navigator.clipboard.writeText(approval.approvalDigest);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPlan = () => {
    const data = {
      plan: {
        case: planState.selectedCaseId,
        target: planState.targetId,
        revision: planState.revision,
        trajectory: {
          entry: planState.entryPoint,
          target: planState.targetPoint,
        },
        stimulation: planState.stimulation,
        metrics: {
          vesselClearanceMm: planState.machineHaptics.nearestHazard.clearanceMm,
          targetCoveragePercent: planState.stimulationPreview.targetCoveragePercent,
          avoidanceOverlapPercent: planState.stimulationPreview.avoidanceOverlapPercent,
          constraintTension: planState.machineHaptics.constraintTension,
          shannonStatus: planState.stimulationPreview.shannon.referenceStatus,
        },
        approval: {
          digest: approval.approvalDigest,
          approvedRevision: approval.approvedRevision,
          approvedAt: approval.approvedAt,
        },
      },
      disclaimer:
        'Research simulation using synthetic anatomy. Not a medical device or clinical recommendation.',
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
    <div className="glass-card rounded-2xl p-3.5 space-y-3 shadow-panel">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs">
          <KeyRound className="w-4 h-4 text-amber-400" />
          <span>Human Verification & Sealing</span>
        </div>
        <div>
          {isCurrentlyApproved ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 font-mono text-xs font-semibold shadow-glow-cyan">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              SEALED REV #{approval.approvedRevision}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 font-mono text-xs font-semibold">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              UNSEALED
            </span>
          )}
        </div>
      </div>

      <div className="text-xs text-slate-400 leading-relaxed">
        AI agents cannot self-approve plans. Explicit human approval cryptographically seals the plan revision with a SHA-256 digest and dynamically unlocks export tools.
      </div>

      {isCurrentlyApproved ? (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-3 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400 text-xs font-medium">SHA-256 Plan Fingerprint:</span>
            <button
              onClick={handleCopyDigest}
              className="flex items-center gap-1 text-xs text-slate-300 hover:text-white transition-colors"
              title="Copy SHA-256 digest"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div
            className="text-[11px] text-emerald-400 break-all bg-slate-950 p-2 rounded-lg border border-slate-800 select-all font-mono"
            title={approval.approvalDigest || ''}
          >
            {approval.approvalDigest}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
            <span className="text-slate-400">Export Tool Status:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Dynamic Tool Registered
            </span>
          </div>

          <button
            onClick={handleDownloadPlan}
            className="w-full mt-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-500 font-medium text-xs transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            Download Sealed Plan JSON
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {approval.approvedRevision !== null && (
            <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Prior approval invalidated by revision mutation ({approval.approvedRevision} &rarr; {revision}).</span>
            </div>
          )}

          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-glow-amber transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {isApproving ? 'Computing SHA-256 Digest...' : 'Approve & Seal Stereotactic Plan'}
          </button>
        </div>
      )}
    </div>
  );
};
