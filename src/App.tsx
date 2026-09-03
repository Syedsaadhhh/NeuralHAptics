import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { planStore } from './core/planStore';
import { webMCPManager } from './webmcp/registerTools';
import { MultiPlanarViewer } from './components/MultiPlanarViewer';
import { ConstraintPanel } from './components/ConstraintPanel';
import { AgentProposalPanel } from './components/AgentProposalPanel';
import { ProtocolStatus } from './components/ProtocolStatus';
import { TARGET_STRUCTURES } from './core/brainData';
import { Brain, SlidersHorizontal, PanelRight } from 'lucide-react';

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

  const targetObj = TARGET_STRUCTURES[planState.targetId] || TARGET_STRUCTURES.tremor_center;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#07090E] text-slate-100 overflow-hidden font-sans">
      {/* Top Header Bar (~52px) */}
      <header className="h-[52px] border-b border-slate-800 bg-[#0B0E14] px-4 flex items-center justify-between z-20 flex-shrink-0">
        {/* Left: Product Title + Subtitle */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center">
            <Brain className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-bold tracking-tight text-white text-sm">NeuralHaptics</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">
              Agent-readable stereotactic planning
            </div>
          </div>
        </div>

        {/* Center: Case & Target Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded bg-slate-900 border border-slate-800 text-xs">
          <span className="font-semibold text-slate-200">
            {planState.selectedCaseId === 'case_a' ? 'Case A' : 'Case B'}
          </span>
          <span className="text-slate-500">&bull;</span>
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: targetObj.color }} />
            <span>{targetObj.displayName.split(' ')[0]}</span>
          </span>
          <span className="text-slate-500">&bull;</span>
          <span className="text-[10px] font-mono text-slate-400">
            [{planState.targetPoint.map((v) => v.toFixed(1)).join(', ')}]
          </span>
        </div>

        {/* Right: Protocol Status & Panel Toggles */}
        <div className="flex items-center gap-2.5">
          <ProtocolStatus />

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              onClick={() => setLeftOpen(!leftOpen)}
              className={`p-1.5 rounded transition-colors ${
                leftOpen
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Planning Controls"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRightOpen(!rightOpen)}
              className={`p-1.5 rounded transition-colors ${
                rightOpen
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Agent Proposal Panel"
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (250–280px): Planning Controls */}
        {leftOpen && (
          <aside className="w-[260px] border-r border-slate-800 bg-[#0B0E14] p-3 overflow-y-auto z-10 flex-shrink-0">
            <ConstraintPanel planState={planState} />
          </aside>
        )}

        {/* Center: 2.5D Multi-Planar 2x2 Stereotactic Workbench */}
        <main className="flex-1 relative h-full w-full overflow-hidden bg-[#07090E]">
          <MultiPlanarViewer planState={planState} />
        </main>

        {/* Right Sidebar (260–290px): Agent Proposal & Collapsible Activity */}
        {rightOpen && (
          <aside className="w-[280px] border-l border-slate-800 bg-[#0B0E14] p-3 overflow-y-auto z-10 flex-shrink-0">
            <AgentProposalPanel planState={planState} />
          </aside>
        )}
      </div>
    </div>
  );
};
