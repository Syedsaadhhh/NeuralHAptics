# NeuralHaptics

Browser-native spatial reasoning workbench showing how WebMCP gives AI agents authoritative geometric understanding of complex visual applications.

**Humans see the spatial plan. Agents receive its constraints.**

## The Problem

Canvas/WebGL spatial applications are visually understandable to humans but expose little useful semantic geometry to agents.

An AI looking at pixels cannot reliably determine exact:
- hazard clearance
- trajectory geometry
- spatial constraints
- candidate trade-offs

## What NeuralHaptics Does

Synthetic stereotactic planning demonstration.

**Human sees**:
- coronal view
- axial view
- sagittal view
- target nucleus
- hazards
- trajectory path

**Agent receives through WebMCP**:
- exact scene state
- vessel clearance
- constraint tension
- risk vectors
- Pareto trajectory candidates

## Human + Agent Workflow

1. Human selects case, target, and clearance constraint.
2. Agent reads authoritative geometry through WebMCP.
3. Agent searches 512 candidate paths.
4. Agent compares Pareto trade-offs.
5. Agent stages a candidate.
6. Human accepts, modifies, or undoes.

## Machine Haptics

- **Nearest Hazard**: Exact segment-to-segment distance and identifier of the nearest critical obstacle.
- **Clearance**: Authoritative minimum Euclidean clearance in millimeters (no bounding box approximations).
- **Repulsion Vector**: Normalized 3D gradient vector pointing away from the closest hazard boundary.
- **Constraint Tension**: Normalized scalar tension $[0.0, 1.0]$ integrating proximity and directional constriction.

## Interface

- **Coronal (X-Z)**: Frontal stereotactic cross-sectional view showing cortex, ventricles, target nucleus, and trajectory descent.
- **Axial (X-Y)**: Superior-inferior slice with cranial contour, lateral ventricles, and vascular cross-sections.
- **Sagittal (Y-Z)**: Parasagittal slice displaying target depth, internal capsule avoidance zone, and trajectory.
- **Path Comparison**: Quantitative trade-off matrix comparing candidate trajectories against nominal baseline.
- **3D Overview**: Demand-driven simplified Three.js volumetric overview.
- **WebMCP Activity**: Collapsible activity audit timeline.

### Component Architecture

```
src/
├── components/
│   ├── SliceView.tsx            # Deterministic procedural 2.5D SVG slices (Coronal, Axial, Sagittal)
│   ├── MultiPlanarViewer.tsx    # 2x2 multi-planar grid container
│   ├── PathComparisonView.tsx   # Spatial trade-off matrix & Pareto candidate cards
│   ├── AgentProposalPanel.tsx   # Focused metrics, acceptance gate, and collapsible WebMCP audit
│   ├── ConstraintPanel.tsx      # Case selection, target picker, and clearance bias controls
│   ├── Viewport3D.tsx           # Lightweight demand-driven 3D overview
│   ├── CortexModel.tsx          # Translucent cerebral shell
│   ├── VesselNetwork.tsx        # Thin vascular paths (14 segments)
│   ├── DBSLead.tsx              # Active trajectory probe & electrode contacts
│   ├── MachineHapticsOverlay.tsx# 3D haptic repulsion vector streamlines
│   └── ProtocolStatus.tsx       # Live WebMCP protocol status pill
├── core/
│   ├── brainData.ts             # Synthetic anatomical coordinates (STN, GPi, Internal Capsule, vessels)
│   ├── geometry.ts              # True segment-to-segment 3D Euclidean clearance engine
│   ├── riskField.ts             # Machine Haptics risk vectors and constraint tension formulas
│   ├── candidateSearch.ts       # 512-sample Pareto candidate generator & ranking
│   ├── planStore.ts             # Authoritative state store with optimistic concurrency
│   └── approval.ts              # Canonical serialization & plan digest
└── webmcp/
    ├── registerTools.ts         # Native WebMCP document.modelContext registration
    ├── toolSchemas.ts           # JSON schemas for WebMCP tool signatures
    └── localHarness.ts          # Local developer test harness
```

## WebMCP

### Core Capabilities
- `neuralhaptics_get_context`: Query authoritative 3D spatial state, nominal burr hole, target center, and active clearance.
- `neuralhaptics_search_corridors`: Deterministically sample 512 trajectories filtered by clearance thresholds.
- `neuralhaptics_evaluate_corridor`: Compute true segment clearances, avoidance zone margins, and constraint tensions.
- `neuralhaptics_compare_corridors`: Rank and compare trade-offs across multiple candidates.
- `neuralhaptics_stage_corridor`: Reversibly stage a candidate corridor with optimistic revision concurrency (`REVISION_CONFLICT`).
- `neuralhaptics_undo_agent_change`: Roll back latest staged agent mutation to prior human baseline.

> **Secondary prototype capabilities**: The codebase also registers `neuralhaptics_preview_stimulation` (VTA activation radius evaluation) and `neuralhaptics_export_approved_plan` (dynamic export authorized upon human acceptance).

## Safety / Scope

Research simulation using synthetic anatomy.
Not a medical device or clinical recommendation.

## Run

```bash
npm install
npm run dev
npm test
npm run build
```

## License

MIT
