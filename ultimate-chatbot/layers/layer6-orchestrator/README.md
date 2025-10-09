# Layer 6 – Tiny AI Orchestrator

Coordinates conversational state, tool execution, and routing between Tiny ML,
Tiny LLM, Thorium, and enterprise backbone layers.

## Responsibilities
- Validate signed requests from Layer 1/2 before orchestrating tools.
- Fan out signed sub-requests to Layers 3–5 and consolidate the results.
- Trigger audit logging to Layer 7 with tamper-evident envelopes.
- Maintain conversation/session metadata in Durable Objects or KV.

## Setup Checklist
1. Deploy the Worker located at `infrastructure/cloudflare/workers/layer6-orchestrator`.
2. Bind `HMAC_SECRET` plus service bindings to Layers 3–5 and 7.
3. Attach storage (D1, KV, Durable Objects) for multi-turn context management.
4. Define `/chat` contract and tool invocation schema via `openapi.yaml`.

## Handoffs
- Returns consolidated responses to Layer 1 for user rendering.
- Sends attachments for scanning to Layer 3 and final summaries to Layer 7.
