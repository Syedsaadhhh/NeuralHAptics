import React, { useState } from 'react';
import { AuditLogEntry, MutationOrigin } from '../core/types';
import { Terminal, ChevronRight, ChevronDown, AlertTriangle, ShieldCheck, Play, RotateCcw } from 'lucide-react';
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
        return <span className="px-1.5 py-0.5 rounded bg-cyan-950/70 border border-haptic-cyan/40 text-haptic-cyan font-mono text-[10px]">WebMCP</span>;
      case 'local-harness':
        return <span className="px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300 font-mono text-[10px]">Local Harness</span>;
      case 'human':
      default:
        return <span className="px-1.5 py-0.5 rounded bg-dark-800 border border-dark-700 text-slate-300 font-mono text-[10px]">Human UI</span>;
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
      // Find candidate from current state or search
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
    <div className="bg-dark-900 border border-dark-700/80 rounded-lg p-3 text-xs flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-haptic-cyan" />
          <span className="font-semibold text-slate-200">WebMCP Activity Audit</span>
          <span className="text-[10px] font-mono text-slate-500">({auditLog.length} events)</span>
        </div>

        {/* Origin Filter */}
        <div className="flex items-center gap-1 text-[10px] font-mono">
          {(['all', 'webmcp', 'local-harness', 'human'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterOrigin(mode)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                filterOrigin === mode
                  ? 'bg-dark-750 text-white font-medium border border-dark-600'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {mode === 'all' ? 'All' : mode === 'webmcp' ? 'WebMCP' : mode === 'local-harness' ? 'Harness' : 'Human'}
            </button>
          ))}
        </div>
      </div>

      {/* Local Harness Quick Test Controls for Evaluation */}
      <div className="py-2 border-b border-dark-800 flex items-center justify-between gap-2 text-[10px]">
        <span className="text-slate-400">Local Tool Evaluation:</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleQuickAgentSearch}
            disabled={isExecutingLocal}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-dark-800 hover:bg-dark-750 text-slate-300 border border-dark-700 hover:border-dark-600 transition-colors disabled:opacity-50"
            title="Invoke search_corridors via local harness"
          >
            <Play className="w-2.5 h-2.5 text-haptic-cyan" />
            <span>Search</span>
          </button>
          <button
            onClick={handleQuickAgentStage}
            disabled={isExecutingLocal}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-dark-800 hover:bg-dark-750 text-slate-300 border border-dark-700 hover:border-dark-600 transition-colors disabled:opacity-50"
            title="Invoke stage_corridor via local harness"
          >
            <Play className="w-2.5 h-2.5 text-haptic-amber" />
            <span>Stage</span>
          </button>
          <button
            onClick={handleQuickAgentUndo}
            disabled={isExecutingLocal}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-dark-800 hover:bg-dark-750 text-slate-300 border border-dark-700 hover:border-dark-600 transition-colors disabled:opacity-50"
            title="Invoke undo_agent_change via local harness"
          >
            <RotateCcw className="w-2.5 h-2.5 text-purple-400" />
            <span>Undo</span>
          </button>
        </div>
      </div>

      {/* Log Items List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mt-2 min-h-[160px] max-h-[400px]">
        {filteredLog.length === 0 ? (
          <div className="py-8 text-center text-slate-400 font-mono text-[11px]">
            No WebMCP or planning activity recorded yet.
          </div>
        ) : (
          filteredLog.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const isConflict = entry.status === 'conflict';
            const isApproval = entry.toolName === 'approve_research_plan' || entry.toolName === 'neuralhaptics_export_approved_plan';

            return (
              <div
                key={entry.id}
                className={`rounded border text-[11px] font-mono transition-all ${
                  isConflict
                    ? 'bg-red-950/30 border-red-500/40 text-red-300'
                    : isApproval
                    ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300'
                    : 'bg-dark-850/70 border-dark-800 text-slate-300'
                }`}
              >
                {/* Row Header */}
                <div
                  onClick={() => toggleExpand(entry.id)}
                  className="p-2 cursor-pointer flex items-center justify-between gap-2 select-none hover:bg-dark-800/40"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    )}
                    {getOriginBadge(entry.origin)}
                    <span className="font-semibold text-slate-200 truncate">
                      {entry.toolName}
                    </span>
                    {isConflict && (
                      <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-950/80 px-1.5 py-0.2 rounded border border-red-500/40">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        REVISION_CONFLICT
                      </span>
                    )}
                    {isApproval && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <ShieldCheck className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-shrink-0">
                    <span>
                      rev {entry.revisionBefore} &rarr; {entry.revisionAfter}
                    </span>
                    <span>{entry.durationMs}ms</span>
                    <span>
                      {new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Summary */}
                <div className="px-2 pb-2 text-[10px] text-slate-400 truncate">
                  {entry.resultSummary}
                </div>

                {/* Expanded Detail View */}
                {isExpanded && (
                  <div className="p-2.5 border-t border-dark-800 bg-dark-950 rounded-b space-y-2 text-[10px]">
                    <div>
                      <div className="text-slate-400 mb-1">Arguments:</div>
                      <pre className="bg-dark-900 p-2 rounded border border-dark-800 text-cyan-300 overflow-x-auto whitespace-pre-wrap max-h-40">
                        {JSON.stringify(entry.arguments, null, 2)}
                      </pre>
                    </div>

                    {Boolean(entry.rawResult) && (
                      <div>
                        <div className="text-slate-400 mb-1">Result Payload:</div>
                        <pre className="bg-dark-900 p-2 rounded border border-dark-800 text-emerald-300 overflow-x-auto whitespace-pre-wrap max-h-48">
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
