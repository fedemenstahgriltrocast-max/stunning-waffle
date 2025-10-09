# Layer 1 – User Interface

This layer hosts customer-facing chat clients (web, mobile, kiosk) that
interact with the orchestrator through the Layer 1 EdgeMesh Worker.

## Responsibilities
- Serve static chat UIs (Pages or Workers Sites).
- Handle PDF uploads and BM25/hybrid search prompts.
- Enforce CORS, rate limiting, and human verification before forwarding traffic
  to Layer 2.
- Sign every downstream request using the shared `HMAC_SECRET` to guarantee
  provenance when calling the firewall and orchestrator layers.

## Setup Checklist
1. Deploy the Worker at `infrastructure/edge-mesh/workers/layer1-ui` via
   Wrangler.
2. Configure Pages or a static hosting bucket to serve your UI assets.
3. Bind `SESSION_KV` for session storage, `FIREWALL_SERVICE` for Zero Trust
   validation, `ORCHESTRATOR_SERVICE` for Layer 6, and provide the
   `HMAC_SECRET` value.
4. Document UI routes in `openapi.yaml` (create in this directory).

## Embed Widget
- The Worker serves `/embed.js`, a drop-in script that renders a floating chat
  UI inside any host page.
- Configure allowed origins via the `UI_ALLOWED_ORIGINS` environment variable
  (comma-separated list, or `*` for trusted broad access).
- Mount automatically with a `<div data-ultimate-chatbot></div>` placeholder, or
  call `window.UltimateChatEmbed.mount(element, options)` manually to customize
  theme, endpoint, or welcome message.

## Handoffs
- Requests that pass verification call the Layer 6 orchestrator.
- File uploads are sent to Layer 7 for compliance storage via signed URLs.
