# Layer 3 – Thorium Analysis

Manages the CISA-backed Thorium stack for deep file, repository, and malware
analysis.

## Responsibilities
- Accept only signed requests from Layer 6.
- Queue scans to dedicated Thorium infrastructure via Cloudflare Tunnel.
- Return tracking IDs so downstream layers can poll status asynchronously.
- Provide incident evidence packages to Layer 7 on completion.

## Setup Checklist
1. Deploy the Worker located in `infrastructure/cloudflare/workers/layer3-thorium`.
2. Bind `HMAC_SECRET` and configure Durable Objects or Queues for scan jobs.
3. Establish a secure tunnel to your Thorium cluster (private network segment).
4. Publish API schema for `/scan` endpoint in `openapi.yaml`.

## Handoffs
- Notifies Layer 6 (and optionally Layer 7) when scans complete.
- Supplies SOC tooling with signed evidence artifacts for compliance.
