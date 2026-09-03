# NeuralHaptics — Testing Guide

This guide provides verification procedures for testing NeuralHaptics across different browser environments, the Local Development Harness, and automated test suites.

---

## 1. Automated Test Suite

Run the Vitest test suite to verify core geometric primitives, Machine Haptics calculations, optimistic concurrency, and the dynamic human approval gate:

```bash
npm run test
```

### Verified Test Cases:
1. **Segment-to-Segment Clearance**: Analytical distance between skew perpendicular lines, parallel segments, and direct intersections.
2. **Direct Vessel Penetration**: True distance calculation accounting for vessel tube radius.
3. **Risk Vector Direction**: Normal repulsion vectors oriented strictly away from nearby vascular obstacles.
4. **Deterministic Candidate Ordering**: Reproducible 512-point Fermat spiral entry generation and Pareto ranking.
5. **Hard Hazard Rejection**: Exclusion of paths penetrating vessels or avoidance boundaries.
6. **Revision Counter**: Strict integer incrementation on every plan state mutation.
7. **Stale Mutation Rejection (`REVISION_CONFLICT`)**: Prevention of agent overwrites when human interacts mid-reasoning.
8. **Reversible Agent Undo**: Restoration of prior trajectory and lead position via `neuralhaptics_undo_agent_change`.
9. **Export Unavailable Before Approval**: Access rejection prior to cryptographic SHA-256 seal.
10. **Dynamic Export Available After Approval**: Immediate tool registration upon human approval.
11. **Approval Revocation**: Automatic tool unregistration and digest clearing upon subsequent mutation.

---

## 2. Standard Development Browser

In standard browsers without native `document.modelContext`:

1. Start the development server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000?demo=1`.
3. Verify the protocol status indicator displays:
   `WebMCP Unavailable — Local Harness` (honest tier display).
4. Verify 3D viewport loads with 60 FPS Three.js rendering:
   - Rotate camera with Left-Click drag.
   - Pan with Right-Click drag.
   - Zoom with mouse wheel.
5. In the right-hand **WebMCP Activity Audit** panel, use the **Local Tool Evaluation** buttons:
   - Click **Search**: Generates Pareto candidate corridors in the Web Worker.
   - Click **Stage**: Visually updates the 3D DBS lead to the staged corridor; renders previous trajectory as a dashed ghost line.
   - Click **Undo**: Reverts the staged corridor back to the baseline.
6. In the **Dynamic Human Approval Gate**:
   - Click **Approve Research Plan**.
   - Verify SHA-256 digest is calculated and displayed.
   - Verify plan is marked as approved for the current revision.
   - Click **Download Approved JSON** to inspect the serialized plan.
   - Adjust any slider in the **Human Priority Controls** panel; verify approval is immediately revoked and digest cleared.

---

## 3. Chrome with Native WebMCP Enabled

When running in a Chromium build with WebMCP flag enabled (`--enable-features=WebMCP` or experimental model context):

1. Start the workbench:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000`.
3. Check the header badge:
   - It will display `WebMCP Active` (with pulsing cyan indicator).
4. Open Chrome DevTools Console.
5. Verify registered tools:
   ```javascript
   // Check document.modelContext registered tools
   console.log(document.modelContext);
   ```
6. Verify dynamic gate:
   - Prior to human approval: `neuralhaptics_export_approved_plan` is **not** present.
   - Click **Approve Research Plan**: `neuralhaptics_export_approved_plan` is dynamically registered with an `AbortController`.
   - Mutate any slider: `neuralhaptics_export_approved_plan` is aborted and removed.

---

## 4. ChatGPT In-App Browser (WebMCP Agent Workflow)

When evaluated by an autonomous browser agent:

### Prompt 1: Discovery and Context Inspection
> "Inspect this stereotactic planning case. What target nucleus is selected, what are the current planning priorities, and what is the nearest vascular hazard?"

**Expected Agent Action:**
- Calls `neuralhaptics_get_context({ detail: "compact" })`.
- Receives state at revision #1 with target STN (Subthalamic Nucleus), nearest hazard `vessel_07_cortical_vein_a`, and constraint tension.

### Prompt 2: Corridor Search and Trade-Off Reasoning
> "Find a trajectory toward the STN with at least 2.5 mm vessel clearance. Prioritize vascular clearance but do not sacrifice more than 5% target coverage. Stage the best trade-off candidate but do not approve anything."

**Expected Agent Action:**
- Calls `neuralhaptics_search_corridors({ minimumVesselClearanceMm: 2.5 })`.
- Evaluates Pareto candidates.
- Calls `neuralhaptics_stage_corridor({ candidateId: "corridor_A_003", expectedRevision: 1 })`.
- The 3D viewport updates the DBS lead; previous path appears as a ghost line; revision increments to #2.

### Prompt 3: Concurrency Conflict Demonstration
1. Human manually nudges the entry point X coordinate by +1 mm in the UI (revision increments to #3).
2. Agent attempts another mutation with `expectedRevision: 2`.
3. WebMCP rejects call with `REVISION_CONFLICT`:
   ```json
   {
     "ok": false,
     "code": "REVISION_CONFLICT",
     "currentRevision": 3,
     "message": "The shared plan changed. Inspect current state before modifying it."
   }
   ```
4. Agent calls `neuralhaptics_get_context` to re-observe the updated coordinates.

### Prompt 4: Dynamic Approval Gate
1. Human clicks **Approve Research Plan** in the UI.
2. `neuralhaptics_export_approved_plan` becomes available via WebMCP.
3. Agent calls `neuralhaptics_export_approved_plan()` to retrieve the cryptographically sealed research plan.

---

## Tool Discovery Checklist

- [x] `neuralhaptics_get_context` (Read-only)
- [x] `neuralhaptics_search_corridors` (Read-only)
- [x] `neuralhaptics_evaluate_corridor` (Read-only)
- [x] `neuralhaptics_compare_corridors` (Read-only)
- [x] `neuralhaptics_stage_corridor` (Mutation, requires `expectedRevision`)
- [x] `neuralhaptics_preview_stimulation` (Mutation, requires `expectedRevision`)
- [x] `neuralhaptics_undo_agent_change` (Mutation, requires `expectedRevision`)
- [x] `neuralhaptics_export_approved_plan` (Gate Tool, dynamically registered only upon human approval)
