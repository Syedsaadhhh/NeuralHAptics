import React from 'react';
import { PlanState } from '../core/types';
import { TARGET_STRUCTURES } from '../core/brainData';
import { trajectoryLength } from '../core/geometry';
import { Activity, Shield, Crosshair, Zap, Compass, Ruler, Gauge } from 'lucide-react';

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

  const getTensionColor = (t: number) => {
    if (t < 0.35) return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
    if (t < 0.7) return 'text-amber-400 border-amber-500/30 bg-amber-950/20';
    return 'text-haptic-crimson border-red-500/30 bg-red-950/20';
  };

  const getClearanceColor = (c: number) => {
    if (c >= 2.5) return 'text-emerald-400';
    if (c >= 1.5) return 'text-amber-400';
    return 'text-haptic-crimson animate-pulse';
  };

  return (
    <div className="flex flex-col gap-2 pointer-events-none select-none">
      {/* Top Authoritative State Bar */}
      <div className="bg-dark-900/90 backdrop-blur border border-dark-700/80 rounded-lg p-2.5 shadow-xl pointer-events-auto flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">PLAN REVISION:</span>
          <span className="px-1.5 py-0.5 rounded bg-dark-800 border border-dark-700 text-haptic-cyan font-bold">
            #{revision}
          </span>
          <span className="text-slate-500 text-[10px]">|</span>
          <span className="text-slate-400">MUTATED BY:</span>
          <span className="text-slate-200 capitalize font-medium">{lastChangedBy}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-haptic-cyan animate-pulse" />
          <span className="text-[11px]">{targetObj?.displayName}</span>
        </div>
      </div>

      {/* 4 Hero High-Value Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pointer-events-auto">
        {/* Metric 1: Target Coverage */}
        <div className="bg-dark-900/90 backdrop-blur border border-dark-700/80 rounded-lg p-3 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <Crosshair className="w-3.5 h-3.5 text-haptic-cyan" />
              Target Coverage
            </span>
            <span className="text-[10px] text-slate-500">256-pt proxy</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-bold text-white tracking-tight">
              {coveragePercent}%
            </span>
          </div>
          <div className="w-full bg-dark-800 rounded-full h-1 mt-2 overflow-hidden">
            <div
              className="bg-haptic-cyan h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, Number(coveragePercent)))}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Vessel Clearance */}
        <div className="bg-dark-900/90 backdrop-blur border border-dark-700/80 rounded-lg p-3 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <Shield className="w-3.5 h-3.5 text-haptic-amber" />
              Vessel Clearance
            </span>
            <span className="text-[10px] text-slate-500">true min 3D</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-2xl font-mono font-bold tracking-tight ${getClearanceColor(Number(clearanceMm))}`}>
              {clearanceMm}
            </span>
            <span className="text-xs text-slate-400 font-mono">mm</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-1" title={machineHaptics.nearestHazard.displayName}>
            Near: {machineHaptics.nearestHazard.displayName}
          </div>
        </div>

        {/* Metric 3: Constraint Tension */}
        <div className="bg-dark-900/90 backdrop-blur border border-dark-700/80 rounded-lg p-3 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <Gauge className="w-3.5 h-3.5 text-purple-400" />
              Constraint Tension
            </span>
            <span className="text-[10px] text-slate-500">machine haptic</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-bold text-white tracking-tight">
              {tension}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 1.0</span>
          </div>
          <div className="mt-1">
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border ${getTensionColor(Number(tension))}`}>
              {Number(tension) < 0.35 ? 'UNCONSTRAINED' : Number(tension) < 0.7 ? 'MODERATE CONSTRICTION' : 'HIGH RISK / PINCH'}
            </span>
          </div>
        </div>

        {/* Metric 4: Shannon Reference */}
        <div className="bg-dark-900/90 backdrop-blur border border-dark-700/80 rounded-lg p-3 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Shannon Reference
            </span>
            <span className="text-[10px] text-slate-500">k={shannon.k}</span>
          </div>
          <div className="mt-1 flex items-baseline">
            <span
              className={`text-xs font-mono font-semibold px-2 py-1 rounded border leading-tight ${
                shannon.referenceStatus === 'WITHIN_REFERENCE_ENVELOPE'
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
                  : 'text-haptic-crimson bg-red-950/40 border-red-500/30'
              }`}
            >
              {shannon.referenceStatus.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="text-[9px] text-slate-500 mt-1">
            Ref boundary 1.75 | Non-clinical
          </div>
        </div>
      </div>

      {/* Secondary Trajectory & Stimulation Parameters Ribbon */}
      <div className="bg-dark-900/85 backdrop-blur border border-dark-700/60 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 shadow-md flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <Ruler className="w-3 h-3 text-slate-400" />
          <span className="text-slate-400">Trajectory Depth:</span>
          <span className="text-white font-semibold">{depthMm} mm</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Compass className="w-3 h-3 text-slate-400" />
          <span className="text-slate-400">Approach:</span>
          <span className="text-white">Coronal Cranial</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-haptic-amber" />
          <span className="text-slate-400">Stimulation:</span>
          <span className="text-white">{stimulation.current_mA} mA</span>
          <span className="text-slate-500">@</span>
          <span className="text-white">{stimulation.frequency_Hz} Hz</span>
          <span className="text-slate-500">/</span>
          <span className="text-white">{stimulation.pulseWidth_us} µs</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Active Contacts:</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((cIdx) => {
              const isActive = stimulation.contacts.includes(cIdx);
              return (
                <span
                  key={cIdx}
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isActive
                      ? 'bg-haptic-amber text-dark-950 shadow-[0_0_6px_#FFB300]'
                      : 'bg-dark-800 text-slate-500 border border-dark-700'
                  }`}
                >
                  {cIdx}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
