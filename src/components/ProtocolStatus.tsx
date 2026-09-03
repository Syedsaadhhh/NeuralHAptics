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
          icon: <Radio className="w-3.5 h-3.5 text-haptic-cyan animate-pulse" />,
          bgColor: 'bg-cyan-950/40 border-haptic-cyan/30 text-cyan-300',
          dotColor: 'bg-haptic-cyan shadow-[0_0_8px_#00E5FF]',
        };
      case 'WebMCP Compatibility Mode':
        return {
          icon: <Cpu className="w-3.5 h-3.5 text-purple-400" />,
          bgColor: 'bg-purple-950/40 border-purple-500/30 text-purple-300',
          dotColor: 'bg-purple-400 shadow-[0_0_8px_#7C4DFF]',
        };
      case 'WebMCP Unavailable — Local Harness':
      default:
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
          bgColor: 'bg-amber-950/30 border-amber-500/25 text-amber-300',
          dotColor: 'bg-amber-400 shadow-[0_0_8px_#FFB300]',
        };
    }
  };

  const cfg = getStatusConfig();

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-mono tracking-wide transition-all ${cfg.bgColor}`}
      title="Protocol execution tier. WebMCP is only shown as Active when an imperative browser modelContext is present."
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
      <span>{status}</span>
    </div>
  );
};
