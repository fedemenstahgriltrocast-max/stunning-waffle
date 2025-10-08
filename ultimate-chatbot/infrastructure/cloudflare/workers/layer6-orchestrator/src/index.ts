interface Env {
  UI_SERVICE?: Fetcher;
  FIREWALL_SERVICE?: Fetcher;
  TINY_ML_SERVICE?: Fetcher;
  TINY_LLM_SERVICE?: Fetcher;
  BACKBONE_SERVICE?: Fetcher;
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405 });
    }

    const { messages = [], query } = await request.json();
    const conversation = messages as ChatMessage[];

    const [mlInsights, llmResponse] = await Promise.all([
      callOptionalService(env.TINY_ML_SERVICE, { query }),
      callOptionalService(env.TINY_LLM_SERVICE, { messages: conversation }),
    ]);

    const final = {
      summary: "Layer6 orchestrator combined responses",
      mlInsights: mlInsights ?? null,
      llmResponse: llmResponse ?? null,
    };

    if (env.BACKBONE_SERVICE) {
      await env.BACKBONE_SERVICE.fetch("/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          conversation,
          final,
        }),
      });
    }

    return new Response(JSON.stringify(final, null, 2), {
      headers: { "content-type": "application/json" },
    });
  },
};

async function callOptionalService(service: Fetcher | undefined, body: Record<string, unknown>) {
  if (!service) {
    return undefined;
  }

  const response = await service.fetch("/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return { error: `Service error: ${response.status}` };
  }

  return response.json().catch(() => response.text());
}
