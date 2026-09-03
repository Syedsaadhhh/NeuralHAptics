import React, { useState } from 'react';
import { AuditLogEntry, MutationOrigin } from '../core/types';
import { ChevronRight, ChevronDown, AlertTriangle, Play, RotateCcw, Activity, Bot, User, Wrench } from 'lucide-react';
import { localHarness } from '../webmcp/localHarness';

interface WebMCPAuditProps {
  auditLog: AuditLogEntry[];
  currentRevision?: number;
}

export const WebMCPAudit: React.FC<WebMCPAuditProps> = ({ auditLog }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterOrigin, setFilterOrigin] = useState<string>('all');
  const [isExecutingLocal, setIsExecutingLocal] = useState(false);

  const filteredLog = auditLog.filter((item) => {
    if (filterOrigin === 'all') return true;
    return item.origin === filterOrigin;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getOriginBadge = (origin: MutationOrigin) => {
    switch (origin) {
      case 'webmcp':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-semibold">
            <Bot className="w-3 h-3" />
            Agent
          </span>
        );
      case 'local-harness':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-semibold">
            <Wrench className="w-3 h-3" />
            Harness
          </span>
        );
      case 'human':
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-semibold">
            <User className="w-3 h-3" />
            Human
          </span>
        );
    }
  };

  // Local test triggers
  const handleQuickAgentSearch = async () => {
    setIsExecutingLocal(true);
    try {
      await localHarness.searchCorridors({ minimumVesselClearanceMm: 2.5 });
    } finally {
      setIsExecutingLocal(false);
    }
  };

  const handleQuickAgentStage = async () => {
    setIsExecutingLocal(true);
    try {
      const searchRes = await localHarness.searchCorridors({ minimumVesselClearanceMm: 2.5 });
      if (searchRes.candidates.length > 0) {
        await localHarness.stageCorridor(searchRes.candidates[0].candidateId);
      }
    } finally {
      setIsExecutingLocal(false);
    }
  };

  const handleQuickAgentUndo = async () => {
    setIsExecutingLocal(true);
    try {
      await localHarness.undoAgentChange();
    } finally {
      setIsExecutingLocal(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-3.5 flex flex-col h-full shadow-panel space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200 text-xs">WebMCP Activity Audit</span>
          <span className="text-xs text-slate-400 font-mono">({auditLog.length})</span>
        </div>

        {/* Origin Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 text-xs">
          {(['all', 'webmcp', 'local-harness', 'human'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterOrigin(mode)}
              className={`px-2 py-0.5 rounded-md transition-all ${
                filterOrigin === mode
                  ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode === 'all' ? 'All' : mode === 'webmcp' ? 'Agent' : mode === 'local-harness' ? 'Harness' : 'Human'}
            </button>
          ))}
        </div>
      </div>

      {/* Local Harness Quick Test Controls */}
      <div className="py-1 flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-400">Agent Simulation:</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleQuickAgentSearch}
            disabled={isExecutingLocal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 text-xs"
            title="Invoke search_corridors"
          >
            <Play className="w-3 h-3 text-cyan-400" />
            <span>Search</span>
          </button>
          <button
            onClick={handleQuickAgentStage}
            disabled={isExecutingLocal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 text-xs"
            title="Invoke stage_corridor"
          >
            <Play className="w-3 h-3 text-amber-400" />
            <span>Stage</span>
          </button>
          <button
            onClick={handleQuickAgentUndo}
            disabled={isExecutingLocal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 text-xs"
            title="Invoke undo_agent_change"
          >
            <RotateCcw className="w-3 h-3 text-purple-400" />
            <span>Undo</span>
          </button>
        </div>
      </div>

      {/* Log Items List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-[420px]">
        {filteredLog.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No WebMCP protocol activity recorded yet.
          </div>
        ) : (
          filteredLog.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const isConflict = entry.status === 'conflict';
            const isApproval =
              entry.toolName === 'approve_research_plan' || entry.toolName === 'neuralhaptics_export_approved_plan';

            return (
              <div
                key={entry.id}
                className={`rounded-xl border transition-all ${
                  isConflict
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                    : isApproval
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-slate-900/70 border-slate-800/80 text-slate-300'
                }`}
              >
                {/* Row Header */}
                <div
                  onClick={() => toggleExpand(entry.id)}
                  className="p-2.5 cursor-pointer flex items-center justify-between gap-2 select-none hover:bg-slate-800/40 rounded-t-xl"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    )}
                    {getOriginBadge(entry.origin)}
                    <span className="font-semibold text-slate-200 text-xs truncate">
                      {entry.toolName}
                    </span>
                    {isConflict && (
                      <span className="flex items-center gap-1 text-[10px] text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/40 font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        CONFLICT
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono flex-shrink-0">
                    <span className="text-slate-300">
                      rev {entry.revisionBefore}&rarr;{entry.revisionAfter}
                    </span>
                    <span className="text-slate-500">&bull;</span>
                    <span>{entry.durationMs}ms</span>
                  </div>
                </div>

                {/* Summary */}
                <div className="px-2.5 pb-2 text-xs text-slate-400 truncate">
                  {entry.resultSummary}
                </div>

                {/* Expanded Detail View */}
                {isExpanded && (
                  <div className="p-3 border-t border-slate-800 bg-slate-950/80 rounded-b-xl space-y-2 text-xs font-mono">
                    <div>
                      <div className="text-slate-400 mb-1 text-[11px] font-sans font-medium">Input Arguments:</div>
                      <pre className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-cyan-300 overflow-x-auto whitespace-pre-wrap max-h-40 text-[11px]">
                        {JSON.stringify(entry.arguments, null, 2)}
                      </pre>
                    </div>

                    {Boolean(entry.rawResult) && (
                      <div>
                        <div className="text-slate-400 mb-1 text-[11px] font-sans font-medium">Return Output:</div>
                        <pre className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-emerald-300 overflow-x-auto whitespace-pre-wrap max-h-48 text-[11px]">
                          {JSON.stringify(entry.rawResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
