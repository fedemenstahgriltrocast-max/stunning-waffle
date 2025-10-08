interface Env {
  VECTORIZE_INDEX?: Fetcher;
}

type Document = { id: string; content: string };

const DEMO_DOCUMENTS: Document[] = [
  { id: "doc-1", content: "Cloudflare Workers enable secure edge compute" },
  { id: "doc-2", content: "TinyML pipelines score intents locally" },
  { id: "doc-3", content: "Thorium integrates CISA compliant scanning" },
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { query } = await request.json().catch(() => ({ query: "" }));
    const scored = rank(query || "", DEMO_DOCUMENTS);

    return new Response(JSON.stringify({
      status: "ok",
      query,
      results: scored,
      vectorize: env.VECTORIZE_INDEX ? "configured" : "not-configured",
    }, null, 2), {
      headers: { "content-type": "application/json" },
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
