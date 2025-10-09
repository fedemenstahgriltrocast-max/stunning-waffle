import { createSignedRequestInit, jsonResponse, verifySignedRequest } from "../../shared/protocol";

interface Env {
  HMAC_SECRET: string;
  TINY_ML_SERVICE?: Fetcher;
  TINY_LLM_SERVICE?: Fetcher;
  BACKBONE_SERVICE?: Fetcher;
  THORIUM_SERVICE?: Fetcher;
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OrchestratorRequest = {
  sessionId: string;
  payload: { messages?: ChatMessage[]; query?: string; attachments?: Array<{ name: string; url: string }> };
  origin: string | null;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return jsonResponse({ error: "POST only" }, { status: 405 });
    }

    const verification = await verifySignedRequest<OrchestratorRequest>(request, env.HMAC_SECRET);
    if (!verification.valid || !verification.data) {
      return jsonResponse({ error: verification.reason ?? "verification_failed" }, { status: 400 });
    }

    const { payload, sessionId, origin } = verification.data;
    const conversation = payload.messages ?? [];

    const mlPromise = env.TINY_ML_SERVICE
      ? env.TINY_ML_SERVICE.fetch(
          "https://layer4.internal/bm25",
          await createSignedRequestInit({ query: payload.query ?? "", documents: undefined }, env.HMAC_SECRET),
        )
      : undefined;

    const llmPromise = env.TINY_LLM_SERVICE
      ? env.TINY_LLM_SERVICE.fetch(
          "https://layer5.internal/generate",
          await createSignedRequestInit({
            model: "tinyllama-1.1b-chat",
            messages: conversation,
            temperature: 0.3,
          }, env.HMAC_SECRET),
        )
      : undefined;

    const [mlResult, llmResult] = await Promise.all([resolveJson(mlPromise), resolveJson(llmPromise)]);

    if (payload.attachments && payload.attachments.length && env.THORIUM_SERVICE) {
      await env.THORIUM_SERVICE.fetch(
        "https://layer3.internal/scan",
        await createSignedRequestInit({ sessionId, payload: { attachments: payload.attachments }, origin }, env.HMAC_SECRET),
      );
    }

    const final = {
      sessionId,
      origin,
      summary: "Layer6 orchestrator combined responses",
      mlInsights: mlResult,
      llmResponse: llmResult,
    };

    if (env.BACKBONE_SERVICE) {
      await env.BACKBONE_SERVICE.fetch(
        "https://layer7.internal/audit",
        await createSignedRequestInit({ sessionId, final, origin }, env.HMAC_SECRET),
      );
    }

    return jsonResponse(final);
  },
};

async function resolveJson(responsePromise: Promise<Response> | undefined) {
  if (!responsePromise) {
    return null;
  }
  const response = await responsePromise;
  if (!response.ok) {
    return { error: `Service error: ${response.status}` };
  }
  try {
    return await response.json();
  } catch (error) {
    return { raw: await response.text(), parseError: String(error) };
  }
}
