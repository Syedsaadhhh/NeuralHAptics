import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { planStore } from './core/planStore';
import { webMCPManager } from './webmcp/registerTools';
import { Viewport3D } from './components/Viewport3D';
import { PlanningHUD } from './components/PlanningHUD';
import { ConstraintPanel } from './components/ConstraintPanel';
import { WebMCPAudit } from './components/WebMCPAudit';
import { ApprovalGate } from './components/ApprovalGate';
import { ProtocolStatus } from './components/ProtocolStatus';
import { TARGET_STRUCTURES } from './core/brainData';
import { Brain, SlidersHorizontal, Activity } from 'lucide-react';

export const App: React.FC = () => {
  const planState = useSyncExternalStore(
    (cb) => planStore.subscribe(cb),
    () => planStore.getState()
  );

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  useEffect(() => {
    // Initialize WebMCP tools registration
    webMCPManager.initialize();
  }, []);

  const targetObj = TARGET_STRUCTURES[planState.targetId];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-5 flex items-center justify-between z-20 flex-shrink-0 shadow-panel">
        {/* Left: Product Brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/40 flex items-center justify-center shadow-glow-cyan">
            <Brain className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-base font-sans">
                Neural<span className="text-cyan-400">Haptics</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full font-semibold">
                OS
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium tracking-wide">
              Stereotactic Spatial Reasoning Platform
            </div>
          </div>
        </div>

        {/* Center: Active Target & Indication Badge */}
        <div className="hidden md:flex items-center gap-2.5 glass-panel px-3.5 py-1.5 rounded-xl shadow-panel">
          <span className="text-xs text-slate-400 font-medium">Active Target:</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-200 font-semibold">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-glow-cyan"
              style={{ backgroundColor: targetObj?.color || '#00F0FF' }}
            />
            <span>{targetObj?.displayName}</span>
          </div>
          <span className="text-slate-600">&bull;</span>
          <span className="text-[11px] font-mono text-slate-400">
            Target: [{planState.targetPoint.map((v) => v.toFixed(1)).join(', ')}] mm
          </span>
        </div>

        {/* Right Status Badges & Panel Toggles */}
        <div className="flex items-center gap-3">
          <ProtocolStatus />

          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <button
              onClick={() => setLeftOpen(!leftOpen)}
              className={`p-2 rounded-xl border transition-all ${
                leftOpen
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/60'
              }`}
              title="Toggle Planning & Constraints Panel"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRightOpen(!rightOpen)}
              className={`p-2 rounded-xl border transition-all ${
                rightOpen
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/60'
              }`}
              title="Toggle WebMCP Activity & Approval Gate"
            >
              <Activity className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Drawer: Planning & Priority Controls */}
        {leftOpen && (
          <aside className="w-84 md:w-96 border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-xl p-3.5 overflow-y-auto z-10 flex-shrink-0 flex flex-col gap-3 transition-all">
            <ConstraintPanel planState={planState} />
          </aside>
        )}

        {/* Center Hero: 3D Three.js Viewport */}
        <main className="flex-1 relative h-full w-full">
          <Viewport3D planState={planState} />

          {/* Floating Planning HUD */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[94%] max-w-5xl z-10">
            <PlanningHUD planState={planState} />
          </div>

          {/* Persistent Non-clinical Simulation Disclaimer */}
          <div className="absolute bottom-3 right-4 pointer-events-none text-[11px] text-slate-400 glass-panel px-3 py-1 rounded-full shadow-panel">
            Synthetic stereotactic simulation &bull; Research use only
          </div>
        </main>

        {/* Right Drawer: WebMCP Activity Audit & Dynamic Approval Gate */}
        {rightOpen && (
          <aside className="w-96 md:w-[420px] border-l border-slate-800/80 bg-slate-950/90 backdrop-blur-xl p-3.5 overflow-y-auto z-10 flex-shrink-0 flex flex-col gap-3 transition-all">
            <ApprovalGate planState={planState} />
            <div className="flex-1 min-h-[350px]">
              <WebMCPAudit auditLog={planState.auditLog} currentRevision={planState.revision} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
