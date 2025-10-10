# Chattia – Embeddable Chat Interface

Chattia packages a vendor-neutral, plug-and-play chat surface that you can host on
any static site or front-end framework. It is intentionally decoupled from the
Worker mesh so that customer-facing teams can iterate on experience, theming,
and instrumentation without redeploying the secure automation layers.

## Features
- Drop-in widget that scans for `[data-chattia-embed]` containers.
- Configurable accent, title, welcome message, send button label, and API endpoint per host page.
- Optional persistent transcripts via `data-storage-key`, keeping conversations and session IDs in browser storage.
- Accessibility-first shell: semantic landmarks, live regions, keyboard submit (Enter) and multiline support (Shift+Enter).
- Real-time UX feedback with a built-in typing indicator, auto-resizing composer, and stateful status messaging.
- Theme-ready CSS custom properties for accent, focus, glow, and hover treatments with graceful fallbacks.
- Concierge cosmetics encapsulated inside the interaction window so visual refreshes stay isolated from functional layers.
- Programmatic update API keeps title, aria labels, placeholder, send label, and accent tokens in sync without touching runtime logic.

## Quick Start
1. Host `embed/widget.js` on a static origin (Pages, Netlify, Firebase, etc.).
2. Reference the script and a mounting element on any page:

```html
<div data-chattia-embed data-title="Concierge" data-endpoint="https://layer1.example.com/chat"></div>
<script src="/path/to/widget.js" defer></script>
```

3. Optionally set `window.CHATTIA_DEFAULT_ENDPOINT` before loading the script to
define a global default endpoint.
4. Customize styling by overriding CSS variables on `.chattia-shell` or editing the dedicated cosmetic layer in `widget.js`.
5. (Optional) Provide a `data-storage-key="tenant-123"` attribute to persist the transcript across reloads for that key.

### Supported Data Attributes

| Attribute | Purpose | Example |
| --- | --- | --- |
| `data-endpoint` | Overrides the API endpoint used for `fetch` calls. | `https://layer1.example.com/chat` |
| `data-title` | Sets the header label and ARIA name. | `Concierge` |
| `data-accent` | Provides an accent color used for buttons, headers, and bubbles. | `#9333ea` |
| `data-placeholder` | Composer placeholder / input label. | `Type your question…` |
| `data-welcome` | Prefills an assistant message when no transcript exists. | `Hey there! How can I help?` |
| `data-send-label` | Localizes the send button text and aria label. | `Submit` |
| `data-storage-key` | Enables secure local persistence of transcript + sessionId. | `tenant-123` |

## API Contract
The widget expects a POST JSON endpoint that returns a JSON payload in the
following shape:

```json
{
  "sessionId": "optional-session-token",
  "result": "assistant response or structured data"
}
```

Any additional fields are passed through to the host application via the
resolved `result` value. Error responses should include a non-2xx HTTP status
code and a body describing the failure.

## Tenant Embedding Guidance
- Validate the embedding origin on the receiving Worker and return descriptive
  errors if a tenant has not completed prerequisite document uploads.
- Pair `data-endpoint` with tenant-specific URLs or API keys to segment traffic.
- Use CSP headers and Subresource Integrity when hosting the script in
  production.
- When using `data-storage-key`, prefer tenant-specific keys scoped per user to
  avoid cross-account transcript leakage on shared devices.
- Consider rotating `sessionId` values server-side when sensitive workflows are
  completed to reduce replay exposure.

## Concierge Cosmetic Isolation

- The interaction window is mounted as a dedicated `<section class="chattia-shell">`
  inside your host container so brand updates stay confined to the concierge
  surface.
- All cosmetic rules ship via a single inline `<style>` block that only targets
  `.chattia-shell` descendants, preventing bleed-over into surrounding layout
  layers.
- Accent tokens are recalculated through a cosmetic manager that gracefully
  falls back to the last known good palette, ensuring runtime updates cannot
  corrupt the functional pipeline.
- A `createConciergeShell` builder assembles header, log, status, and composer
  nodes, exposing update helpers so future visual refreshes can swap cosmetics
  or copy safely without touching persistence, networking, or security guards.

## Runtime Flow

```
Chattia Embed Runtime
├── Configuration Layer
│   ├── Attribute normalization (`data-*`, global defaults, JS overrides)
│   └── Accent token derivation for consistent theming
├── State Management
│   ├── Session + transcript cache (optional `localStorage`)
│   └── Busy + typing indicators, ARIA status updates
├── UI Shell Builder
│   ├── `createConciergeShell` returns header, log, status, composer references
│   ├── Header landmark with dynamic title + aria wiring helpers
│   ├── Live message log (ARIA `role="log"` with scroll isolation)
│   └── Composer form (textarea, send button, keyboard shortcuts)
├── Cosmetic Layer
│   ├── Inline stylesheet scoped to `.chattia-shell` descendants
│   ├── Accent token manager with update-safe fallbacks
│   └── Programmatic `updateAccent` hook for tenant theming
└── Network Lifecycle
    ├── Fetch POST to configured endpoint with session headers
    ├── JSON parsing + resilience to malformed payloads
    └── Result formatting + transcript persistence
```

## Local Development
No bundler is required. Serve `widget.js` locally with any static file server
and point it at your staging Worker endpoint. The widget depends only on browser
APIs and fetch.
