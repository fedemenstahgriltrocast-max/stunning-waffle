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
    const url = new URL(request.url);
    if (request.method === "GET") {
      if (url.pathname === "/embed.js") {
        return serveEmbedScript(url);
      }
      return new Response("Not Found", { status: 404 });
    }

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

function serveEmbedScript(url: URL): Response {
  const baseEndpoint = new URL("/", url).toString();
  const script = buildEmbedScript(baseEndpoint);
  return new Response(script, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

function buildEmbedScript(endpoint: string): string {
  const safeEndpoint = JSON.stringify(endpoint);
  return String.raw`(() => {
    const API_ENDPOINT = ${safeEndpoint};

    function formatResult(result) {
      if (typeof result === 'string') return result;
      if (!result) return 'No response received.';
      if (Array.isArray(result)) return result.map(formatResult).join('\n');
      if (typeof result === 'object') {
        if ('message' in result && typeof result.message === 'string') return result.message;
        return JSON.stringify(result, null, 2);
      }
      return String(result);
    }

    function mountElement(element, options = {}) {
      const config = {
        endpoint: options.endpoint || element.dataset.endpoint || API_ENDPOINT,
        title: options.title || element.dataset.title || 'Ultimate Chatbot',
        accent: options.accent || element.dataset.accent || '#7f5af0',
        placeholder: options.placeholder || element.dataset.placeholder || 'Ask anything...',
      };
      const state = { sessionId: options.sessionId || null, busy: false };
      element.innerHTML = '';
      element.classList.add('ultimate-chatbot');
      const style = document.createElement('style');
      style.textContent = `
        .ultimate-chatbot { font-family: 'Inter', system-ui, sans-serif; border: 1px solid rgba(127,90,240,0.2); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; max-width: 420px; box-shadow: 0 16px 40px rgba(15,23,42,0.16); background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(244,244,249,0.92) 100%); }
        .ultimate-chatbot__header { padding: 16px 20px; background: rgba(127,90,240,0.12); color: #0f172a; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; font-size: 12px; display: flex; align-items: center; gap: 8px; }
        .ultimate-chatbot__header::before { content: ''; width: 10px; height: 10px; border-radius: 999px; background: \${config.accent}; box-shadow: 0 0 12px rgba(127,90,240,0.65); }
        .ultimate-chatbot__messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .ultimate-chatbot__bubble { border-radius: 14px; padding: 12px 16px; max-width: 90%; line-height: 1.5; font-size: 14px; box-shadow: 0 10px 32px rgba(15,23,42,0.08); }
        .ultimate-chatbot__bubble--user { align-self: flex-end; background: \${config.accent}; color: #fff; }
        .ultimate-chatbot__bubble--bot { align-self: flex-start; background: #fff; color: #0f172a; border: 1px solid rgba(15,23,42,0.06); }
        .ultimate-chatbot__form { display: flex; gap: 8px; padding: 16px; background: rgba(15,23,42,0.02); }
        .ultimate-chatbot__input { flex: 1; border-radius: 999px; border: 1px solid rgba(15,23,42,0.12); padding: 12px 18px; font-size: 14px; transition: border-color 0.2s ease; }
        .ultimate-chatbot__input:focus { outline: none; border-color: \${config.accent}; box-shadow: 0 0 0 3px rgba(127,90,240,0.18); }
        .ultimate-chatbot__button { border-radius: 999px; background: \${config.accent}; color: #fff; border: none; padding: 0 22px; font-weight: 600; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .ultimate-chatbot__button:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: none; }
        .ultimate-chatbot__button:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 12px 24px rgba(127,90,240,0.25); }
        .ultimate-chatbot__status { font-size: 12px; color: rgba(15,23,42,0.55); padding: 0 16px 12px; min-height: 18px; }
        .ultimate-chatbot__messages::-webkit-scrollbar { width: 6px; }
        .ultimate-chatbot__messages::-webkit-scrollbar-thumb { background: rgba(15,23,42,0.15); border-radius: 999px; }
      `;
      element.appendChild(style);

      const header = document.createElement('div');
      header.className = 'ultimate-chatbot__header';
      header.textContent = config.title;
      const messages = document.createElement('div');
      messages.className = 'ultimate-chatbot__messages';
      const status = document.createElement('div');
      status.className = 'ultimate-chatbot__status';
      const form = document.createElement('form');
      form.className = 'ultimate-chatbot__form';
      const input = document.createElement('input');
      input.className = 'ultimate-chatbot__input';
      input.placeholder = config.placeholder;
      input.autocomplete = 'off';
      const button = document.createElement('button');
      button.className = 'ultimate-chatbot__button';
      button.type = 'submit';
      button.textContent = 'Send';
      form.append(input, button);
      element.append(header, messages, status, form);

      function appendBubble(role, text) {
        const bubble = document.createElement('div');
        bubble.className = \`ultimate-chatbot__bubble ultimate-chatbot__bubble--\${role}\`;
        bubble.textContent = text;
        messages.appendChild(bubble);
        messages.scrollTop = messages.scrollHeight;
      }

      async function dispatchPrompt(prompt) {
        if (!prompt || state.busy) return;
        state.busy = true;
        button.disabled = true;
        status.textContent = 'Contacting assistant…';
        appendBubble('user', prompt);
        input.value = '';
        try {
          const headers = { 'content-type': 'application/json' };
          if (state.sessionId) {
            headers['x-session-id'] = state.sessionId;
          }
          const response = await fetch(config.endpoint, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({ message: prompt }),
          });
          const data = await response.json();
          if (data && data.sessionId) {
            state.sessionId = data.sessionId;
          }
          const message = data && data.result ? formatResult(data.result) : 'No response received.';
          appendBubble('bot', message);
          status.textContent = response.ok ? 'Ready' : 'Assistant reported an issue.';
        } catch (error) {
          appendBubble('bot', 'An error occurred while contacting the assistant.');
          status.textContent = 'Connection error';
          console.error('UltimateChatEmbed error', error);
        } finally {
          state.busy = false;
          button.disabled = false;
        }
      }

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        dispatchPrompt(input.value.trim());
      });

      if (options.welcome) {
        appendBubble('bot', options.welcome);
      } else if (element.dataset.welcome) {
        appendBubble('bot', element.dataset.welcome);
      }

      status.textContent = 'Ready';
      return { element, send: dispatchPrompt };
    }

    function scanAndMount() {
      document.querySelectorAll('[data-ultimate-chatbot]').forEach((host) => {
        if (host.dataset.embedded === 'true') return;
        mountElement(host);
        host.dataset.embedded = 'true';
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scanAndMount);
    } else {
      scanAndMount();
    }

    window.UltimateChatEmbed = {
      mount: mountElement,
      scan: scanAndMount,
    };
  })();`
}

