import { createSignedRequestInit, jsonResponse, withCors } from "../../shared/protocol";

export interface Env {
  SESSION_KV: KVNamespace;
  FIREWALL_SERVICE?: Fetcher;
  ORCHESTRATOR_SERVICE?: Fetcher;
  HMAC_SECRET: string;
  UI_ALLOWED_ORIGINS?: string;
}

const DEFAULT_ALLOWED_ORIGINS = ["https://ui.example.com", "http://localhost:8787"];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const allowedOrigins = resolveAllowedOrigins(env);
    const origin = request.headers.get("origin");
    if (origin && !isOriginAllowed(origin, allowedOrigins)) {
      const denied = jsonResponse({ error: "Forbidden origin" }, { status: 403 });
      return withCors(denied, origin);
    }

    if (request.method === "OPTIONS") {
      return withCors(new Response(""), origin);
    }

    if (request.method !== "POST") {
      return withCors(jsonResponse({ error: "POST required" }, { status: 405 }), origin);
    }

    const session = await ensureSession(request, env, ctx);
    const sessionId = session.id;
    const payload = await request.json().catch(() => ({}));

    if (env.FIREWALL_SERVICE) {
      const firewallInit = await createSignedRequestInit(
        { sessionId, origin, payload, headers: redactHeaders(request.headers) },
        env.HMAC_SECRET,
      );
      const verification = await env.FIREWALL_SERVICE.fetch("https://layer2.internal/verify", firewallInit);
      if (!verification.ok) {
        const blocked = jsonResponse({ error: "Request blocked" }, { status: verification.status });
        if (session.setCookie) {
          blocked.headers.append("set-cookie", session.setCookie);
        }
        return withCors(blocked, origin);
      }
    }

    if (!env.ORCHESTRATOR_SERVICE) {
      const missing = jsonResponse({ sessionId, notice: "Orchestrator service not bound" });
      if (session.setCookie) {
        missing.headers.append("set-cookie", session.setCookie);
      }
      return withCors(missing, origin);
    }

    const orchestratorInit = await createSignedRequestInit(
      { sessionId, payload, origin },
      env.HMAC_SECRET,
    );
    const orchestratorResponse = await env.ORCHESTRATOR_SERVICE.fetch("https://layer6.internal/chat", orchestratorInit);

    if (!orchestratorResponse.ok) {
      const unavailable = jsonResponse(
        { error: "Orchestrator unavailable" },
        { status: orchestratorResponse.status },
      );
      if (session.setCookie) {
        unavailable.headers.append("set-cookie", session.setCookie);
      }
      return withCors(unavailable, origin);
    }

    let result: unknown;
    try {
      result = await orchestratorResponse.json();
    } catch (error) {
      result = { raw: await orchestratorResponse.text(), parseError: String(error) };
    }

    const response = jsonResponse({ sessionId, result });
    if (session.setCookie) {
      response.headers.append("set-cookie", session.setCookie);
    }
    return withCors(response, origin);
  },
};

async function ensureSession(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<{ id: string; setCookie?: string }> {
  const headerSession = request.headers.get("x-session-id");
  if (headerSession) {
    return { id: headerSession };
  }

  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/sessionId=([^;]+)/);
  if (match) {
    return { id: match[1] };
  }

  const sessionId = crypto.randomUUID();
  ctx.waitUntil(
    env.SESSION_KV.put(
      `session:${sessionId}`,
      JSON.stringify({ createdAt: Date.now() }),
      { expirationTtl: 86400 },
    ),
  );
  const cookieValue = `sessionId=${sessionId}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=86400`;
  return { id: sessionId, setCookie: cookieValue };
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

function resolveAllowedOrigins(env: Env): string[] {
  if (env.UI_ALLOWED_ORIGINS) {
    return env.UI_ALLOWED_ORIGINS.split(",").map((entry) => entry.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

function isOriginAllowed(origin: string, allowed: string[]): boolean {
  return allowed.includes("*") || allowed.includes(origin);
}

