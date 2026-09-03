import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { planStore } from './core/planStore';
import { webMCPManager } from './webmcp/registerTools';
import { Viewport3D } from './components/Viewport3D';
import { PlanningHUD } from './components/PlanningHUD';
import { ConstraintPanel } from './components/ConstraintPanel';
import { WebMCPAudit } from './components/WebMCPAudit';
import { ApprovalGate } from './components/ApprovalGate';
import { ProtocolStatus } from './components/ProtocolStatus';
import { Brain, Sparkles, SlidersHorizontal, Activity } from 'lucide-react';

export const App: React.FC = () => {
  const planState = useSyncExternalStore(
    (cb) => planStore.subscribe(cb),
    () => planStore.getState()
  );

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Initialize WebMCP tools registration
    webMCPManager.initialize();

    // Check for demo mode URL query parameter (?demo=1)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('demo') === '1') {
        setIsDemoMode(true);
        // Enforce deterministic initial state for demo
        planStore.selectCase('case_a', 'human');
      }
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-dark-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-dark-800 bg-dark-900/90 backdrop-blur px-4 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-haptic-cyan/40 flex items-center justify-center shadow-[0_0_12px_rgba(0,229,255,0.25)]">
              <Brain className="w-4 h-4 text-haptic-cyan" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-sm">NeuralHaptics</span>
                <span className="text-[10px] font-mono text-slate-500 border border-dark-700 px-1.5 py-0.2 rounded">
                  v1.0
                </span>
                {isDemoMode && (
                  <span className="text-[10px] font-mono bg-amber-950/60 text-amber-400 border border-amber-500/40 px-1.5 py-0.2 rounded flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    DEMO-STABLE
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400">
                Human-Agent Spatial Reasoning Workbench &bull; <span className="text-haptic-cyan">OpenAI WebMCP Challenge</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Tagline / Disclaimer */}
        <div className="hidden lg:flex flex-col items-center text-center">
          <span className="text-xs text-slate-300 font-medium tracking-wide">
            Humans see the 3D world. Agents feel its constraints.
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Research simulation using synthetic anatomy. Not a medical device or clinical recommendation.
          </span>
        </div>

        {/* Right Status Badges & Controls */}
        <div className="flex items-center gap-3">
          <ProtocolStatus />

          <div className="flex items-center gap-1 border-l border-dark-800 pl-2">
            <button
              onClick={() => setLeftOpen(!leftOpen)}
              className={`p-1.5 rounded transition-colors ${
                leftOpen ? 'bg-dark-800 text-haptic-cyan border border-dark-700' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Planning & Constraints Panel"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRightOpen(!rightOpen)}
              className={`p-1.5 rounded transition-colors ${
                rightOpen ? 'bg-dark-800 text-haptic-cyan border border-dark-700' : 'text-slate-500 hover:text-slate-300'
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
          <aside className="w-80 md:w-88 border-r border-dark-800 bg-dark-950/95 p-3 overflow-y-auto z-10 flex-shrink-0 flex flex-col gap-3">
            <ConstraintPanel planState={planState} />
          </aside>
        )}

        {/* Center Hero: 3D Three.js Viewport */}
        <main className="flex-1 relative h-full w-full">
          <Viewport3D planState={planState} />

          {/* Floating Planning HUD */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl z-10">
            <PlanningHUD planState={planState} />
          </div>

          {/* Persistent Mobile / Bottom Disclaimer */}
          <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] text-slate-500 font-mono bg-dark-900/80 backdrop-blur px-2 py-0.5 rounded border border-dark-800">
            Research simulation using synthetic anatomy. Not a medical device or clinical recommendation.
          </div>
        </main>

        {/* Right Drawer: WebMCP Activity Audit & Dynamic Approval Gate */}
        {rightOpen && (
          <aside className="w-96 md:w-[420px] border-l border-dark-800 bg-dark-950/95 p-3 overflow-y-auto z-10 flex-shrink-0 flex flex-col gap-3">
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
