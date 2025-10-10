# Layer 2 – Firewall & Policy

Provides prompt/code moderation, anomaly detection, and request brokering before
traffic reaches sensitive layers.

## Responsibilities
- Validate HMAC signatures on inbound requests from Layer 1.
- Apply heuristic/policy engines (policy guards, prompt filters, custom rules).
- Sign downstream requests to the orchestrator after successful evaluation.
- Emit analytics events for Zero Trust dashboards and SIEM ingestion.

## Setup Checklist
1. Deploy the Worker in `edge-mesh/workers/layer2-firewall`.
2. Bind the shared `HMAC_SECRET` and a service binding to Layer 6.
3. Integrate your preferred guardrail engine for policy enforcement.
4. Document `/verify` and `/forward` endpoints via `openapi.yaml`.

## Handoffs
- Approved payloads move to Layer 6 via signed envelopes.
- Blocked payloads should be stored in Layer 7 for forensics and alerts.
