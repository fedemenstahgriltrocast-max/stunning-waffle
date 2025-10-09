import { jsonResponse, verifySignedRequest } from "../../shared/protocol";

interface Env {
  HMAC_SECRET: string;
  AUDIT_BUCKET?: R2Bucket;
}

type R2Bucket = {
  put: (key: string, value: BodyInit, options?: R2PutOptions) => Promise<void>;
};

type R2PutOptions = {
  httpMetadata?: {
    contentType?: string;
  };
};

type AuditPayload = {
  sessionId: string;
  final: unknown;
  origin: string | null;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/audit" && request.method === "POST") {
      const verification = await verifySignedRequest<AuditPayload>(request, env.HMAC_SECRET);
      if (!verification.valid || !verification.data) {
        return jsonResponse({ status: "rejected", reason: verification.reason ?? "verification_failed" }, { status: 400 });
      }

      const record = JSON.stringify({ ...verification.data, storedAt: new Date().toISOString() }, null, 2);
      if (env.AUDIT_BUCKET) {
        const key = `audits/${new Date().toISOString()}-${crypto.randomUUID()}.json`;
        await env.AUDIT_BUCKET.put(key, record, { httpMetadata: { contentType: "application/json" } });
      }

      return jsonResponse({ status: "stored" });
    }

    if (url.pathname === "/health") {
      return jsonResponse({ status: "ok", timestamp: new Date().toISOString() });
    }

    return jsonResponse({
      message: "Layer7 backbone worker placeholder",
      guidance: "Bind MCP endpoints via service bindings or outbound fetch calls.",
    });
  },
};
