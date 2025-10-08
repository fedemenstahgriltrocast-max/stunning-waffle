# Layer 3 – Thorium Forensic Analysis

Thorium automates document and repository inspection with CISA-backed playbooks.

## Responsibilities
- Queue suspicious artifacts from Layers 1–2.
- Execute malware scanning, SBOM generation, and sandbox analysis.
- Produce case files for SOC dashboards.

## Setup Checklist
1. Connect `THORIUM_QUEUE` to a Cloudflare Queue that forwards jobs to Thorium Eter.
2. Register Thorium worker credentials in `policies/compliance.md`.
3. Define response webhooks for high severity events (Layer 7).
4. Update runbooks in `RUNBOOK.md` (create here) documenting triage flows.

## Handoffs
- Emits asynchronous reports to Layer 7 for audit storage.
- Sends anomaly signals back to Layer 2 to block related sessions.
