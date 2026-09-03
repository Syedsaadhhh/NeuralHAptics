# NeuralHaptics

NeuralHaptics is a research-grade browser-native spatial reasoning prototype built for the OpenAI WebMCP Challenge, demonstrating how AI agents perceive 3D geometric constraints directly via WebMCP rather than inferring them from pixels.

## Why WebMCP Is Necessary

Conventional multimodal AI agents interact with 3D applications through screenshots, canvas DOM clicks, or ad-hoc vision-language inferences. In safety-critical spatial domains such as surgical planning or CAD engineering, this paradigm suffers from occlusion, loss of metric precision, hallucinated depth, and inability to feel geometric tension.

WebMCP enables the browser to expose authoritative application semantics directly to agents. Instead of guessing 3D clearance from 2D pixels, the agent interrogates the exact 3D stereotactic risk field, evaluates candidate corridors with millimeter precision, and negotiates planning trade-offs inside an authoritative shared state.

## What "Machine Haptics" Means

**Humans see the 3D world. Agents feel its constraints.**

Machine Haptics is an interaction layer that translates continuous 3D geometric relationships into structured, machine-actionable spatial signals:
- **Repulsion Vectors**: Unit vectors pointing along the normal from the nearest vascular hazard toward the trajectory segment.
- **Hazard Intensity**: Continuous risk measure $[0, 1]$ that scales smoothly as clearance approaches critical safety thresholds.
- **Constraint Tension**: A normalized scalar $[0, 1]$ indicating the degree of spatial constriction exerted by surrounding obstacles.
- **Target Attraction**: Goal-directed vectors guiding the trajectory toward optimal deep-brain target coordinates.

These signals allow AI agents to navigate complex 3D corridors geometrically without needing physical simulation or heavyweight GPU backends.

## Human-Agent Collaboration Model

1. **Shared Authoritative State**: A single client-side `planStore` governs all planning parameters. Human UI controls and WebMCP tools call the exact same functions.
2. **Optimistic Concurrency**: Every mutating WebMCP tool requires `expectedRevision`. If human interaction modifies the plan while an agent is reasoning, the agent's stale mutation is rejected with `REVISION_CONFLICT`.
3. **Reversible Mutations**: Staged agent corridors can be inspected, compared against previous ghost trajectories, and immediately reverted via `neuralhaptics_undo_agent_change`.
4. **Dynamic Human Approval Gate**: Agents cannot self-approve plans. Explicit human approval cryptographically seals the approved plan revision with a SHA-256 digest and dynamically registers the `neuralhaptics_export_approved_plan` tool. Any subsequent state change immediately revokes approval and unregisters the export tool.

## Architecture

```
src/
├── core/
│   ├── types.ts              # Canonical stereotactic and WebMCP types
│   ├── brainData.ts          # Synthetic STN, GPi, Internal Capsule, and 14 vessels
│   ├── geometry.ts           # True 3D segment-to-segment clearance algorithm
│   ├── riskField.ts          # Machine Haptics repulsion and tension engine
│   ├── candidateSearch.ts    # Deterministic 512-point Pareto corridor search
│   ├── stimulation.ts        # Activation proxy volume & Shannon reference
│   ├── planStore.ts          # Authoritative reactive store with optimistic locking
│   └── approval.ts           # Canonical JSON serialization & SHA-256 digest
├── workers/
│   └── trajectoryWorker.ts   # Web Worker for non-blocking multi-objective search
├── webmcp/
│   ├── toolSchemas.ts        # Formal WebMCP schemas
│   ├── registerTools.ts      # Native document.modelContext registration
│   └── localHarness.ts       # Fallback harness for browsers without WebMCP
└── components/
    ├── Viewport3D.tsx        # Three.js 60 FPS viewport with OrbitControls
    ├── CortexModel.tsx       # Procedural translucent cortex with sulcal lines
    ├── VesselNetwork.tsx     # 14 smooth red tubular vascular segments
    ├── DBSLead.tsx           # 4-contact platinum DBS lead with active glow
    ├── ActivationVolume.tsx  # Amber activation proxy visualization
    ├── MachineHapticsOverlay.tsx # 3D repulsion vector arrows
    ├── CandidateGhosts.tsx   # Visual ghost comparison trajectories
    ├── PlanningHUD.tsx       # High-value metrics & Shannon reference status
    ├── ConstraintPanel.tsx   # Human priority controls & manual adjustment
    ├── WebMCPAudit.tsx       # Live audit trail of all tool executions
    ├── ApprovalGate.tsx      # Human cryptographic approval & JSON export
    └── ProtocolStatus.tsx    # Accurate protocol tier indicator
```

## WebMCP Tools

| Tool | Type | Purpose |
|------|------|---------|
| `neuralhaptics_get_context` | Read-only | Retrieve authoritative stereotactic state, hazards, constraints, and approval status. |
| `neuralhaptics_search_corridors` | Read-only | Execute deterministic 512-entry Pareto corridor search. |
| `neuralhaptics_evaluate_corridor` | Read-only | Evaluate arbitrary 3D trajectory for clearance, intersections, and tension. |
| `neuralhaptics_compare_corridors` | Read-only | Return multi-objective comparison matrix for candidate corridors. |
| `neuralhaptics_stage_corridor` | Mutation | Stage candidate corridor in the human's 3D viewport (requires `expectedRevision`). |
| `neuralhaptics_preview_stimulation` | Mutation | Update stimulation parameters and compute activation proxy & coverage (requires `expectedRevision`). |
| `neuralhaptics_undo_agent_change` | Mutation | Revert latest staged agent mutation (requires `expectedRevision`). |
| `neuralhaptics_export_approved_plan` | Gate Tool | Export plan. **Dynamically registered only when human cryptographic approval is active.** |

## Running Locally

Prerequisites: Node.js 18+ and npm.

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run automated tests
npm run test

# Production build
npm run build
```

## WebMCP Testing

- **Native WebMCP Browsers**: When loaded in a browser supporting `document.modelContext`, tools register automatically and the badge displays `WebMCP Active`.
- **Local Harness**: In standard browsers, the built-in Local Development Harness provides identical tool execution under the origin `local-harness`.
- **Deterministic Evaluation Mode**: Append `?demo=1` to the URL to initialize deterministic preset Case A with stable camera and candidate ordering.

See [TESTING.md](TESTING.md) for full testing workflows and verification checklists.

## Synthetic Data & Non-Clinical Disclaimer

Research simulation using synthetic anatomy. Not a medical device or clinical recommendation.

All anatomical structures, coordinates, vascular trajectories, and stimulation models in NeuralHaptics are procedurally generated synthetic geometries designed solely to demonstrate human-agent spatial reasoning over WebMCP.

## License

MIT License. See [LICENSE](LICENSE) for details.
