import React, { useState } from 'react';
import { PlanState } from '../core/types';
import { SliceView } from './SliceView';
import { PathComparisonView } from './PathComparisonView';
import { Viewport3D } from './Viewport3D';
import { Box, Grid } from 'lucide-react';

interface MultiPlanarViewerProps {
  planState: PlanState;
}

export const MultiPlanarViewer: React.FC<MultiPlanarViewerProps> = ({ planState }) => {
  const [show3DInQuadrant, setShow3DInQuadrant] = useState(false);
  const [showFull3D, setShowFull3D] = useState(false);

  return (
    <div className="relative w-full h-full bg-[#080B11] flex flex-col select-none overflow-hidden">
      {/* 2x2 Multi-Planar Workbench Grid */}
      {!showFull3D ? (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1 p-1">
          {/* Top-Left: Coronal View */}
          <div className="w-full h-full relative overflow-hidden rounded border border-slate-800/80">
            <SliceView
              orientation="coronal"
              entryPoint={planState.entryPoint}
              targetPoint={planState.targetPoint}
              targetId={planState.targetId}
              machineHaptics={planState.machineHaptics}
              showHaptics={planState.showMachineHaptics}
            />
          </div>

          {/* Top-Right: Axial View */}
          <div className="w-full h-full relative overflow-hidden rounded border border-slate-800/80">
            <SliceView
              orientation="axial"
              entryPoint={planState.entryPoint}
              targetPoint={planState.targetPoint}
              targetId={planState.targetId}
              machineHaptics={planState.machineHaptics}
              showHaptics={planState.showMachineHaptics}
            />
          </div>

          {/* Bottom-Left: Sagittal View */}
          <div className="w-full h-full relative overflow-hidden rounded border border-slate-800/80">
            <SliceView
              orientation="sagittal"
              entryPoint={planState.entryPoint}
              targetPoint={planState.targetPoint}
              targetId={planState.targetId}
              machineHaptics={planState.machineHaptics}
              showHaptics={planState.showMachineHaptics}
            />
          </div>

          {/* Bottom-Right: Path Comparison or 3D Overview */}
          <div className="w-full h-full relative overflow-hidden rounded border border-slate-800/80">
            {show3DInQuadrant ? (
              <div className="w-full h-full relative">
                <div className="absolute top-1 right-2 z-10">
                  <button
                    onClick={() => setShow3DInQuadrant(false)}
                    className="px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700"
                  >
                    Close 3D
                  </button>
                </div>
                <Viewport3D planState={planState} />
              </div>
            ) : (
              <PathComparisonView
                planState={planState}
                onOpen3D={() => setShow3DInQuadrant(true)}
              />
            )}
          </div>
        </div>
      ) : (
        /* Fullscreen 3D Overview */
        <div className="w-full h-full relative">
          <div className="absolute top-3 right-4 z-20">
            <button
              onClick={() => setShowFull3D(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/95 hover:bg-slate-800 text-xs font-medium text-slate-200 border border-slate-700 shadow-md"
            >
              <Grid className="w-3.5 h-3.5 text-cyan-400" />
              <span>Back to 2x2 Slices</span>
            </button>
          </div>
          <Viewport3D planState={planState} />
        </div>
      )}

      {/* Floating Bottom Center Bar */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/95 border border-slate-800 text-[11px] font-mono text-slate-400 shadow-lg z-10">
        <span className="text-slate-300 font-semibold">Synthetic Stereotactic Space</span>
        <span className="text-slate-600">&bull;</span>
        <span>Not real patient MRI</span>
        <span className="text-slate-600">&bull;</span>
        <button
          onClick={() => setShowFull3D(!showFull3D)}
          className="text-cyan-400 hover:text-cyan-300 font-sans font-medium flex items-center gap-1"
        >
          <Box className="w-3 h-3" />
          <span>{showFull3D ? 'Show 2x2 Multi-Planar' : 'Full 3D Overview'}</span>
        </button>
      </div>
    </div>
  );
};
