import React, { useEffect, useState } from 'react';
import { detectProtocolStatus } from '../webmcp/registerTools';
import { WebMCPProtocolStatus } from '../core/types';
import { Radio, ShieldAlert, Cpu } from 'lucide-react';

export const ProtocolStatus: React.FC = () => {
  const [status, setStatus] = useState<WebMCPProtocolStatus>('WebMCP Unavailable — Local Harness');

  useEffect(() => {
    setStatus(detectProtocolStatus());
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case 'WebMCP Active':
        return {
          icon: <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />,
          label: 'WebMCP Active',
          bgColor: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-glow-cyan',
          dotColor: 'bg-cyan-400',
        };
      case 'WebMCP Compatibility Mode':
        return {
          icon: <Cpu className="w-3.5 h-3.5 text-purple-400" />,
          label: 'Compatibility Mode',
          bgColor: 'bg-purple-500/10 border-purple-500/30 text-purple-300 shadow-glow-purple',
          dotColor: 'bg-purple-400',
        };
      case 'WebMCP Unavailable — Local Harness':
      default:
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
          label: 'Local WebMCP Engine',
          bgColor: 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-glow-amber',
          dotColor: 'bg-amber-400',
        };
    }
  };

  const cfg = getStatusConfig();

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-all ${cfg.bgColor}`}
      title="Protocol execution tier. WebMCP is Active when an imperative browser modelContext is present."
    >
      <span className={`w-2 h-2 rounded-full ${cfg.dotColor} animate-pulse`} />
      <span>{cfg.label}</span>
    </div>
  );
};
