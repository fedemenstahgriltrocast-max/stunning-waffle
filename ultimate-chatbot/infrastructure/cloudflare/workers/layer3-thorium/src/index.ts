interface Env {
  THORIUM_QUEUE?: Queue;
}

type Queue = {
  send: (body: string | ArrayBuffer) => Promise<void>;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return response(405, { message: "POST only", allowed: ["POST"] });
    }

    const payload = await request.json().catch(() => ({}));
    const job = {
      id: crypto.randomUUID(),
      receivedAt: new Date().toISOString(),
      payload,
    };

    if (env.THORIUM_QUEUE) {
      await env.THORIUM_QUEUE.send(JSON.stringify(job));
    }

    return response(202, {
      status: "accepted",
      next: "Thorium scanner will process this job asynchronously",
      job,
    });
  },
};

function response(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
