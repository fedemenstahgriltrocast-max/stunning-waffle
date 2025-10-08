interface Env {
  FIREWALL_RULES: string;
}

type FirewallRule = {
  id: string;
  description: string;
  pattern: RegExp;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/verify") {
      const body = await request.clone().text();
      const rules = parseRules(env.FIREWALL_RULES);
      const violations = rules.filter((rule) => rule.pattern.test(body));

      if (violations.length > 0) {
        return json({
          status: "blocked",
          reason: violations.map((v) => v.description),
        }, 451);
      }

      return json({ status: "allowed" }, 200);
    }

    return json({
      message: "Layer2 firewall worker placeholder",
      details: "Configure Zero Trust policies and add rules via FIREWALL_RULES env var.",
    });
  },
};

function parseRules(serialized: string): FirewallRule[] {
  if (!serialized) {
    return [];
  }

  try {
    const raw = JSON.parse(serialized) as Array<{ id: string; description: string; pattern: string }>;
    return raw.map((entry) => ({
      id: entry.id,
      description: entry.description,
      pattern: new RegExp(entry.pattern, "i"),
    }));
  } catch (error) {
    throw new Error(`Unable to parse FIREWALL_RULES: ${error}`);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}
