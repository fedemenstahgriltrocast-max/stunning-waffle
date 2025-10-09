import { jsonResponse, verifySignedRequest } from "../../shared/protocol";

interface Env {
  HMAC_SECRET: string;
}

interface ThoriumJob {
  sessionId: string;
  payload: Record<string, unknown>;
  origin: string | null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return jsonResponse({ error: "POST required" }, { status: 405 });
    }

    const verification = await verifySignedRequest<ThoriumJob>(request, env.HMAC_SECRET);
    if (!verification.valid || !verification.data) {
      return jsonResponse({ accepted: false, reason: verification.reason ?? "verification_failed" }, { status: 400 });
    }

    const { payload, sessionId } = verification.data;
    const taskId = crypto.randomUUID();

    // Placeholder for queuing a deep-analysis scan job
    const accepted = {
      taskId,
      sessionId,
      disposition: "queued",
      instructions: "Connect to the deep-analysis cluster via private tunnel and enqueue scan.",
      received: payload,
    };

    return jsonResponse(accepted, { status: 202 });
  },
};
