import React from 'react';
import { PlanState } from '../core/types';
import { planStore } from '../core/planStore';
import { CASE_PRESETS, TARGET_STRUCTURES } from '../core/brainData';
import { toolHandlers } from '../webmcp/registerTools';
import { Search, Eye } from 'lucide-react';

interface ConstraintPanelProps {
  planState: PlanState;
}

export const ConstraintPanel: React.FC<ConstraintPanelProps> = ({ planState }) => {
  const {
    priorities,
    selectedCaseId,
    targetId,
    showMachineHaptics,
    isSearching,
  } = planState;

  const handlePriorityChange = (field: keyof typeof priorities, value: number) => {
    planStore.setPriorities({ [field]: value }, 'human');
  };

  const handleCaseChange = (caseId: 'case_a' | 'case_b') => {
    planStore.selectCase(caseId, 'human');
  };

  const handleTargetChange = (tId: string) => {
    planStore.selectTarget(tId, 'human');
  };

  const handleManualSearch = async () => {
    await toolHandlers.neuralhaptics_search_corridors(
      {
        minimumVesselClearanceMm: priorities.minimumVesselClearanceMm,
        priorities,
      },
      'human'
    );
  };

  return (
    <div className="flex flex-col gap-3 text-slate-200 text-xs select-none">
      {/* Section 1: Synthetic Clinical Case */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Clinical Case
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {(['case_a', 'case_b'] as const).map((cId) => {
            const preset = CASE_PRESETS[cId];
            const isSelected = selectedCaseId === cId;
            return (
              <button
                key={cId}
                onClick={() => handleCaseChange(cId)}
                className={`p-2 rounded border text-left transition-colors ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500/60 text-white font-semibold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="text-[11px] font-medium text-slate-200">
                  {cId === 'case_a' ? 'Case A' : 'Case B'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {preset.name.split('—')[1]?.trim() || preset.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Target Nucleus */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Target Nucleus
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.values(TARGET_STRUCTURES).map((target) => {
            const isSelected = targetId === target.id;
            const shortLabel = target.id === 'tremor_center' ? 'STN' : 'GPi';
            return (
              <button
                key={target.id}
                onClick={() => handleTargetChange(target.id)}
                className={`p-2 rounded border flex items-center gap-2 transition-colors ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500/60 text-white font-semibold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: target.color }}
                />
                <div className="truncate text-left">
                  <div className="text-[11px] font-bold text-slate-200">{shortLabel}</div>
                  <div className="text-[9px] text-slate-400 font-mono">r={target.radius}mm</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Minimum Vessel Clearance Slider */}
      <div className="space-y-1.5 pt-1 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-slate-300">Min Vessel Clearance</label>
          <span className="font-mono text-amber-400 font-bold">
            {priorities.minimumVesselClearanceMm.toFixed(1)} mm
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="4.0"
          step="0.1"
          value={priorities.minimumVesselClearanceMm}
          onChange={(e) => handlePriorityChange('minimumVesselClearanceMm', parseFloat(e.target.value))}
          className="w-full accent-amber-400 cursor-pointer"
        />
      </div>

      {/* Section 4: Planning Priority Slider (Clearance ↔ Shorter Path) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-slate-300">Planning Bias</label>
          <span className="font-mono text-[10px] text-cyan-300">
            {priorities.vascularClearance > 0.6 ? 'Max Clearance' : 'Shorter Path'}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={priorities.vascularClearance}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            planStore.setPriorities(
              {
                vascularClearance: val,
                trajectoryLength: 1 - val,
              },
              'human'
            );
          }}
          className="w-full accent-cyan-400 cursor-pointer"
        />
        <div className="flex justify-between text-[9px] font-mono text-slate-500">
          <span>Short Path</span>
          <span>Max Clearance</span>
        </div>
      </div>

      {/* Section 5: Machine Haptics Visual Toggle */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
        <span className="text-[11px] text-slate-300">Machine Haptics Overlay</span>
        <button
          onClick={() => planStore.setShowMachineHaptics(!showMachineHaptics)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
            showMachineHaptics
              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-900 text-slate-400 border-slate-800'
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>{showMachineHaptics ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Primary Action Button: FIND SAFE PATHS */}
      <div className="pt-2">
        <button
          onClick={handleManualSearch}
          disabled={isSearching}
          className="w-full py-2 px-3 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-colors active:scale-[0.99] disabled:opacity-50"
        >
          <Search className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
          <span>{isSearching ? 'Evaluating 512 Paths...' : 'FIND SAFE PATHS'}</span>
        </button>
      </div>
    </div>
  );
};
