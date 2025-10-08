interface Env {
  TINY_LLM_ENDPOINT: string;
  TINY_LLM_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Only POST is supported", { status: 405 });
    }

    const payload = await request.json();
    const body = JSON.stringify({
      model: payload.model ?? "tinyllama-1.1b-chat", 
      messages: payload.messages ?? [],
      temperature: payload.temperature ?? 0.7,
    });

    const upstream = await fetch(env.TINY_LLM_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.TINY_LLM_API_KEY}`,
      },
      body,
    });

    const resultText = await upstream.text();
    return new Response(resultText, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  },
};
