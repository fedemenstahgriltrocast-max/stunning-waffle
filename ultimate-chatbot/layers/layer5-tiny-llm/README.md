# Layer 5 – Tiny LLM Inference

Provide low-latency conversational responses using sub-2B parameter models.

## Responsibilities
- Proxy to TinyLLM/TinyLlama deployments via secure tunnels.
- Apply response shaping (system prompts, temperature controls).
- Return streaming or batched completions to Layer 6.

## Setup Checklist
1. Set `TINY_LLM_ENDPOINT` and `TINY_LLM_API_KEY` secrets in Wrangler.
2. Register fallback Workers AI model IDs for outage scenarios.
3. Document prompt templates in `prompts/system.md`.
4. Run latency monitors from Cloudflare Cron Triggers.

## Handoffs
- Sends completion payloads to Layer 6.
- Reports model health metrics to Layer 7 observability pipelines.
