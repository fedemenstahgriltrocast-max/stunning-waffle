import { createSignedRequestInit, jsonResponse, withCors } from "../../shared/protocol";

export interface Env {
  SESSION_KV: KVNamespace;
  FIREWALL_SERVICE?: Fetcher;
  ORCHESTRATOR_SERVICE?: Fetcher;
  HMAC_SECRET: string;
}

const ALLOWED_ORIGINS = ["https://ui.example.com", "http://localhost:8787"];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get("origin");
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return withCors(jsonResponse({ error: "Forbidden origin" }, { status: 403 }), origin);
    }

    if (request.method === "OPTIONS") {
      return withCors(new Response(""), origin);
    }

    if (request.method !== "POST") {
      return withCors(jsonResponse({ error: "POST required" }, { status: 405 }), origin);
    }

    const sessionId = await ensureSession(request, env, ctx);
    const payload = await request.json().catch(() => ({}));

    if (env.FIREWALL_SERVICE) {
      const firewallInit = await createSignedRequestInit(
        { sessionId, origin, payload, headers: redactHeaders(request.headers) },
        env.HMAC_SECRET,
      );
      const verification = await env.FIREWALL_SERVICE.fetch("https://layer2.internal/verify", firewallInit);
      if (!verification.ok) {
        return withCors(jsonResponse({ error: "Request blocked" }, { status: verification.status }), origin);
      }
    }

    if (!env.ORCHESTRATOR_SERVICE) {
      return withCors(jsonResponse({ sessionId, notice: "Orchestrator service not bound" }), origin);
    }

    const orchestratorInit = await createSignedRequestInit(
      { sessionId, payload, origin },
      env.HMAC_SECRET,
    );
    const orchestratorResponse = await env.ORCHESTRATOR_SERVICE.fetch("https://layer6.internal/chat", orchestratorInit);

    if (!orchestratorResponse.ok) {
      return withCors(jsonResponse({ error: "Orchestrator unavailable" }, { status: orchestratorResponse.status }), origin);
    }

    let result: unknown;
    try {
      result = await orchestratorResponse.json();
    } catch (error) {
      result = { raw: await orchestratorResponse.text(), parseError: String(error) };
    }

    return withCors(jsonResponse({ sessionId, result }), origin);
  },
};

async function ensureSession(request: Request, env: Env, ctx: ExecutionContext): Promise<string> {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/sessionId=([^;]+)/);
  if (match) {
    return match[1];
  }

  const sessionId = crypto.randomUUID();
  ctx.waitUntil(env.SESSION_KV.put(
    `session:${sessionId}`,
    JSON.stringify({ createdAt: Date.now() }),
    { expirationTtl: 86400 },
  ));
  return sessionId;
}

function redactHeaders(headers: Headers): Record<string, string> {
  const forwarded: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    if (key.startsWith("cf-")) continue;
    if (key === "authorization") continue;
    forwarded[key] = value;
  }
  return forwarded;
}
