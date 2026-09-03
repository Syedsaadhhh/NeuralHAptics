import React from 'react';
import { PlanState } from '../core/types';
import { TARGET_STRUCTURES } from '../core/brainData';
import { trajectoryLength } from '../core/geometry';
import { Shield, Crosshair, Ruler, Gauge, Activity } from 'lucide-react';

interface PlanningHUDProps {
  planState: PlanState;
}

export const PlanningHUD: React.FC<PlanningHUDProps> = ({ planState }) => {
  const {
    stimulationPreview,
    machineHaptics,
    entryPoint,
    targetPoint,
    targetId,
    stimulation,
    revision,
    lastChangedBy,
  } = planState;

  const targetObj = TARGET_STRUCTURES[targetId];
  const depthMm = trajectoryLength(entryPoint, targetPoint).toFixed(1);
  const clearanceMm = machineHaptics.nearestHazard.clearanceMm.toFixed(1);
  const tension = machineHaptics.constraintTension.toFixed(2);
  const coveragePercent = stimulationPreview.targetCoveragePercent.toFixed(1);
  const shannon = stimulationPreview.shannon;

  const getTensionBadge = (t: number) => {
    if (t < 0.35) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          Unconstrained
        </span>
      );
    }
    if (t < 0.7) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          Moderate Tension
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">
        High Risk Pinch
      </span>
    );
  };

  const getClearanceBadge = (c: number) => {
    if (c >= 2.5) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          Optimal (&ge; 2.5mm)
        </span>
      );
    }
    if (c >= 1.5) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          Caution (1.5-2.5mm)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">
        Critical (&lt; 1.5mm)
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-2.5 pointer-events-none select-none">
      {/* Top Header Revision Pill */}
      <div className="glass-panel rounded-xl px-3.5 py-1.5 shadow-panel pointer-events-auto flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-slate-300">Plan Revision</span>
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-bold shadow-glow-cyan">
            #{revision}
          </span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-slate-400">Author:</span>
          <span className="text-slate-200 font-medium capitalize flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            {lastChangedBy === 'webmcp' ? 'WebMCP Agent' : lastChangedBy === 'human' ? 'Human Planner' : 'Test Harness'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: targetObj?.color || '#00F0FF' }} />
            <span className="font-medium">{targetObj?.displayName}</span>
          </div>
          <span className="text-slate-600">&bull;</span>
          <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
            <Ruler className="w-3.5 h-3.5 text-slate-500" />
            <span>Depth: <strong className="text-slate-200">{depthMm} mm</strong></span>
          </div>
        </div>
      </div>

      {/* 4 Hero High-Value Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pointer-events-auto">
        {/* Metric 1: Target Coverage */}
        <div className="glass-card rounded-2xl p-3.5 shadow-panel flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 font-medium text-xs">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              Target Coverage
            </span>
            <span className="text-[10px] text-slate-400 font-mono">256-pt proxy</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-white tracking-tight font-sans">
              {coveragePercent}%
            </span>
          </div>
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-300 shadow-glow-cyan"
              style={{ width: `${Math.min(100, Math.max(0, Number(coveragePercent)))}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Vessel Clearance */}
        <div className="glass-card rounded-2xl p-3.5 shadow-panel flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 font-medium text-xs">
              <Shield className="w-4 h-4 text-amber-400" />
              Vessel Clearance
            </span>
            {getClearanceBadge(Number(clearanceMm))}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span
              className={`text-3xl font-bold tracking-tight font-sans ${
                Number(clearanceMm) >= 2.5
                  ? 'text-emerald-400'
                  : Number(clearanceMm) >= 1.5
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {clearanceMm}
            </span>
            <span className="text-xs text-slate-400 font-medium">mm</span>
          </div>
          <div className="text-[11px] text-slate-400 truncate mt-1.5" title={machineHaptics.nearestHazard.displayName}>
            Near: <span className="text-slate-200">{machineHaptics.nearestHazard.displayName}</span>
          </div>
        </div>

        {/* Metric 3: Constraint Tension */}
        <div className="glass-card rounded-2xl p-3.5 shadow-panel flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 font-medium text-xs">
              <Gauge className="w-4 h-4 text-purple-400" />
              Haptic Tension
            </span>
            {getTensionBadge(Number(tension))}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-white tracking-tight font-sans">
              {tension}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 1.00</span>
          </div>
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                Number(tension) < 0.35
                  ? 'bg-emerald-400'
                  : Number(tension) < 0.7
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, Number(tension) * 100))}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Shannon Reference */}
        <div className="glass-card rounded-2xl p-3.5 shadow-panel flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 font-medium text-xs">
              <Activity className="w-4 h-4 text-teal-400" />
              Shannon Safety
            </span>
            <span className="text-[10px] text-slate-400 font-mono">k={shannon.k}</span>
          </div>
          <div className="mt-2 flex items-baseline">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                shannon.referenceStatus === 'WITHIN_REFERENCE_ENVELOPE'
                  ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                  : 'text-rose-300 bg-rose-500/10 border-rose-500/30'
              }`}
            >
              {shannon.referenceStatus === 'WITHIN_REFERENCE_ENVELOPE' ? 'Safe Reference Envelope' : 'Boundary Exceeded'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
            <span>{stimulation.current_mA} mA &bull; {stimulation.frequency_Hz} Hz</span>
            <span className="text-slate-500">Non-clinical</span>
          </div>
        </div>
      </div>
    </div>
  );
};
