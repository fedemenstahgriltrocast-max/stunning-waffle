# Layer 5 – Tiny LLM Inference

Connects to compact LLM deployments for sub-2B parameter inference that runs in
private or edge-friendly environments.

## Responsibilities
- Verify signed chat envelopes from the orchestrator.
- Proxy prompts to your compact LLM endpoints over mTLS or Zero Trust tunnels.
- Normalize responses (stream, chunk, or JSON) for downstream layers.
- Record latency and token usage metrics for observability.

## Setup Checklist
1. Deploy the Worker at `infrastructure/edge-mesh/workers/layer5-tiny-llm`.
2. Bind `HMAC_SECRET`, `TINY_LLM_ENDPOINT`, and `TINY_LLM_API_KEY` as secrets.
3. Configure network policies (mTLS, Access service tokens) for upstream
   inference endpoints.
4. Define `/generate` schema within `openapi.yaml`.

## Handoffs
- Sends signed LLM responses to Layer 6.
- Shares usage metrics with Layer 7 for billing/compliance analytics.
