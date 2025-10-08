export interface Env {
  SESSION_KV: KVNamespace;
  FIREWALL_SERVICE?: Fetcher;
}

const ALLOWED_ORIGINS = ["https://ui.example.com", "http://localhost:8787"];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get("origin");
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return new Response("Forbidden", { status: 403 });
    }

    if (request.method === "OPTIONS") {
      return cors(new Response(""), origin);
    }

    if (request.method === "POST" && env.FIREWALL_SERVICE) {
      const verification = await env.FIREWALL_SERVICE.fetch("/verify", request);
      if (!verification.ok) {
        return cors(new Response("Request blocked", { status: verification.status }), origin);
      }
    }

    const sessionId = await ensureSession(request, env, ctx);
    const payload = await request.json().catch(() => ({}));
    const responseBody = {
      sessionId,
      message: "Layer1 UI worker stub: forward payload to orchestrator layer.",
      received: payload,
    };

    return cors(new Response(JSON.stringify(responseBody), {
      headers: { "content-type": "application/json" },
    }), origin);
  },
};

async function ensureSession(request: Request, env: Env, ctx: ExecutionContext): Promise<string> {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/sessionId=([^;]+)/);
  if (match) {
    return match[1];
  }

  const sessionId = crypto.randomUUID();
  ctx.waitUntil(env.SESSION_KV.put(`session:${sessionId}`, JSON.stringify({ createdAt: Date.now() }), { expirationTtl: 86400 }));
  return sessionId;
}

function cors(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers);
  if (origin) {
    headers.set("access-control-allow-origin", origin);
  }
  headers.set("access-control-allow-credentials", "true");
  headers.set("access-control-allow-headers", "content-type,authorization");
  headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
