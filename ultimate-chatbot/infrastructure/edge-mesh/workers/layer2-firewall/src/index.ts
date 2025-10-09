import { createSignedRequestInit, jsonResponse, verifySignedRequest } from "../../shared/protocol";

interface Env {
  HMAC_SECRET: string;
  ORCHESTRATOR_SERVICE?: Fetcher;
}

interface FirewallPayload {
  sessionId: string;
  origin: string | null;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response("", { status: 204 });
    }

    if (request.method === "POST" && url.pathname === "/verify") {
      return handleVerification(request, env);
    }

    if (request.method === "POST" && url.pathname === "/forward") {
      const verification = await verifySignedRequest<FirewallPayload>(request, env.HMAC_SECRET);
      if (!verification.valid || !verification.data) {
        return jsonResponse({ allowed: false, reason: verification.reason ?? "verification_failed" }, { status: 400 });
      }

      if (!env.ORCHESTRATOR_SERVICE) {
        return jsonResponse({ allowed: false, reason: "orchestrator_unbound" }, { status: 503 });
      }

      const forwardInit = await createSignedRequestInit(verification.data, env.HMAC_SECRET);
      const orchestrator = await env.ORCHESTRATOR_SERVICE.fetch("https://layer6.internal/chat", forwardInit);
      return orchestrator;
    }

    return jsonResponse({ error: "Not Found" }, { status: 404 });
  },
};

async function handleVerification(request: Request, env: Env): Promise<Response> {
  const verification = await verifySignedRequest<FirewallPayload>(request, env.HMAC_SECRET);
  if (!verification.valid || !verification.data) {
    return jsonResponse({ allowed: false, reason: verification.reason ?? "verification_failed" }, { status: 400 });
  }

  const { payload, origin, headers } = verification.data;
  const content = normalizeContent(payload);
  const decision = evaluate(content);

  const response = {
    allowed: decision.allowed,
    reason: decision.reason,
    origin,
    heuristics: {
      tokens: content.tokens,
      headerCount: Object.keys(headers).length,
    },
  };

  return jsonResponse(response, { status: decision.allowed ? 200 : 451 });
}

function normalizeContent(payload: Record<string, unknown>) {
  const text = typeof payload.message === "string" ? payload.message : JSON.stringify(payload).slice(0, 4096);
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  return { text, tokens };
}

function evaluate(content: { text: string; tokens: string[] }) {
  const banned = ["rm -rf", "drop database", "malware", "sqlmap"];
  const match = banned.find((keyword) => content.text.toLowerCase().includes(keyword));
  if (match) {
    return { allowed: false, reason: `blocked_keyword:${match}` };
  }
  if (content.tokens.length > 1200) {
    return { allowed: false, reason: "message_too_large" };
  }
  return { allowed: true, reason: "clean" };
}
