/**
 * Formal WebMCP tool schemas for NeuralHaptics.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const TOOL_GET_CONTEXT: ToolDefinition = {
  name: 'neuralhaptics_get_context',
  description:
    'Retrieves the current authoritative stereotactic planning state, active trajectory, synthetic anatomy, machine-haptic constraints, and human approval status. Read-only.',
  inputSchema: {
    type: 'object',
    properties: {
      detail: {
        type: 'string',
        enum: ['compact', 'full'],
        description: 'Detail level: compact returns high-level metrics; full returns detailed anatomy and hazard lists.',
        default: 'compact',
      },
    },
  },
};

export const TOOL_SEARCH_CORRIDORS: ToolDefinition = {
  name: 'neuralhaptics_search_corridors',
  description:
    'Executes a deterministic client-side multi-objective search over 512 cranial entry points. Evaluates true segment-to-segment vascular clearance, internal capsule avoidance, target accuracy, and constraint tension. Returns Pareto-optimal candidate trajectories. Read-only.',
  inputSchema: {
    type: 'object',
    properties: {
      targetId: {
        type: 'string',
        description: 'Target structure identifier (e.g. tremor_center or motor_pathway). Defaults to current target.',
      },
      minimumVesselClearanceMm: {
        type: 'number',
        description: 'Strict minimum acceptable clearance to any vascular segment in millimeters.',
      },
      priorities: {
        type: 'object',
        properties: {
          vascularClearance: { type: 'number', description: 'Weight for vascular clearance (0-1).' },
          targetAccuracy: { type: 'number', description: 'Weight for target accuracy (0-1).' },
          avoidanceZone: { type: 'number', description: 'Weight for internal capsule avoidance (0-1).' },
          trajectoryLength: { type: 'number', description: 'Weight for minimizing trajectory length (0-1).' },
        },
      },
      maxCandidates: {
        type: 'integer',
        description: 'Maximum number of non-dominated Pareto candidates to return (default: 6).',
        default: 6,
      },
    },
  },
};

export const TOOL_EVALUATE_CORRIDOR: ToolDefinition = {
  name: 'neuralhaptics_evaluate_corridor',
  description:
    'Evaluates an arbitrary candidate trajectory defined by entry and target 3D coordinates. Returns true segment-to-segment vascular clearances, avoidance clearance, machine-haptic repulsion vectors, and constraint tension. Read-only.',
  inputSchema: {
    type: 'object',
    properties: {
      entryPoint: {
        type: 'array',
        items: { type: 'number' },
        minItems: 3,
        maxItems: 3,
        description: 'Cranial entry point [x, y, z] in synthetic millimeters.',
      },
      targetPoint: {
        type: 'array',
        items: { type: 'number' },
        minItems: 3,
        maxItems: 3,
        description: 'Deep brain target point [x, y, z] in synthetic millimeters.',
      },
    },
    required: ['entryPoint', 'targetPoint'],
  },
};

export const TOOL_COMPARE_CORRIDORS: ToolDefinition = {
  name: 'neuralhaptics_compare_corridors',
  description:
    'Compares multiple candidate trajectories by their deterministic IDs. Returns a structured trade-off matrix showing vascular clearance, target accuracy, length, tension, and Pareto dominance relationships. Read-only.',
  inputSchema: {
    type: 'object',
    properties: {
      candidateIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of candidate corridor IDs to compare (e.g. ["corridor_A_001", "corridor_A_004"]).',
      },
    },
    required: ['candidateIds'],
  },
};

export const TOOL_STAGE_CORRIDOR: ToolDefinition = {
  name: 'neuralhaptics_stage_corridor',
  description:
    'Stages a candidate trajectory into the human planner\'s visible 3D viewport. Renders the previous trajectory as a ghost line, updates DBS lead geometry, and animates the camera. Requires expectedRevision for optimistic concurrency. Reversible mutation.',
  inputSchema: {
    type: 'object',
    properties: {
      candidateId: {
        type: 'string',
        description: 'The candidate trajectory ID to stage (must match a result from search_corridors).',
      },
      expectedRevision: {
        type: 'integer',
        description: 'Current known plan revision. Rejects with REVISION_CONFLICT if stale.',
      },
    },
    required: ['candidateId', 'expectedRevision'],
  },
};

export const TOOL_PREVIEW_STIMULATION: ToolDefinition = {
  name: 'neuralhaptics_preview_stimulation',
  description:
    'Updates DBS stimulation parameters (current, frequency, pulse width, active contacts). Computes activation proxy volume, 256-point target coverage, avoidance overlap, and educational Shannon reference metric. Requires expectedRevision. Mutation.',
  inputSchema: {
    type: 'object',
    properties: {
      current_mA: { type: 'number', description: 'Stimulation amplitude in mA (0.1 to 10.0).' },
      frequency_Hz: { type: 'number', description: 'Pulse frequency in Hz (2 to 250).' },
      pulseWidth_us: { type: 'number', description: 'Pulse width in microseconds (30 to 450).' },
      contacts: {
        type: 'array',
        items: { type: 'integer', minimum: 0, maximum: 3 },
        description: 'Indices of active electrode contacts [0, 1, 2, 3].',
      },
      expectedRevision: {
        type: 'integer',
        description: 'Current known plan revision. Rejects with REVISION_CONFLICT if stale.',
      },
    },
    required: ['expectedRevision'],
  },
};

export const TOOL_UNDO_AGENT_CHANGE: ToolDefinition = {
  name: 'neuralhaptics_undo_agent_change',
  description:
    'Reverts the latest staged agent mutation, restoring the prior trajectory and lead position. Does not undo independent human edits. Requires expectedRevision. Mutation.',
  inputSchema: {
    type: 'object',
    properties: {
      expectedRevision: {
        type: 'integer',
        description: 'Current known plan revision. Rejects with REVISION_CONFLICT if stale.',
      },
    },
    required: ['expectedRevision'],
  },
};

export const TOOL_EXPORT_APPROVED_PLAN: ToolDefinition = {
  name: 'neuralhaptics_export_approved_plan',
  description:
    'Exports the authoritative research plan. DYNAMIC GATE: Only available when the plan has received explicit human cryptographic approval (SHA-256) and has not undergone subsequent modifications.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};
