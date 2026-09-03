import React, { useMemo } from 'react';
import { PlanState, CandidateTrajectory } from '../core/types';
import { trajectoryLength, distance } from '../core/geometry';
import { TARGET_STRUCTURES } from '../core/brainData';
import { evaluateMachineHaptics } from '../core/riskField';
import { toolHandlers } from '../webmcp/registerTools';
import { Eye } from 'lucide-react';

interface PathComparisonViewProps {
  planState: PlanState;
  onOpen3D: () => void;
}

export const PathComparisonView: React.FC<PathComparisonViewProps> = ({
  planState,
  onOpen3D,
}) => {
  const {
    entryPoint,
    targetPoint,
    nominalEntry,
    targetId,
    stagedCandidate,
    searchCandidates,
    machineHaptics,
    revision,
  } = planState;

  const targetObj = TARGET_STRUCTURES[targetId] || TARGET_STRUCTURES.tremor_center;
  const currentLength = trajectoryLength(entryPoint, targetPoint);
  const currentClearance = machineHaptics.nearestHazard.clearanceMm;
  const currentTension = machineHaptics.constraintTension;
  const currentTargetError = distance(targetPoint, targetObj.center);

  // Authoritative nominal baseline calculation
  const nominalHaptics = useMemo(() => {
    return evaluateMachineHaptics(nominalEntry, targetObj.center, undefined, targetObj.id);
  }, [nominalEntry, targetObj]);
  const nominalLength = trajectoryLength(nominalEntry, targetObj.center);
  const nominalClearance = nominalHaptics.machineHaptics.nearestHazard.clearanceMm;

  const handleStage = async (c: CandidateTrajectory) => {
    await toolHandlers.neuralhaptics_stage_corridor(
      {
        candidateId: c.candidateId,
        expectedRevision: revision,
      },
      'human'
    );
  };

  return (
    <div className="relative w-full h-full bg-[#0A0D14] border border-slate-800 flex flex-col select-none overflow-hidden">
      {/* Header bar */}
      <div className="h-6 px-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400 z-10">
        <span className="font-semibold text-slate-200 tracking-wide">
          PATH COMPARISON · SPATIAL TRADE-OFFS
        </span>
        <button
          onClick={onOpen3D}
          className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
          title="Toggle 3D View"
        >
          <Eye className="w-3 h-3" />
          <span>3D Overview</span>
        </button>
      </div>

      {/* Comparison Body */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 font-sans">
        {/* Active vs Nominal Comparison Table */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Active Trajectory Card */}
          <div className="bg-slate-900/60 border border-amber-500/40 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-amber-300">
              <span>{stagedCandidate ? `Proposed: ${stagedCandidate.candidateId}` : 'Active Trajectory'}</span>
              <span className="text-[10px] font-mono text-slate-400">rev #{revision}</span>
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Clearance:</span>
                <span className={`font-bold ${currentClearance >= 2.5 ? 'text-emerald-400' : currentClearance >= 1.5 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {currentClearance.toFixed(1)} mm
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Error:</span>
                <span className="text-slate-200">{currentTargetError.toFixed(1)} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Path Length:</span>
                <span className="text-slate-200">{currentLength.toFixed(1)} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Haptic Tension:</span>
                <span className="text-purple-300 font-bold">{currentTension.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Nominal Baseline Reference Card */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
              <span>Nominal Baseline</span>
              <span className="text-[10px] font-mono text-slate-400">Anatomy</span>
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Clearance:</span>
                <span className="text-slate-300 font-mono">{nominalClearance.toFixed(1)} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Error:</span>
                <span className="text-slate-400">0.0 mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Path Length:</span>
                <span className="text-slate-400">{nominalLength.toFixed(1)} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-slate-400">Unoptimized</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Pareto Search Candidates List */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span>Agent Pareto Candidates</span>
            <span className="text-[10px] font-mono text-slate-400">{searchCandidates.length} evaluated</span>
          </div>

          {searchCandidates.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-lg">
              Click &ldquo;Find Safe Paths&rdquo; to search 512 trajectory corridors.
            </div>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {searchCandidates.slice(0, 3).map((c, idx) => {
                const isSelected = stagedCandidate?.candidateId === c.candidateId;
                return (
                  <div
                    key={c.candidateId}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 text-white'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-mono text-[11px]">
                      <span className="font-semibold text-slate-200">#{idx + 1} {c.candidateId}</span>
                      <span className="text-slate-400 mx-1.5">&bull;</span>
                      <span className="text-emerald-400">{c.vesselClearanceMm.toFixed(1)}mm clr</span>
                      <span className="text-slate-400 mx-1.5">&bull;</span>
                      <span className="text-purple-300">{c.constraintTension.toFixed(2)} tension</span>
                    </div>

                    <button
                      onClick={() => handleStage(c)}
                      disabled={isSelected}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isSelected ? 'Staged' : 'Stage'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
