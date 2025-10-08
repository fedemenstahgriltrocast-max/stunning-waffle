# Layer 2 – Firewall & Policy Enforcement

Layer 2 isolates moderation, rate limiting, and anomaly detection controls. It validates every request before downstream services process it.

## Responsibilities
- Run PurpleLlama Llama Guard / Prompt Guard evaluations.
- Enforce API allowlists, device posture, and mTLS requirements.
- Trigger incident response workflows via Cloudflare Zero Trust.

## Setup Checklist
1. Set `FIREWALL_RULES` secret to a JSON array of regex policies.
2. Bind service tokens for PurpleLlama inference endpoints.
3. Configure logging to R2/SIEM for PCI DSS 10 compliance.
4. Mirror rule set to `policies/zero-trust.yml`.

## Handoffs
- `POST /verify` responses inform Layer 1 whether a request may proceed.
- Verified payloads are proxied to Layer 6 with signed JWT metadata.
