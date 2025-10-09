import { jsonResponse, verifySignedRequest } from "../../shared/protocol";

interface Env {
  HMAC_SECRET: string;
  VECTORIZE_INDEX?: Fetcher;
}

type Document = { id: string; content: string };

type MlPayload = {
  query: string;
  documents?: Document[];
};

const DEMO_DOCUMENTS: Document[] = [
  { id: "doc-1", content: "Cloudflare Workers enable secure edge compute" },
  { id: "doc-2", content: "TinyML pipelines score intents locally" },
  { id: "doc-3", content: "Thorium integrates CISA compliant scanning" },
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return jsonResponse({ error: "POST required" }, { status: 405 });
    }

    const verification = await verifySignedRequest<MlPayload>(request, env.HMAC_SECRET);
    if (!verification.valid || !verification.data) {
      return jsonResponse({ status: "rejected", reason: verification.reason ?? "verification_failed" }, { status: 400 });
    }

    const { query, documents } = verification.data;
    const corpus = documents && documents.length ? documents : DEMO_DOCUMENTS;
    const scored = rank(query || "", corpus);

    return jsonResponse({
      status: "ok",
      query,
      results: scored,
      vectorize: env.VECTORIZE_INDEX ? "configured" : "not-configured",
    });
  },
};

function rank(query: string, documents: Document[]): Array<Document & { score: number }> {
  const terms = tokenize(query);
  return documents
    .map((doc) => ({
      ...doc,
      score: terms.reduce((acc, term) => acc + bm25(term, doc.content), 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function bm25(term: string, content: string): number {
  const occurrences = content.toLowerCase().split(term).length - 1;
  const k1 = 1.2;
  const b = 0.75;
  const docLength = content.length;
  const avgDocLength = 100;
  return ((occurrences * (k1 + 1)) / (occurrences + k1 * (1 - b + b * (docLength / avgDocLength))));
}
