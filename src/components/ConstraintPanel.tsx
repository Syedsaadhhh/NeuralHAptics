import React from 'react';
import { PlanState, Vector3Tuple } from '../core/types';
import { planStore } from '../core/planStore';
import { CASE_PRESETS, TARGET_STRUCTURES } from '../core/brainData';
import { localHarness } from '../webmcp/localHarness';
import { Sliders, Eye, Search } from 'lucide-react';

interface ConstraintPanelProps {
  planState: PlanState;
}

export const ConstraintPanel: React.FC<ConstraintPanelProps> = ({ planState }) => {
  const { priorities, selectedCaseId, targetId, entryPoint, showMachineHaptics, isSearching, searchCandidates } =
    planState;

  const handlePriorityChange = (field: keyof typeof priorities, value: number) => {
    planStore.setPriorities({ [field]: value }, 'human');
  };

  const handleCaseChange = (caseId: 'case_a' | 'case_b') => {
    planStore.selectCase(caseId, 'human');
  };

  const handleTargetChange = (tId: string) => {
    planStore.selectTarget(tId, 'human');
  };

  const handleEntryAdjust = (axis: 0 | 1 | 2, delta: number) => {
    const nextEntry: Vector3Tuple = [...entryPoint];
    nextEntry[axis] = Number((nextEntry[axis] + delta).toFixed(2));
    planStore.setEntryPoint(nextEntry, 'human');
  };

  const handleManualSearch = async () => {
    await localHarness.searchCorridors({
      minimumVesselClearanceMm: priorities.minimumVesselClearanceMm,
      priorities,
    });
  };

  return (
    <div className="bg-dark-900 border border-dark-700/80 rounded-lg p-3 text-xs space-y-3.5 shadow-lg max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Sliders className="w-4 h-4 text-haptic-cyan" />
          <span>Human Priority Controls</span>
        </div>
        <button
          onClick={() => planStore.setShowMachineHaptics(!showMachineHaptics)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
            showMachineHaptics
              ? 'bg-cyan-950/60 text-haptic-cyan border-haptic-cyan/40 shadow-[0_0_8px_rgba(0,229,255,0.2)]'
              : 'bg-dark-800 text-slate-400 border-dark-700'
          }`}
          title="Toggle visual display of machine haptic risk and repulsion vectors"
        >
          <Eye className="w-3 h-3" />
          <span>Haptics: {showMachineHaptics ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Case Selector */}
      <div className="space-y-1.5">
        <label className="text-slate-400 font-medium text-[11px]">Synthetic Clinical Case</label>
        <div className="grid grid-cols-2 gap-1.5">
          {(['case_a', 'case_b'] as const).map((cId) => {
            const preset = CASE_PRESETS[cId];
            const isSelected = selectedCaseId === cId;
            return (
              <button
                key={cId}
                onClick={() => handleCaseChange(cId)}
                className={`p-2 rounded text-left border transition-all ${
                  isSelected
                    ? 'bg-dark-800 border-haptic-cyan/60 text-white shadow-sm'
                    : 'bg-dark-850/60 border-dark-750 text-slate-400 hover:border-dark-700'
                }`}
              >
                <div className="font-semibold text-[11px] truncate">{preset.name.split('—')[0]}</div>
                <div className="text-[10px] text-slate-400 truncate">{preset.indication.split('(')[0]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Structure Selector */}
      <div className="space-y-1.5">
        <label className="text-slate-400 font-medium text-[11px]">Target Nucleus</label>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.values(TARGET_STRUCTURES).map((target) => {
            const isSelected = targetId === target.id;
            return (
              <button
                key={target.id}
                onClick={() => handleTargetChange(target.id)}
                className={`p-2 rounded text-left border transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-dark-800 border-haptic-cyan/60 text-white'
                    : 'bg-dark-850/60 border-dark-750 text-slate-400 hover:border-dark-700'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: target.color }} />
                <div className="truncate">
                  <div className="font-semibold text-[11px] truncate">{target.displayName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">r={target.radius}mm</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders: Human Planning Priorities */}
      <div className="space-y-2.5 pt-1 border-t border-dark-800">
        <div className="flex items-center justify-between">
          <label className="text-slate-300 font-medium text-[11px]">Planning Priorities</label>
          <span className="text-[10px] text-slate-400">Agent Guidance</span>
        </div>

        {/* Min Vessel Clearance */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Minimum Vessel Clearance:</span>
            <span className="text-haptic-amber font-mono font-semibold">{priorities.minimumVesselClearanceMm.toFixed(1)} mm</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="4.0"
            step="0.1"
            value={priorities.minimumVesselClearanceMm}
            onChange={(e) => handlePriorityChange('minimumVesselClearanceMm', parseFloat(e.target.value))}
            className="w-full accent-amber-400 h-1.5 bg-dark-750 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Vascular Clearance Weight */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Vascular Avoidance Priority:</span>
            <span className="text-slate-200 font-mono">{(priorities.vascularClearance * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={priorities.vascularClearance}
            onChange={(e) => handlePriorityChange('vascularClearance', parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-dark-750 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Target Coverage Weight */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Target Overlap Priority:</span>
            <span className="text-slate-200 font-mono">{(priorities.targetAccuracy * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={priorities.targetAccuracy}
            onChange={(e) => handlePriorityChange('targetAccuracy', parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-dark-750 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Internal Capsule Avoidance Weight */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Internal Capsule Avoidance:</span>
            <span className="text-slate-200 font-mono">{(priorities.avoidanceZone * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={priorities.avoidanceZone}
            onChange={(e) => handlePriorityChange('avoidanceZone', parseFloat(e.target.value))}
            className="w-full accent-red-400 h-1.5 bg-dark-750 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Trajectory Length Weight */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Min Trajectory Length:</span>
            <span className="text-slate-200 font-mono">{(priorities.trajectoryLength * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={priorities.trajectoryLength}
            onChange={(e) => handlePriorityChange('trajectoryLength', parseFloat(e.target.value))}
            className="w-full accent-purple-400 h-1.5 bg-dark-750 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Manual Entry Point Fine Adjustment */}
      <div className="space-y-2 pt-1 border-t border-dark-800">
        <div className="flex items-center justify-between">
          <label className="text-slate-300 font-medium text-[11px]">Manual Cortical Entry</label>
          <span className="text-[10px] font-mono text-slate-400">
            [{entryPoint.map((v) => v.toFixed(1)).join(', ')}] mm
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
          {(['X', 'Y', 'Z'] as const).map((axis, i) => (
            <div key={axis} className="bg-dark-800/80 border border-dark-700/80 rounded p-1 flex items-center justify-between">
              <span className="text-slate-400 pl-1">{axis}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEntryAdjust(i as 0 | 1 | 2, -1.0)}
                  className="w-5 h-5 rounded bg-dark-700 hover:bg-dark-600 text-slate-200 font-bold flex items-center justify-center transition-colors"
                >
                  -
                </button>
                <button
                  onClick={() => handleEntryAdjust(i as 0 | 1 | 2, 1.0)}
                  className="w-5 h-5 rounded bg-dark-700 hover:bg-dark-600 text-slate-200 font-bold flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Trajectories Button */}
      <div className="pt-1 border-t border-dark-800">
        <button
          onClick={handleManualSearch}
          disabled={isSearching}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded bg-dark-800 hover:bg-dark-750 border border-dark-600 text-slate-200 font-medium text-xs shadow transition-all active:scale-[0.99] disabled:opacity-50"
        >
          <Search className={`w-3.5 h-3.5 text-haptic-cyan ${isSearching ? 'animate-spin' : ''}`} />
          <span>{isSearching ? 'Searching 512 Corridors...' : `Search Corridors (${searchCandidates.length} Found)`}</span>
        </button>
      </div>
    </div>
  );
};
