# Layer 4 – Tiny ML Services

Hosts deterministic TinyML workloads (intent scoring, BM25 ranking, embeddings)
that enrich conversations without invoking full LLM inference.

## Responsibilities
- Validate signed envelopes from Layer 6 before scoring.
- Execute lightweight models (WASM, Workers AI, or KV-backed indexes).
- Return ranking metadata (scores, latency, index source) for downstream fusion.
- Emit telemetry to Layer 7 for performance and audit requirements.

## Setup Checklist
1. Deploy the Worker `infrastructure/edge-mesh/workers/layer4-tiny-ml`.
2. Bind `HMAC_SECRET` and optional `VECTORIZE_INDEX` or KV namespaces.
3. Load deterministic ML assets (BM25 tables, embeddings) at publish time.
4. Document `/bm25` or other scoring endpoints in `openapi.yaml`.

## Handoffs
- Sends signed insights to Layer 6.
- Shares ranking statistics with Layer 7 to enrich analytics dashboards.
