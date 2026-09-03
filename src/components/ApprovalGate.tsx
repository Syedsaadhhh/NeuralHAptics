import React, { useState } from 'react';
import { PlanState } from '../core/types';
import { planStore } from '../core/planStore';
import { ShieldCheck, Lock, Download, Copy, Check, AlertTriangle, KeyRound } from 'lucide-react';

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
    <div className="bg-dark-900 border border-dark-700/80 rounded-lg p-3 text-xs space-y-2.5 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <KeyRound className="w-3.5 h-3.5 text-haptic-amber" />
          <span>Dynamic Human Approval Gate</span>
        </div>
        <div className="flex items-center gap-1">
          {isCurrentlyApproved ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-mono text-[10px]">
              <ShieldCheck className="w-3 h-3" />
              APPROVED REV {approval.approvedRevision}
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-dark-800 text-slate-400 border border-dark-700 font-mono text-[10px]">
              <Lock className="w-3 h-3 text-slate-500" />
              UNAPPROVED
            </span>
          )}
        </div>
      </div>

      <div className="text-[11px] text-slate-400 leading-relaxed">
        AI agents cannot self-approve plans. Explicit human approval signs the state with a SHA-256 digest and dynamically unlocks the{' '}
        <code className="text-haptic-cyan bg-dark-800 px-1 py-0.5 rounded text-[10px] font-mono">
          neuralhaptics_export_approved_plan
        </code>{' '}
        WebMCP tool.
      </div>

      {isCurrentlyApproved ? (
        <div className="bg-dark-950 border border-emerald-500/30 rounded p-2 space-y-2 font-mono text-[11px]">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400 text-[10px]">SHA-256 Digest:</span>
            <button
              onClick={handleCopyDigest}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors"
              title="Copy SHA-256 digest"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div
            className="text-[10px] text-emerald-400 break-all bg-dark-900/90 p-1.5 rounded border border-dark-800 select-all"
            title={approval.approvalDigest || ''}
          >
            {approval.approvalDigest}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-dark-800 text-[10px]">
            <span className="text-slate-400">Dynamic Tool Status:</span>
            <span className="text-emerald-400 font-medium">REGISTERED & EXPORTABLE</span>
          </div>

          <button
            onClick={handleDownloadPlan}
            className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 hover:border-slate-500 font-sans transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-haptic-cyan" />
            Download Approved JSON
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {approval.approvedRevision !== null && (
            <div className="flex items-center gap-1.5 text-amber-400 bg-amber-950/30 border border-amber-500/30 p-1.5 rounded text-[10px]">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Prior approval invalidated by revision change ({approval.approvedRevision} &rarr; {revision}).</span>
            </div>
          )}

          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-dark-950 font-semibold text-xs shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4 text-dark-950" />
            {isApproving ? 'Computing SHA-256...' : 'Approve Research Plan'}
          </button>
        </div>
      )}
    </div>
  );
};
