const encoder = new TextEncoder();

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const bytes = new Uint8Array(signature);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface SignedRequestMetadata {
  issuedAt: string;
  signature: string;
}

export interface VerificationResult<T> {
  valid: boolean;
  data: T | null;
  reason?: string;
}

export async function createSignedRequestInit(payload: unknown, secret: string): Promise<RequestInit & SignedRequestMetadata> {
  const issuedAt = new Date().toISOString();
  const bodyText = JSON.stringify({ payload, issuedAt });
  const signature = await hmac(secret, bodyText);

  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ultimate-issued-at": issuedAt,
      "x-ultimate-signature": signature,
    },
    body: bodyText,
    issuedAt,
    signature,
  };
}

export async function verifySignedRequest<T = unknown>(request: Request, secret: string): Promise<VerificationResult<T>> {
  const signature = request.headers.get("x-ultimate-signature");
  const issuedAt = request.headers.get("x-ultimate-issued-at");

  if (!signature || !issuedAt) {
    return { valid: false, data: null, reason: "Missing signature headers" };
  }

  const bodyText = await request.text();
  const expected = await hmac(secret, bodyText);

  if (expected !== signature) {
    return { valid: false, data: null, reason: "Signature mismatch" };
  }

  const maxSkewMs = 5 * 60 * 1000;
  const issuedTime = Date.parse(issuedAt);
  if (Number.isNaN(issuedTime) || Math.abs(Date.now() - issuedTime) > maxSkewMs) {
    return { valid: false, data: null, reason: "Issued-at outside allowable window" };
  }

  try {
    const parsed = JSON.parse(bodyText) as { payload: T };
    return { valid: true, data: parsed.payload };
  } catch (error) {
    return { valid: false, data: null, reason: `Invalid JSON payload: ${String(error)}` };
  }
}

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  const body = JSON.stringify(data, null, 2);
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  return new Response(body, { ...init, headers });
}

export function withCors(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers);
  if (origin) {
    headers.set("access-control-allow-origin", origin);
  }
  headers.set("access-control-allow-credentials", "true");
  headers.set("access-control-allow-headers", "content-type,authorization,x-ultimate-signature,x-ultimate-issued-at");
  headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
