import React from 'react';
import { Vector3Tuple, MachineHapticsVector } from '../core/types';
import { TARGET_STRUCTURES, AVOIDANCE_REGIONS, SYNTHETIC_VESSELS } from '../core/brainData';
import { closestPointOnSegment } from '../core/geometry';

export type SliceOrientation = 'coronal' | 'axial' | 'sagittal';

interface SliceViewProps {
  orientation: SliceOrientation;
  entryPoint: Vector3Tuple;
  targetPoint: Vector3Tuple;
  targetId: string;
  machineHaptics: MachineHapticsVector;
  showHaptics?: boolean;
}

export const SliceView: React.FC<SliceViewProps> = ({
  orientation,
  entryPoint,
  targetPoint,
  targetId,
  machineHaptics,
  showHaptics = true,
}) => {
  const targetObj = TARGET_STRUCTURES[targetId] || TARGET_STRUCTURES.stn_target;
  const avoidanceObj = AVOIDANCE_REGIONS[0];

  // Coordinate projections:
  // Coronal:  Horizontal = X (-45 to +45), Vertical = Z (-25 to +80)
  // Axial:    Horizontal = X (-45 to +45), Vertical = Y (-45 to +45)
  // Sagittal: Horizontal = Y (-45 to +45), Vertical = Z (-25 to +80)

  const toSvgCoords = (p: Vector3Tuple): { x: number; y: number } => {
    switch (orientation) {
      case 'coronal':
        return { x: p[0], y: -p[2] };
      case 'axial':
        return { x: p[0], y: -p[1] };
      case 'sagittal':
        return { x: p[1], y: -p[2] };
    }
  };

  const pEntry = toSvgCoords(entryPoint);
  const pTarget = toSvgCoords(targetPoint);
  const pAvoid = toSvgCoords(avoidanceObj.center);

  // Nearest hazard location & repulsion arrow
  const nearestVessel = SYNTHETIC_VESSELS.find((v) => v.id === machineHaptics.nearestHazard.id);
  let hazardCenter: Vector3Tuple = [0, 0, 0];
  if (nearestVessel) {
    hazardCenter = [
      (nearestVessel.start[0] + nearestVessel.end[0]) / 2,
      (nearestVessel.start[1] + nearestVessel.end[1]) / 2,
      (nearestVessel.start[2] + nearestVessel.end[2]) / 2,
    ];
  } else if (avoidanceObj) {
    hazardCenter = avoidanceObj.center;
  }

  const closestPtOnTraj = closestPointOnSegment(hazardCenter, entryPoint, targetPoint);
  const pClosest = toSvgCoords(closestPtOnTraj);
  const pHazard = toSvgCoords(hazardCenter);

  // Repulsion arrow endpoint
  const repulsionNorm = machineHaptics.repulsionVector;
  const arrowEndWorld: Vector3Tuple = [
    closestPtOnTraj[0] + repulsionNorm[0] * 6.0,
    closestPtOnTraj[1] + repulsionNorm[1] * 6.0,
    closestPtOnTraj[2] + repulsionNorm[2] * 6.0,
  ];
  const pArrowEnd = toSvgCoords(arrowEndWorld);

  // ViewBox bounds
  const viewBox =
    orientation === 'axial'
      ? '-55 -55 110 110'
      : '-55 -85 110 115';

  const titleMap = {
    coronal: `CORONAL (X-Z) · Y = ${targetPoint[1].toFixed(1)} mm`,
    axial: `AXIAL (X-Y) · Z = ${targetPoint[2].toFixed(1)} mm`,
    sagittal: `SAGITTAL (Y-Z) · X = ${targetPoint[0].toFixed(1)} mm`,
  };

  const axesLabels = {
    coronal: { left: 'L', right: 'R', top: 'S', bottom: 'I' },
    axial: { left: 'L', right: 'R', top: 'A', bottom: 'P' },
    sagittal: { left: 'P', right: 'A', top: 'S', bottom: 'I' },
  };

  const labels = axesLabels[orientation];

  return (
    <div className="relative w-full h-full bg-[#0A0D14] border border-slate-800 flex flex-col select-none overflow-hidden group">
      {/* Header bar */}
      <div className="h-6 px-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400 z-10">
        <span className="font-semibold text-slate-200 tracking-wide">{titleMap[orientation]}</span>
        <div className="flex items-center gap-2 text-slate-400">
          <span>Target: [{targetPoint.map((v) => v.toFixed(1)).join(', ')}]</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 relative w-full h-full">
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
        >
          <defs>
            {/* Grid pattern */}
            <pattern id={`grid-${orientation}`} width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1E293B" strokeWidth="0.4" strokeDasharray="1,2" />
            </pattern>
            {/* Arrow marker */}
            <marker
              id={`arrow-${orientation}`}
              viewBox="0 0 6 6"
              refX="5"
              refY="3"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 6 3 L 0 6 z" fill="#00F0FF" />
            </marker>
          </defs>

          {/* Background grid */}
          <rect x="-60" y="-90" width="120" height="180" fill={`url(#grid-${orientation})`} />

          {/* Stereotactic coordinate axes */}
          <line x1="-50" y1="0" x2="50" y2="0" stroke="#334155" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1="0" y1="-80" x2="0" y2="80" stroke="#334155" strokeWidth="0.5" strokeDasharray="2,2" />

          {/* Deterministic Procedural Anatomical Contours */}
          {orientation === 'coronal' && (
            <g opacity="0.35">
              {/* Outer Cranial / Cortex Boundary */}
              <path
                d="M -42 10 C -44 -40, -35 -70, 0 -72 C 35 -70, 44 -40, 42 10 C 38 30, 20 25, 0 25 C -20 25, -38 30, -42 10 Z"
                fill="none"
                stroke="#64748B"
                strokeWidth="0.8"
              />
              {/* Ventricular Outline */}
              <path
                d="M -12 -25 C -15 -10, -8 5, -2 10 L -2 -25 Z M 12 -25 C 15 -10, 8 5, 2 10 L 2 -25 Z"
                fill="#1E293B"
                stroke="#475569"
                strokeWidth="0.6"
              />
            </g>
          )}

          {orientation === 'axial' && (
            <g opacity="0.35">
              {/* Outer Cranial / Axial Boundary */}
              <ellipse cx="0" cy="0" rx="42" ry="46" fill="none" stroke="#64748B" strokeWidth="0.8" />
              {/* Lateral Ventricles */}
              <ellipse cx="-7" cy="-2" rx="4" ry="12" fill="#1E293B" stroke="#475569" strokeWidth="0.6" />
              <ellipse cx="7" cy="-2" rx="4" ry="12" fill="#1E293B" stroke="#475569" strokeWidth="0.6" />
            </g>
          )}

          {orientation === 'sagittal' && (
            <g opacity="0.35">
              {/* Sagittal Brain Profile */}
              <path
                d="M -40 -10 C -42 -50, -20 -72, 5 -70 C 30 -68, 42 -40, 40 5 C 38 25, 10 28, -5 28 C -25 28, -38 20, -40 -10 Z"
                fill="none"
                stroke="#64748B"
                strokeWidth="0.8"
              />
              {/* Brainstem silhouette */}
              <path d="M -5 10 L 5 10 L 8 30 L -4 30 Z" fill="#1E293B" stroke="#475569" strokeWidth="0.6" />
            </g>
          )}

          {/* Avoidance Region (Internal Capsule) */}
          <g>
            <circle
              cx={pAvoid.x}
              cy={pAvoid.y}
              r={avoidanceObj.radius}
              fill="#F43F5E"
              fillOpacity="0.12"
              stroke="#F43F5E"
              strokeWidth="0.8"
              strokeDasharray="2,2"
            />
            <text
              x={pAvoid.x}
              y={pAvoid.y + avoidanceObj.radius + 3.5}
              fill="#F43F5E"
              fontSize="3.2"
              fontFamily="monospace"
              textAnchor="middle"
            >
              ICAP
            </text>
          </g>

          {/* Thin Vascular Hazard Paths */}
          {SYNTHETIC_VESSELS.map((v) => {
            const p1 = toSvgCoords(v.start);
            const p2 = toSvgCoords(v.end);
            const isHazard = v.id === machineHaptics.nearestHazard.id;
            return (
              <g key={v.id}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={isHazard ? '#EF4444' : '#991B1B'}
                  strokeWidth={isHazard ? '1.2' : '0.7'}
                  opacity={isHazard ? 0.9 : 0.45}
                />
              </g>
            );
          })}

          {/* Trajectory Clearance Gap Guide */}
          <line
            x1={pClosest.x}
            y1={pClosest.y}
            x2={pHazard.x}
            y2={pHazard.y}
            stroke="#EF4444"
            strokeWidth="0.6"
            strokeDasharray="1,1"
            opacity="0.8"
          />

          {/* Machine Haptics Force Vector Arrow (Strongest risk normal) */}
          {showHaptics && (
            <line
              x1={pClosest.x}
              y1={pClosest.y}
              x2={pArrowEnd.x}
              y2={pArrowEnd.y}
              stroke="#00F0FF"
              strokeWidth="1.2"
              markerEnd={`url(#arrow-${orientation})`}
            />
          )}

          {/* Trajectory Path Line (GOLD/AMBER) */}
          <line
            x1={pEntry.x}
            y1={pEntry.y}
            x2={pTarget.x}
            y2={pTarget.y}
            stroke="#F59E0B"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Cortical Burr Hole Entry Marker */}
          <circle cx={pEntry.x} cy={pEntry.y} r="2.2" fill="#0A0D14" stroke="#F59E0B" strokeWidth="1.2" />
          <circle cx={pEntry.x} cy={pEntry.y} r="0.6" fill="#F59E0B" />
          <text
            x={pEntry.x + 3.5}
            y={pEntry.y - 2.5}
            fill="#FBBF24"
            fontSize="3.2"
            fontFamily="monospace"
            fontWeight="bold"
          >
            ENTRY
          </text>

          {/* Target Nucleus (CYAN) */}
          <circle
            cx={pTarget.x}
            cy={pTarget.y}
            r={targetObj.radius}
            fill="#00F0FF"
            fillOpacity="0.25"
            stroke="#00F0FF"
            strokeWidth="1.0"
          />
          {/* Target Crosshair */}
          <line
            x1={pTarget.x - targetObj.radius - 2}
            y1={pTarget.y}
            x2={pTarget.x + targetObj.radius + 2}
            y2={pTarget.y}
            stroke="#00F0FF"
            strokeWidth="0.6"
          />
          <line
            x1={pTarget.x}
            y1={pTarget.y - targetObj.radius - 2}
            x2={pTarget.x}
            y2={pTarget.y + targetObj.radius + 2}
            stroke="#00F0FF"
            strokeWidth="0.6"
          />
          <circle cx={pTarget.x} cy={pTarget.y} r="0.8" fill="#00F0FF" />
          <text
            x={pTarget.x + targetObj.radius + 2.5}
            y={pTarget.y + 1}
            fill="#00F0FF"
            fontSize="3.4"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {targetObj.id === 'stn_target' ? 'STN' : 'GPI'}
          </text>
        </svg>

        {/* Anatomical Direction Compass Labels */}
        <div className="absolute top-1 left-2 text-[9px] font-mono font-bold text-slate-400">{labels.top}</div>
        <div className="absolute bottom-1 left-2 text-[9px] font-mono font-bold text-slate-400">{labels.bottom}</div>
        <div className="absolute bottom-1 left-7 text-[9px] font-mono font-bold text-slate-400">{labels.left}</div>
        <div className="absolute bottom-1 right-2 text-[9px] font-mono font-bold text-slate-400">{labels.right}</div>

        {/* Millimeter Scale Bar in Bottom Left */}
        <div className="absolute bottom-1.5 left-12 flex items-center gap-1 text-[8px] font-mono text-slate-400">
          <div className="w-6 h-0.5 bg-slate-400" />
          <span>10mm</span>
        </div>

        {/* Hazard Clearance Tag */}
        <div className="absolute top-1.5 right-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
          Clr: <strong className={machineHaptics.nearestHazard.clearanceMm < 2.0 ? 'text-rose-400' : 'text-emerald-400'}>
            {machineHaptics.nearestHazard.clearanceMm.toFixed(1)}mm
          </strong>
        </div>
      </div>
    </div>
  );
};
