# Edge Worker Mesh – 7-Layer Blueprint

## Feasibility Summary
Building a "7-layer" chatbot stack that keeps each layer isolated yet
interconnected is feasible with the assets already present in this repository
and the neutral "EdgeMesh" perimeter defined here. The existing applications in
`apps/` supply the core capabilities for conversation UIs, agent brains,
inference runtimes, security enforcement, and forensic analysis. EdgeMesh
Workers, Durable Objects, Queues, object storage, perimeter access policies,
and key/value or vector stores can be used to harden communication between
layers while maintaining low-latency routing and observability.

The recommended approach is to stage the integration scaffolding inside this
repository (for code review and IaC management) while deploying the production
workloads to EdgeMesh infrastructure. Each layer becomes its own Worker service
(or collection of services) with explicit API contracts and perimeter policies.
This separation satisfies cyber security requirements, simplifies incident
response, and keeps sensitive inference or scanning logic in compartmentalized
environments.

For clean decoupling, all end-user interface assets live in `../chattia`, while
this `worker/` tree focuses solely on the Worker mesh, security policies, and
operations runbooks. You can iterate on the Chattia widget without redeploying
Workers, and vice versa.

## Layered Architecture Mapping
| Layer | Purpose | Recommended Component(s) | EdgeMesh Role |
|-------|---------|---------------------------|-----------------|
| 1. User Interface | Multilingual chat front ends with PDF/BM25 search. | `../chattia/embed/widget.js`, UI templates within `apps/` | Static assets on edge pages; Worker proxy injects auth tokens, rate limits. |
| 2. Firewall & Policy | Prompt/code moderation, anomaly detection, request brokering. | Safeguard toolkits within `apps/` | Dedicated Worker enforcing guardrail heuristics; integrates with EdgeMesh perimeter policies. |
| 3. Deep Analysis Layer | Deep file/repo inspection and SOC automation. | Forensic automation stacks within `apps/` | Isolated Worker with Durable Object orchestrating remote scanners (private tunnel to analysis cluster). |
| 4. Tiny ML Services | Edge-friendly classical ML scoring (intent, BM25, embeddings). | Lightweight ML utilities within `apps/` | Worker with WASM models, Workers AI bindings, or KV for indexes. |
| 5. Tiny LLM Inference | Lightweight conversational models for rapid responses. | Compact LLM runtimes within `apps/` | Worker calling dedicated inference endpoints via secure HTTPS (mTLS). |
| 6. Tiny AI Orchestration | Tool routing, RAG, automation logic. | Agent starter kits within `apps/` | Durable Object maintaining sessions, orchestrating tool calls, caching context in KV/D1. |
| 7. Enterprise LLM/ML Backbone | High-throughput models, external MCPs, analytics. | Serving stacks and MCP bridges within `apps/` | Worker acting as broker to external MCP servers via perimeter tunnels; audit logs to long-term storage. |

## Directory Structure Proposal
```
worker/
├── README.md                # This blueprint
├── edge-mesh/
│   ├── wrangler.toml        # Shared defaults with service bindings
│   ├── workers/
│   │   ├── layer1-ui/
│   │   ├── layer2-firewall/
│   │   ├── layer3-thorium/
│   │   ├── layer4-tiny-ml/
│   │   ├── layer5-tiny-llm/
│   │   ├── layer6-orchestrator/
│   │   └── layer7-backbone/
│   └── pipelines/           # GitHub Actions for wrangler deploy
├── layers/
│   ├── layer1-ui/
│   ├── layer2-firewall/
│   ├── layer3-thorium/
│   ├── layer4-tiny-ml/
│   ├── layer5-tiny-llm/
│   ├── layer6-orchestrator/
│   └── layer7-backbone/
└── policies/
    ├── zero-trust.yml       # Access, device posture, logging configs
    └── compliance.md        # NIST/PCI control mappings
```
Each `layers/layerX-*` directory stores integration code, configuration, docs,
and IaC excerpts specific to that layer. Deployment-ready Workers live under
`edge-mesh/workers/` to keep runtime code distinct from design
artifacts or local tooling. Boilerplate Workers, policies, and pipeline
templates are now committed so you can clone, configure secrets, and deploy each
layer independently.

## Scaffolded Implementation Assets

- **EdgeMesh Workers** – Seven TypeScript entrypoints under
  `edge-mesh/workers/` demonstrate session handling, firewall
  checks, BM25 scoring, TinyLLM proxying, orchestration fan-out, and audit
  logging patterns. A shared `protocol.ts` module signs every inter-layer call
  with HMAC to enforce provenance and replay protection.
- **Mesh Configuration** – `edge-mesh/wrangler.toml` defines
  per-layer environments, routes, and shared bindings that you can customize for
  your tenant.
- **Security Policies** – `policies/zero-trust.yml` and
  `compliance.md` align identity, posture, and logging controls with NIST CSF,
  PCI DSS 4.0, and public-sector Cyber Essentials guidance.
- **Deployment Pipelines** – `edge-mesh/pipelines/README.md`
  includes a reusable GitHub Actions skeleton for CI/CD with Wrangler.
- **Operational Runbooks** – Each `layers/layerX-*/README.md` outlines
  responsibilities, setup checklists, and handoffs for cross-team coordination.

## Security & Compliance Considerations
1. **Zero Trust Per Layer** – Require device posture checks, mTLS, and signed JWTs
   per layer before forwarding traffic. Workers KV/Secrets store ephemeral keys;
   Durable Objects manage rotating credentials.
2. **Data Minimization** – Store only hashed or encrypted session data (AES-256)
   in D1/R2. Apply field-level encryption for PCI/GDPR compliance.
3. **Observability** – Ship logs to edge log drains + object storage; mirror to
   SIEM (e.g., Wazuh, Splunk) for continuous monitoring. Map events to NIST CSF
   functions.
4. **Change Management** – Manage IaC via Git workflows. Use GitHub Actions with
   OIDC to authenticate to EdgeMesh and enforce policy-as-code checks.
5. **Incident Response** – Document runbooks per layer. The deep-analysis layer
   can stage forensic captures while firewall layer triggers automated isolation.

## Implementation Roadmap
1. **Scaffold Layer Directories** – Use this repository to host baseline Worker
   skeletons, Terraform (if desired), and documentation. Start with Layer 1 UI
   and Layer 2 firewall to validate routing.
2. **Configure EdgeMesh Environments** – Create separate Worker namespaces per
   layer, set up KV/Durable Objects, enable Zero Trust policies, configure
   service bindings for controlled inter-layer calls.
3. **Integrate Existing Apps** – Fork relevant modules from `apps/` into the
   appropriate layer directories (e.g., adapt safeguard guard scripts for the
   firewall Worker). Provide scripts to package and deploy to EdgeMesh.
4. **Secure Communications** – Implement signed request envelopes (now scaffolded
   via `shared/protocol.ts`) or mTLS between Workers. Use EdgeMesh Queues for
   asynchronous tasks (e.g., deep-analysis scans) to avoid synchronous coupling.
5. **Testing & Compliance Validation** – Build CI workflows to run unit tests,
   security scans, linting, and compliance checklists (PCI DSS 3–11) prior to
   deployment. Utilize EdgeMesh preview environments for staged rollout.

## EdgeMesh Deployment Tips
- **Configuration** – Use a root `wrangler.toml` with per-layer `[env.layerX]`
  sections, enabling shared bindings (KV, D1) but unique routes.
- **Internal APIs** – When layers must communicate, prefer `service bindings`
  instead of raw HTTP calls to stay within the private service mesh. Sign each
  request with `HMAC_SECRET` so receiving Workers can reject tampered traffic.
- **Edge Storage** – KV for configs, Durable Objects for session state, object
  storage for artifacts (PDFs), D1 for audit logs, vector indexes for embeddings
  supporting BM25 or hybrid search in Layer 1/4.
- **Workers AI** – Bind to Workers AI for inference where latency is critical;
  fallback to compact LLM endpoints behind Zero Trust tunnels for private
  inference.

## Embedding the Chatbot
The UI package that end users embed now lives in the sibling `../chattia`
directory. Host `chattia/embed/widget.js` on a static origin and place a
container like the example below on any website you manage:

```html
<div data-chattia-embed data-title="Concierge" data-endpoint="https://layer1.example.com/chat"></div>
<script src="https://cdn.example.com/chattia/widget.js" defer></script>
```

The script auto-mounts on `[data-chattia-embed]` elements, exchanges signed
payloads with the Layer 1 Worker, and exposes `window.ChattiaEmbed` for manual
initialization. Keeping the UI assets outside this `worker/` tree ensures the
mesh can evolve independently of UX refreshes or tenant-specific theming.

## Multi-tenant Worker Mesh Strategy
- **Worker-only Footprint** – Each layer can run exclusively as a Cloudflare
  Worker or Durable Object, so you can host the full seven-layer stack without
  provisioning additional VMs or managed services. `wrangler.toml` already
  scopes every layer to its own Worker service; clone those environments for
  production, staging, and per-customer sandboxes.
- **Tenant Routing** – Store tenant metadata (allowed domains, feature flags,
  rate limits) in D1 or KV. The Layer 1 Worker reads the tenant record based on
  the embedding’s origin or API key, stamps it into the signed envelope, and
  Layer 6 uses it to select the correct downstream bindings (Tiny ML models,
  MCP connectors, logging buckets).
- **Customer PDF Requirement** – Configure Layer 1 to block conversation
  initialization until a tenant-specific document inventory exists. You can
  enforce this by checking R2/Object storage for uploaded PDFs or hybrid-search
  indexes in Layer 4 before allowing `/chat` calls. If no documents are present,
  return a signed error prompting the customer to upload source material.
- **Secure Upload Flow** – Provide short-lived signed upload URLs from Layer 7.
  Uploaded artifacts trigger Layer 3 scanning and Layer 4/Layers Vectorize
  indexing. Only after all checks succeed does Layer 6 mark the tenant as
  `ready` in KV, unlocking the chatbot for that site.
- **Scale to Many Websites** – The embeddable widget simply points to the Layer
  1 Worker. As long as the requesting domain is registered, the Worker issues a
  per-tenant session token, applies CORS from `UI_ALLOWED_ORIGINS`, and fans out
  requests through the mesh. This design lets dozens of external websites share
  the same Worker mesh while keeping data partitioned by tenant identifiers.

## Next Steps
1. Approve the directory structure and blueprint.
2. Generate Worker templates for each layer (TypeScript/JavaScript or Rust).
3. Define API contracts (OpenAPI specs) to document payloads and policies.
4. Create automation scripts (e.g., run your worker scaffolding CLI) to produce
   downloadable bundles for each layer.
5. Establish GitHub Actions pipeline to lint, test, and deploy per layer.

Once these steps are in place, we can iteratively flesh out each layer with the
required code, configuration, and documentation while maintaining rigorous
separation for cyber security and compliance.
