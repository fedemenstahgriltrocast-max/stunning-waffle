(() => {
  const DEFAULT_ENDPOINT = window.CHATTIA_DEFAULT_ENDPOINT || "/api/chattia";

  function normalizeEndpoint(element, options = {}) {
    const attrEndpoint = element.getAttribute("data-endpoint");
    return options.endpoint || attrEndpoint || DEFAULT_ENDPOINT;
  }

  function normalize(element, key, options, fallback) {
    const attr = element.getAttribute(`data-${key}`);
    return options[key] || attr || fallback;
  }

  function formatResult(result) {
    if (typeof result === "string") return result;
    if (!result) return "No response received.";
    if (Array.isArray(result)) return result.map(formatResult).join("\n");
    if (typeof result === "object") {
      if ("message" in result && typeof result.message === "string") {
        return result.message;
      }
      return JSON.stringify(result, null, 2);
    }
    return String(result);
  }

  function mount(element, options = {}) {
    if (!element) return null;

    const config = {
      endpoint: normalizeEndpoint(element, options),
      title: normalize(element, "title", options, "Assistant"),
      accent: normalize(element, "accent", options, "#2563eb"),
      placeholder: normalize(element, "placeholder", options, "Ask me anything…"),
      welcome: normalize(element, "welcome", options, "How can I support you today?"),
    };

    const state = {
      sessionId: options.sessionId || null,
      busy: false,
    };

    element.innerHTML = "";
    element.classList.add("chattia-shell");

    const style = document.createElement("style");
    style.textContent = `
      .chattia-shell { font-family: "Inter", "Segoe UI", system-ui, sans-serif; border-radius: 20px; overflow: hidden; box-shadow: 0 18px 44px rgba(15,23,42,0.16); background: linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(243,246,255,0.97) 100%); color: #0f172a; display: flex; flex-direction: column; max-width: 420px; min-width: 320px; }
      .chattia-shell__header { padding: 18px 22px; background: rgba(37,99,235,0.12); display: flex; gap: 10px; align-items: center; text-transform: uppercase; font-size: 12px; letter-spacing: 0.12em; font-weight: 600; }
      .chattia-shell__header::before { content: ""; width: 10px; height: 10px; border-radius: 999px; background: ${config.accent}; box-shadow: 0 0 16px rgba(37,99,235,0.45); }
      .chattia-shell__messages { padding: 22px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
      .chattia-shell__bubble { border-radius: 16px; padding: 12px 16px; font-size: 14px; line-height: 1.55; box-shadow: 0 12px 36px rgba(15,23,42,0.12); }
      .chattia-shell__bubble--user { align-self: flex-end; background: ${config.accent}; color: #fff; }
      .chattia-shell__bubble--assistant { align-self: flex-start; background: #ffffff; border: 1px solid rgba(15,23,42,0.08); }
      .chattia-shell__form { padding: 18px; background: rgba(15,23,42,0.02); display: flex; gap: 10px; }
      .chattia-shell__input { flex: 1; border-radius: 999px; border: 1px solid rgba(15,23,42,0.12); padding: 12px 18px; font-size: 14px; transition: border 0.2s ease, box-shadow 0.2s ease; }
      .chattia-shell__input:focus { outline: none; border-color: ${config.accent}; box-shadow: 0 0 0 3px rgba(37,99,235,0.18); }
      .chattia-shell__button { border-radius: 999px; border: none; background: ${config.accent}; color: #fff; font-weight: 600; padding: 0 26px; cursor: pointer; transition: transform 0.18s ease, box-shadow 0.18s ease; }
      .chattia-shell__button:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: none; }
      .chattia-shell__button:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(37,99,235,0.35); }
      .chattia-shell__status { padding: 0 18px 14px; font-size: 12px; color: rgba(15,23,42,0.58); min-height: 18px; }
      .chattia-shell__messages::-webkit-scrollbar { width: 6px; }
      .chattia-shell__messages::-webkit-scrollbar-thumb { background: rgba(15,23,42,0.18); border-radius: 999px; }
    `;
    element.appendChild(style);

    const header = document.createElement("div");
    header.className = "chattia-shell__header";
    header.textContent = config.title;

    const messages = document.createElement("div");
    messages.className = "chattia-shell__messages";

    const status = document.createElement("div");
    status.className = "chattia-shell__status";

    const form = document.createElement("form");
    form.className = "chattia-shell__form";

    const input = document.createElement("input");
    input.className = "chattia-shell__input";
    input.placeholder = config.placeholder;
    input.autocomplete = "off";

    const button = document.createElement("button");
    button.className = "chattia-shell__button";
    button.type = "submit";
    button.textContent = "Send";

    form.append(input, button);
    element.append(header, messages, status, form);

    function appendBubble(role, text) {
      const bubble = document.createElement("div");
      bubble.className = `chattia-shell__bubble chattia-shell__bubble--${role}`;
      bubble.textContent = text;
      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;
    }

    async function dispatchPrompt(prompt) {
      if (!prompt || state.busy) {
        return;
      }
      state.busy = true;
      button.disabled = true;
      status.textContent = "Connecting…";
      appendBubble("user", prompt);
      input.value = "";

      try {
        const headers = { "content-type": "application/json" };
        if (state.sessionId) {
          headers["x-session-id"] = state.sessionId;
        }
        const response = await fetch(config.endpoint, {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({ message: prompt }),
        });
        const data = await response.json().catch(() => ({ result: "Unable to parse response." }));
        if (data && data.sessionId) {
          state.sessionId = data.sessionId;
        }
        const message = data && data.result ? formatResult(data.result) : "No response received.";
        appendBubble("assistant", message);
        status.textContent = response.ok ? "Ready" : "Assistant reported an issue.";
      } catch (error) {
        appendBubble("assistant", "An error occurred while contacting the assistant.");
        status.textContent = "Connection error";
        console.error("ChattiaEmbed error", error);
      } finally {
        state.busy = false;
        button.disabled = false;
      }
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      dispatchPrompt(input.value.trim());
    });

    if (config.welcome) {
      appendBubble("assistant", config.welcome);
    }

    status.textContent = "Ready";

    return {
      element,
      send(prompt) {
        dispatchPrompt(prompt);
      },
      update(updates = {}) {
        if (updates.title) {
          header.textContent = updates.title;
        }
        if (updates.placeholder) {
          input.placeholder = updates.placeholder;
        }
      },
    };
  }

  function scan() {
    document.querySelectorAll("[data-chattia-embed]").forEach((host) => {
      if (host.dataset.chattiaMounted === "true") return;
      mount(host);
      host.dataset.chattiaMounted = "true";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }

  window.ChattiaEmbed = { mount, scan };
})();
