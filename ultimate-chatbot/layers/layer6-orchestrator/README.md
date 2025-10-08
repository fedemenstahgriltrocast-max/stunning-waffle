# Layer 6 – Orchestration & Tooling

The orchestrator coordinates routing across ML, LLM, and external MCP services.

## Responsibilities
- Maintain conversation state via Durable Objects/D1.
- Invoke registered tools (search, code execution, database lookups).
- Apply governance policies to model responses and escalate to Layer 7 when needed.

## Setup Checklist
1. Bind `TINY_ML_SERVICE`, `TINY_LLM_SERVICE`, and `BACKBONE_SERVICE` via service bindings.
2. Implement tool registry in `tools/registry.ts`.
3. Define `policy-matrix.yaml` aligning requests to required safeguards.
4. Configure GitHub Actions pipeline for schema validation and integration tests.

## Handoffs
- Sends enriched responses to Layer 1 UI.
- Emits audit events to Layer 7 and policy breaches back to Layer 2.
