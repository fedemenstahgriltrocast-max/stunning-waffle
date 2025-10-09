# Layer 1 – User Interface

This layer hosts customer-facing chat clients (web, mobile, kiosk) that
interact with the orchestrator through the Layer 1 Cloudflare Worker.

## Responsibilities
- Serve static chat UIs (Pages or Workers Sites).
- Handle PDF uploads and BM25/hybrid search prompts.
- Enforce CORS, rate limiting, and human verification before forwarding traffic
  to Layer 2.
- Sign every downstream request using the shared `HMAC_SECRET` to guarantee
  provenance when calling the firewall and orchestrator layers.

## Setup Checklist
1. Deploy the Worker at `infrastructure/cloudflare/workers/layer1-ui` via
   Wrangler.
2. Configure Pages or a static hosting bucket to serve your UI assets.
3. Bind `SESSION_KV` for session storage, `FIREWALL_SERVICE` for Zero Trust
   validation, `ORCHESTRATOR_SERVICE` for Layer 6, and provide the
   `HMAC_SECRET` value.
4. Document UI routes in `openapi.yaml` (create in this directory).

## Handoffs
- Requests that pass verification call the Layer 6 orchestrator.
- File uploads are sent to Layer 7 for compliance storage via signed URLs.
