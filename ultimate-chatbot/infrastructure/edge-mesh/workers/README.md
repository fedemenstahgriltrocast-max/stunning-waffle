# EdgeMesh Worker Implementation Guide

This package houses the TypeScript entrypoints for every EdgeMesh Worker that
powers the seven-layer chatbot. The goal is to keep a consistent security model
and toolchain across layers while allowing each Worker to be deployed
independently.

## Development Workflow

1. **Install Dependencies** (optional – only needed for type-checking locally):
   ```bash
   npm install
   ```
2. **Type Check** the entire suite of Workers:
   ```bash
   npm run lint
   ```
3. **Dry-Run Deployments** from CI/CD or your workstation:
   ```bash
   npm run build
   ```
   The command runs `wrangler deploy --dry-run` so you can validate bindings,
   routes, and bundle output without pushing to production.

## Shared Security Protocol

The `shared/protocol.ts` module defines an HMAC-signed request envelope used for
Worker-to-Worker communication. Each layer validates signatures within five
minutes of issuance to guard against replay attacks and tampering.

- `createSignedRequestInit(payload, secret)` – wraps any payload with
  deterministic JSON serialization and adds signature headers.
- `verifySignedRequest(request, secret)` – validates the HMAC signature and
  returns a typed payload when valid.
- `jsonResponse(data, init)` – helper for returning JSON with consistent
  formatting.
- `withCors(response, origin)` – applies strict CORS headers for UI traffic.

Bind the shared `HMAC_SECRET` environment variable in `wrangler.toml` or your
secret manager before deploying. Rotate the secret via your access gateway and
redeploy Workers to propagate updates.

## Layer Bindings Overview

| Worker | Required Bindings | Optional Bindings |
| ------ | ----------------- | ----------------- |
| layer1-ui | `SESSION_KV`, `HMAC_SECRET`, service binding to `layer2-firewall`, `layer6-orchestrator` | `UI_ALLOWED_ORIGINS` (CSV) |
| layer2-firewall | `HMAC_SECRET` | service binding to `layer6-orchestrator` |
| layer3-thorium | `HMAC_SECRET` | Durable Object / Queue bindings for deep-analysis jobs |
| layer4-tiny-ml | `HMAC_SECRET` | `VECTORIZE_INDEX` (Workers Vectorize service) |
| layer5-tiny-llm | `HMAC_SECRET`, upstream URL + API key secrets | None |
| layer6-orchestrator | `HMAC_SECRET` | service bindings to layers 3–5 and 7 |
| layer7-backbone | `HMAC_SECRET` | `AUDIT_BUCKET` (object storage), outbound MCP connectors |

Configure these bindings per environment using the `[env.*]` sections in the
root `wrangler.toml`. Service bindings keep traffic on the private EdgeMesh
network instead of the public internet.

## Compliance Checklist

- **mTLS or Signed Requests** – already enforced via the shared HMAC signature.
- **Audit Logging** – Layer 7 stores signed envelopes in object storage. Connect it to your
  SIEM for long-term retention (PCI DSS Req. 10).
- **Rate Limiting** – Add perimeter rulesets or integrate Durable
  Objects for fine-grained throttling per session.
- **Secrets Management** – Inject API keys through `wrangler secret put` and
  service tokens from your Zero Trust perimeter rather than committing them to the repo.

With these patterns in place, you can flesh out each Worker with production
logic while maintaining secure, observable communication between layers.
