# Layer 4 – Tiny ML Services

This layer processes lightweight ML workloads such as BM25 ranking, embeddings, and intent classification.

## Responsibilities
- Maintain hybrid BM25/vector indexes in Workers KV/Vectorize.
- Run WASM-based TinyML models for low-latency scoring.
- Provide metadata to Layer 6 for orchestration.

## Setup Checklist
1. Configure `VECTORIZE_INDEX` binding or supply dataset to Workers KV.
2. Document dataset provenance and retention in `data-catalog.yaml`.
3. Expose `POST /rank` and `POST /embed` endpoints in `openapi.yaml`.
4. Schedule retraining jobs through Cloudflare Queues or GitHub Actions.

## Handoffs
- Returns top-k document IDs to Layer 6 for prompt enrichment.
- Flags anomalous content for Layer 3 review when thresholds exceed baselines.
