import React, { useState } from 'react';
import { PlanState, Vector3Tuple } from '../core/types';
import { planStore } from '../core/planStore';
import { CASE_PRESETS, TARGET_STRUCTURES } from '../core/brainData';
import { localHarness } from '../webmcp/localHarness';
import {
  SlidersHorizontal,
  Eye,
  Search,
  Zap,
  Target,
  Navigation,
} from 'lucide-react';

interface ConstraintPanelProps {
  planState: PlanState;
}

export const ConstraintPanel: React.FC<ConstraintPanelProps> = ({ planState }) => {
  const {
    priorities,
    selectedCaseId,
    targetId,
    entryPoint,
    stimulation,
    showMachineHaptics,
    isSearching,
    searchCandidates,
    stagedCandidate,
    revision,
  } = planState;

  const [activeTab, setActiveTab] = useState<'trajectory' | 'priorities' | 'stimulation'>('trajectory');

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

  const handleStimulationChange = (field: keyof typeof stimulation, value: any) => {
    planStore.previewStimulation({ [field]: value }, 'human', revision);
  };

  const handleContactToggle = (contactIdx: number) => {
    const current = stimulation.contacts;
    const nextContacts = current.includes(contactIdx)
      ? current.filter((c) => c !== contactIdx)
      : [...current, contactIdx].sort();
    if (nextContacts.length === 0) return; // Maintain at least 1 active contact
    planStore.previewStimulation({ contacts: nextContacts }, 'human', revision);
  };

  const handleManualSearch = async () => {
    await localHarness.searchCorridors({
      minimumVesselClearanceMm: priorities.minimumVesselClearanceMm,
      priorities,
    });
  };

  const handleStageCandidate = (cId: string) => {
    planStore.stageCandidate(cId, 'human', revision);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Patient Case Selector Card */}
      <div className="glass-card rounded-2xl p-3.5 space-y-2.5 shadow-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Target className="w-4 h-4 text-cyan-400" />
            <span>Stereotactic Case</span>
          </div>
          <button
            onClick={() => planStore.setShowMachineHaptics(!showMachineHaptics)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              showMachineHaptics
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-glow-cyan'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
            title="Toggle 3D visual haptic vector streamlines"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Haptics: {showMachineHaptics ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Case Toggle Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {(['case_a', 'case_b'] as const).map((cId) => {
            const preset = CASE_PRESETS[cId];
            const isSelected = selectedCaseId === cId;
            return (
              <button
                key={cId}
                onClick={() => handleCaseChange(cId)}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-white shadow-glow-cyan'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-xs text-slate-100 flex items-center justify-between">
                  <span>{preset.name.split('—')[0].trim()}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">{preset.indication.split('(')[0].trim()}</div>
              </button>
            );
          })}
        </div>

        {/* Target Nucleus Selection Pills */}
        <div className="space-y-1.5 pt-1">
          <label className="text-slate-400 text-xs font-medium">Target Nucleus</label>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.values(TARGET_STRUCTURES).map((target) => {
              const isSelected = targetId === target.id;
              return (
                <button
                  key={target.id}
                  onClick={() => handleTargetChange(target.id)}
                  className={`p-2 rounded-xl text-left border transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/50 text-white shadow-sm'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: target.color }} />
                  <div className="truncate">
                    <div className="font-semibold text-xs text-slate-200">{target.displayName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">r={target.radius}mm</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Trajectory / Constraints / Stimulation */}
      <div className="flex rounded-xl p-1 glass-card shadow-panel">
        <button
          onClick={() => setActiveTab('trajectory')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
            activeTab === 'trajectory'
              ? 'bg-cyan-500/20 text-cyan-300 shadow-glow-cyan border border-cyan-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Trajectory
        </button>
        <button
          onClick={() => setActiveTab('priorities')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
            activeTab === 'priorities'
              ? 'bg-cyan-500/20 text-cyan-300 shadow-glow-cyan border border-cyan-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Constraints
        </button>
        <button
          onClick={() => setActiveTab('stimulation')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
            activeTab === 'stimulation'
              ? 'bg-cyan-500/20 text-cyan-300 shadow-glow-cyan border border-cyan-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Stimulation
        </button>
      </div>

      {/* Tab 1: Trajectory Coordinate Stepper & Pareto Search */}
      {activeTab === 'trajectory' && (
        <div className="space-y-3 flex-1 flex flex-col justify-between">
          {/* Cortical Entry Precision Nudge */}
          <div className="glass-card rounded-2xl p-3.5 space-y-2.5 shadow-panel">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-cyan-400" />
                Cortical Entry Point (Burr Hole)
              </span>
            </div>

            <div className="space-y-2">
              {(['X (Lateral)', 'Y (Anterior)', 'Z (Superior)'] as const).map((label, axisIdx) => (
                <div key={label} className="bg-slate-900/80 border border-slate-800 rounded-xl p-2 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-xs font-medium">{label}</span>
                    <div className="text-sm font-mono font-bold text-white">
                      {entryPoint[axisIdx].toFixed(1)} <span className="text-slate-500 text-xs font-normal">mm</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEntryAdjust(axisIdx as 0 | 1 | 2, -1.0)}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs border border-slate-700 transition-colors"
                      title="Nudge -1.0 mm"
                    >
                      -1.0
                    </button>
                    <button
                      onClick={() => handleEntryAdjust(axisIdx as 0 | 1 | 2, -0.2)}
                      className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-slate-700 transition-colors"
                      title="Nudge -0.2 mm"
                    >
                      -0.2
                    </button>
                    <button
                      onClick={() => handleEntryAdjust(axisIdx as 0 | 1 | 2, 0.2)}
                      className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-slate-700 transition-colors"
                      title="Nudge +0.2 mm"
                    >
                      +0.2
                    </button>
                    <button
                      onClick={() => handleEntryAdjust(axisIdx as 0 | 1 | 2, 1.0)}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs border border-slate-700 transition-colors"
                      title="Nudge +1.0 mm"
                    >
                      +1.0
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pareto Search & Candidates Section */}
          <div className="glass-card rounded-2xl p-3.5 space-y-2.5 shadow-panel flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-cyan-400" />
                Pareto Corridor Search
              </span>
              <span className="text-xs font-mono text-slate-400">{searchCandidates.length} Candidates</span>
            </div>

            <button
              onClick={handleManualSearch}
              disabled={isSearching}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <Search className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
              <span>{isSearching ? 'Evaluating 512 Corridors...' : 'Execute 512-Point Pareto Search'}</span>
            </button>

            {/* Candidates List */}
            {searchCandidates.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {searchCandidates.map((c, idx) => {
                  const isStaged = stagedCandidate?.candidateId === c.candidateId;
                  return (
                    <div
                      key={c.candidateId}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                        isStaged
                          ? 'bg-cyan-500/15 border-cyan-500/60 shadow-glow-cyan'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                          <span>#{idx + 1} &bull; {c.candidateId}</span>
                          {isStaged && <span className="text-[10px] text-cyan-300 font-mono font-bold">(STAGED)</span>}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                          <span>Vessel: <strong className="text-emerald-400">{c.vesselClearanceMm.toFixed(1)}mm</strong></span>
                          <span>&bull;</span>
                          <span>Tension: <strong className="text-purple-300">{c.constraintTension.toFixed(2)}</strong></span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleStageCandidate(c.candidateId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isStaged
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-glow-cyan'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {isStaged ? 'Active' : 'Stage 3D'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Planning Priorities & Constraints Sliders */}
      {activeTab === 'priorities' && (
        <div className="glass-card rounded-2xl p-3.5 space-y-3.5 shadow-panel flex-1">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              Human Planning Priorities
            </span>
            <span className="text-[11px] text-slate-400">Agent Weights</span>
          </div>

          {/* Min Vessel Clearance */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Minimum Vessel Clearance:</span>
              <span className="text-amber-400 font-mono font-bold text-sm">{priorities.minimumVesselClearanceMm.toFixed(1)} mm</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.1"
              value={priorities.minimumVesselClearanceMm}
              onChange={(e) => handlePriorityChange('minimumVesselClearanceMm', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Vascular Clearance Priority */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Vascular Avoidance Weight:</span>
              <span className="text-cyan-400 font-mono font-bold">{(priorities.vascularClearance * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={priorities.vascularClearance}
              onChange={(e) => handlePriorityChange('vascularClearance', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Target Accuracy Priority */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Target Nucleus Accuracy:</span>
              <span className="text-cyan-400 font-mono font-bold">{(priorities.targetAccuracy * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={priorities.targetAccuracy}
              onChange={(e) => handlePriorityChange('targetAccuracy', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Internal Capsule Avoidance */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Internal Capsule Avoidance:</span>
              <span className="text-rose-400 font-mono font-bold">{(priorities.avoidanceZone * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={priorities.avoidanceZone}
              onChange={(e) => handlePriorityChange('avoidanceZone', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Trajectory Length Minimization */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Shortest Path Minimization:</span>
              <span className="text-purple-400 font-mono font-bold">{(priorities.trajectoryLength * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={priorities.trajectoryLength}
              onChange={(e) => handlePriorityChange('trajectoryLength', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Tab 3: Stimulation Parameters */}
      {activeTab === 'stimulation' && (
        <div className="glass-card rounded-2xl p-3.5 space-y-3.5 shadow-panel flex-1">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Electrical Stimulation Proxy
            </span>
            <span className="text-[11px] text-slate-400 font-mono">DBS VTA</span>
          </div>

          {/* Active Electrode Contacts */}
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-medium">Active Electrode Contacts</label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((cIdx) => {
                const isActive = stimulation.contacts.includes(cIdx);
                return (
                  <button
                    key={cIdx}
                    onClick={() => handleContactToggle(cIdx)}
                    className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 shadow-glow-amber scale-105'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    C{cIdx}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current (mA) */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Current Amplitude:</span>
              <span className="text-amber-400 font-mono font-bold text-sm">{stimulation.current_mA.toFixed(1)} mA</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="6.0"
              step="0.1"
              value={stimulation.current_mA}
              onChange={(e) => handleStimulationChange('current_mA', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Frequency (Hz) */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Stimulation Frequency:</span>
              <span className="text-slate-200 font-mono font-bold">{stimulation.frequency_Hz} Hz</span>
            </div>
            <input
              type="range"
              min="60"
              max="185"
              step="5"
              value={stimulation.frequency_Hz}
              onChange={(e) => handleStimulationChange('frequency_Hz', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Pulse Width (µs) */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Pulse Width:</span>
              <span className="text-slate-200 font-mono font-bold">{stimulation.pulseWidth_us} µs</span>
            </div>
            <input
              type="range"
              min="30"
              max="120"
              step="5"
              value={stimulation.pulseWidth_us}
              onChange={(e) => handleStimulationChange('pulseWidth_us', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};
