# Chattia – Embeddable Chat Interface

Chattia packages a vendor-neutral, plug-and-play chat surface that you can host on
any static site or front-end framework. It is intentionally decoupled from the
Worker mesh so that customer-facing teams can iterate on experience, theming,
and instrumentation without redeploying the secure automation layers.

## Features
- Drop-in widget that scans for `[data-chattia-embed]` containers.
- Configurable accent, title, welcome message, and API endpoint per host page.
- Session reuse via HTTP-only cookies or custom `sessionId` hand-off.
- Graceful error handling and accessibility-minded defaults.

## Quick Start
1. Host `embed/widget.js` on a static origin (Pages, Netlify, Firebase, etc.).
2. Reference the script and a mounting element on any page:

```html
<div data-chattia-embed data-title="Concierge" data-endpoint="https://layer1.example.com/chat"></div>
<script src="/path/to/widget.js" defer></script>
```

3. Optionally set `window.CHATTIA_DEFAULT_ENDPOINT` before loading the script to
define a global default endpoint.
4. Customize styling by overriding CSS variables or editing the widget source.

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

## Local Development
No bundler is required. Serve `widget.js` locally with any static file server
and point it at your staging Worker endpoint. The widget depends only on browser
APIs and fetch.
