interface Env {
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/audit" && request.method === "POST") {
      const record = await request.text();
      if (env.AUDIT_BUCKET) {
        const key = `audits/${Date.now()}-${crypto.randomUUID()}.json`;
        await env.AUDIT_BUCKET.put(key, record, { httpMetadata: { contentType: "application/json" } });
      }

      return new Response(JSON.stringify({ status: "stored" }), {
        headers: { "content-type": "application/json" },
      });
    }

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      message: "Layer7 backbone worker placeholder",
      guidance: "Bind MCP endpoints via service bindings or outbound fetch calls.",
    }, null, 2), {
      headers: { "content-type": "application/json" },
    });
  },
};
