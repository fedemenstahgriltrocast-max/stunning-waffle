(() => {
  const DEFAULT_ENDPOINT = window.CHATTIA_DEFAULT_ENDPOINT || "/api/chattia";

  const SUPPORTS_LOCAL_STORAGE = (() => {
    try {
      const probeKey = "__chattia_probe__";
      window.localStorage.setItem(probeKey, "1");
      window.localStorage.removeItem(probeKey);
      return true;
    } catch (error) {
      console.warn("ChattiaEmbed: localStorage unavailable", error);
      return false;
    }
  })();

  function normalizeEndpoint(element, options = {}) {
    const attrEndpoint = element.getAttribute("data-endpoint");
    return options.endpoint || attrEndpoint || DEFAULT_ENDPOINT;
  }

  function normalize(element, key, options, fallback) {
    const attr = element.getAttribute(`data-${key}`);
    return options[key] || attr || fallback;
  }

  function colorWithAlpha(color, alpha, fallback) {
    if (typeof color !== "string") return fallback;
    const value = color.trim();
    const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) {
        hex = hex
          .split("")
          .map((char) => char + char)
          .join("");
      }
      const int = parseInt(hex, 16);
      const r = (int >> 16) & 255;
      const g = (int >> 8) & 255;
      const b = int & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    const rgbMatch = value.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    const rgbaMatch = value.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/i);
    if (rgbaMatch) {
      const [, r, g, b] = rgbaMatch;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return fallback;
  }

  function persistState(storageKey, payload) {
    if (!storageKey || !SUPPORTS_LOCAL_STORAGE) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      console.warn("ChattiaEmbed: unable to persist state", error);
    }
  }

  function readPersistedState(storageKey) {
    if (!storageKey || !SUPPORTS_LOCAL_STORAGE) return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("ChattiaEmbed: unable to read persisted state", error);
      return null;
    }
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

  function createCosmeticLayer(shell, accent) {
    const style = document.createElement("style");
    style.textContent = `
      .chattia-shell { --chattia-accent: #2563eb; --chattia-header-bg: rgba(37,99,235,0.12); --chattia-focus-ring: rgba(37,99,235,0.18); --chattia-glow: rgba(37,99,235,0.45); --chattia-button-hover: rgba(37,99,235,0.35); font-family: "Inter", "Segoe UI", system-ui, sans-serif; border-radius: 20px; overflow: hidden; box-shadow: 0 18px 44px rgba(15,23,42,0.16); background: linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(243,246,255,0.97) 100%); color: #0f172a; display: flex; flex-direction: column; max-width: 420px; min-width: 320px; }
      .chattia-shell[data-busy="true"] { pointer-events: none; }
      .chattia-shell__header { padding: 18px 22px; background: var(--chattia-header-bg); display: flex; gap: 10px; align-items: center; text-transform: uppercase; font-size: 12px; letter-spacing: 0.12em; font-weight: 600; }
      .chattia-shell__header::before { content: ""; width: 10px; height: 10px; border-radius: 999px; background: var(--chattia-accent); box-shadow: 0 0 16px var(--chattia-glow); }
      .chattia-shell__title { margin: 0; font-size: 12px; letter-spacing: 0.12em; font-weight: 600; }
      .chattia-shell__messages { padding: 22px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
      .chattia-shell__bubble { border-radius: 16px; padding: 12px 16px; font-size: 14px; line-height: 1.55; box-shadow: 0 12px 36px rgba(15,23,42,0.12); }
      .chattia-shell__bubble--user { align-self: flex-end; background: var(--chattia-accent); color: #fff; }
      .chattia-shell__bubble--assistant { align-self: flex-start; background: #ffffff; border: 1px solid rgba(15,23,42,0.08); }
      .chattia-shell__bubble--typing { display: inline-flex; gap: 4px; }
      .chattia-shell__bubble--typing span { width: 6px; height: 6px; border-radius: 999px; background: rgba(15,23,42,0.28); animation: chattia-pulse 1.2s infinite ease-in-out; }
      .chattia-shell__bubble--typing span:nth-child(2) { animation-delay: 0.15s; }
      .chattia-shell__bubble--typing span:nth-child(3) { animation-delay: 0.3s; }
      .chattia-shell__form { padding: 18px; background: rgba(15,23,42,0.02); display: flex; gap: 10px; align-items: flex-end; }
      .chattia-shell__input { flex: 1; border-radius: 16px; border: 1px solid rgba(15,23,42,0.12); padding: 12px 18px; font-size: 14px; line-height: 1.5; transition: border 0.2s ease, box-shadow 0.2s ease; resize: none; min-height: 48px; max-height: 200px; }
      .chattia-shell__input:focus { outline: none; border-color: var(--chattia-accent); box-shadow: 0 0 0 3px var(--chattia-focus-ring); }
      .chattia-shell__input::placeholder { color: rgba(15,23,42,0.45); }
      .chattia-shell__button { border-radius: 999px; border: none; background: var(--chattia-accent); color: #fff; font-weight: 600; padding: 12px 26px; cursor: pointer; transition: transform 0.18s ease, box-shadow 0.18s ease; }
      .chattia-shell__button:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: none; }
      .chattia-shell__button:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 14px 28px var(--chattia-button-hover); }
      .chattia-shell__status { padding: 0 18px 14px; font-size: 12px; color: rgba(15,23,42,0.58); min-height: 18px; }
      .chattia-shell__messages::-webkit-scrollbar { width: 6px; }
      .chattia-shell__messages::-webkit-scrollbar-thumb { background: rgba(15,23,42,0.18); border-radius: 999px; }
      @keyframes chattia-pulse { 0%, 80%, 100% { opacity: 0.2; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
      @media (prefers-reduced-motion: reduce) {
        .chattia-shell__button:not(:disabled):hover { transform: none; box-shadow: none; }
        .chattia-shell__bubble--typing span { animation: none; opacity: 0.4; }
      }
    `;
    shell.appendChild(style);

    function applyAccent(nextAccent, tokens) {
      shell.style.setProperty("--chattia-accent", nextAccent);
      shell.style.setProperty("--chattia-header-bg", tokens.header);
      shell.style.setProperty("--chattia-focus-ring", tokens.focus);
      shell.style.setProperty("--chattia-glow", tokens.glow);
      shell.style.setProperty("--chattia-button-hover", tokens.hover);
    }

    let currentTokens = {
      header: colorWithAlpha(accent, 0.12, "rgba(37,99,235,0.12)"),
      focus: colorWithAlpha(accent, 0.18, "rgba(37,99,235,0.18)"),
      glow: colorWithAlpha(accent, 0.45, "rgba(37,99,235,0.45)"),
      hover: colorWithAlpha(accent, 0.35, "rgba(37,99,235,0.35)"),
    };
    applyAccent(accent, currentTokens);
    return {
      updateAccent(nextAccent) {
        const nextTokens = {
          header: colorWithAlpha(nextAccent, 0.12, currentTokens.header),
          focus: colorWithAlpha(nextAccent, 0.18, currentTokens.focus),
          glow: colorWithAlpha(nextAccent, 0.45, currentTokens.glow),
          hover: colorWithAlpha(nextAccent, 0.35, currentTokens.hover),
        };
        applyAccent(nextAccent, nextTokens);
        currentTokens = nextTokens;
      },
    };
  }

  function createHeader(titleText) {
    const header = document.createElement("header");
    header.className = "chattia-shell__header";
    const title = document.createElement("h2");
    title.className = "chattia-shell__title";
    title.textContent = titleText;
    title.setAttribute("role", "heading");
    title.setAttribute("aria-level", "2");
    header.appendChild(title);

    return {
      element: header,
      setTitle(nextTitle) {
        title.textContent = nextTitle;
      },
    };
  }

  function createMessageLog(titleText) {
    const element = document.createElement("div");
    element.className = "chattia-shell__messages";
    element.setAttribute("role", "log");
    element.setAttribute("aria-live", "polite");
    element.setAttribute("aria-label", `${titleText} conversation transcript`);

    return {
      element,
      scrollToBottom() {
        element.scrollTop = element.scrollHeight;
      },
      updateLabel(nextTitle) {
        element.setAttribute("aria-label", `${nextTitle} conversation transcript`);
      },
    };
  }

  function createStatus() {
    const element = document.createElement("div");
    element.className = "chattia-shell__status";
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");

    return {
      element,
      set(text) {
        element.textContent = text;
      },
      get() {
        return element.textContent;
      },
    };
  }

  function createComposer(config) {
    const form = document.createElement("form");
    form.className = "chattia-shell__form";
    form.setAttribute("aria-label", `${config.title} message composer`);
    form.setAttribute("aria-busy", "false");

    const input = document.createElement("textarea");
    input.className = "chattia-shell__input";
    input.placeholder = config.placeholder;
    input.setAttribute("aria-label", config.placeholder);
    input.setAttribute("autocomplete", "off");
    input.setAttribute("rows", "1");
    input.setAttribute("data-gramm", "false");
    input.setAttribute("data-lt-active", "false");

    const button = document.createElement("button");
    button.className = "chattia-shell__button";
    button.type = "submit";
    button.textContent = config.sendLabel;
    button.setAttribute("aria-label", config.sendLabel);
    form.append(input, button);
    
    return {
      element: form,
      input,
      button,
      setPlaceholder(placeholder) {
        input.placeholder = placeholder;
        input.setAttribute("aria-label", placeholder);
      },
      setComposerTitle(title) {
        form.setAttribute("aria-label", `${title} message composer`);
      },
      setSendLabel(label) {
        button.textContent = label;
        button.setAttribute("aria-label", label);
      },
    };
  }

  function createConciergeShell(config) {
    const shell = document.createElement("section");
    shell.className = "chattia-shell";
    shell.dataset.busy = "false";

    const cosmetics = createCosmeticLayer(shell, config.accent);
    const header = createHeader(config.title);
    const log = createMessageLog(config.title);
    const status = createStatus();
    const composer = createComposer(config);

    shell.append(header.element, log.element, status.element, composer.element);

    return { shell, cosmetics, header, log, status, composer };
  }

  function mount(element, options = {}) {
    if (!element) return null;

    const config = {
      endpoint: normalizeEndpoint(element, options),
      title: normalize(element, "title", options, "Assistant"),
      accent: normalize(element, "accent", options, "#2563eb"),
      placeholder: normalize(element, "placeholder", options, "Ask me anything…"),
      welcome: normalize(element, "welcome", options, "How can I support you today?"),
      sendLabel: normalize(element, "send-label", options, "Send"),
      storageKey: normalize(element, "storage-key", options, null),
    };

    const persistedState = readPersistedState(config.storageKey) || {};

    const state = {
      sessionId: options.sessionId || persistedState.sessionId || null,
      busy: false,
      typingBubble: null,
      messages: Array.isArray(persistedState.messages) ? [...persistedState.messages] : [],
    };

    element.innerHTML = "";

    const { shell, cosmetics, header, log, status, composer } = createConciergeShell(config);
    element.appendChild(shell);

    function autoResizeTextarea() {
      const textarea = composer.input;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }

    function updateBusyState(nextBusy) {
      state.busy = nextBusy;
      composer.button.disabled = nextBusy;
      composer.element.setAttribute("aria-busy", String(nextBusy));
      shell.dataset.busy = String(nextBusy);
    }

    function saveState() {
      persistState(config.storageKey, {
        sessionId: state.sessionId,
        messages: state.messages,
      });
    }

    function createBubble(role, text) {
      const bubble = document.createElement("div");
      bubble.className = `chattia-shell__bubble chattia-shell__bubble--${role}`;
      bubble.textContent = text;
      return bubble;
    }

    function appendBubble(role, text, persist = true) {
      const bubble = createBubble(role, text);
      log.element.appendChild(bubble);
      log.scrollToBottom();
      if (persist) {
        state.messages.push({ role, text });
        saveState();
      }
      return bubble;
    }

    async function dispatchPrompt(prompt) {
      if (!prompt || state.busy) {
        return;
      }
      updateBusyState(true);
      status.set("Connecting…");
      appendBubble("user", prompt);
      composer.input.value = "";
      autoResizeTextarea();

      if (state.typingBubble) {
        state.typingBubble.remove();
      }
      state.typingBubble = createBubble("assistant", "");
      state.typingBubble.classList.add("chattia-shell__bubble--typing");
      [1, 2, 3].forEach(() => {
        const dot = document.createElement("span");
        state.typingBubble.appendChild(dot);
      });

      log.element.appendChild(state.typingBubble);
      log.scrollToBottom();

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
        status.set(response.ok ? "Ready" : "Assistant reported an issue.");
      } catch (error) {
        appendBubble("assistant", "An error occurred while contacting the assistant.");
        status.set("Connection error");
        console.error("ChattiaEmbed error", error);
      } finally {
        if (state.typingBubble) {
          state.typingBubble.remove();
          state.typingBubble = null;
        }
        saveState();
        updateBusyState(false);
      }
    }

    composer.element.addEventListener("submit", (event) => {
      event.preventDefault();
      dispatchPrompt(composer.input.value.trim());
    });

    composer.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        dispatchPrompt(composer.input.value.trim());
      }
    });

    composer.input.addEventListener("input", autoResizeTextarea);
    autoResizeTextarea();

    if (state.messages.length > 0) {
      state.messages.forEach(({ role, text }) => {
        appendBubble(role, text, false);
      });
      
      status.set("Ready");
    } else if (config.welcome) {
      appendBubble("assistant", config.welcome);
    }

    status.set(status.get() || "Ready");
    saveState();

    return {
      element,
      shell,
      send(prompt) {
        dispatchPrompt(prompt);
      },
      update(updates = {}) {
        if (updates.title) {
          header.setTitle(updates.title);
          log.updateLabel(updates.title);
          composer.setComposerTitle(updates.title);
        }
        if (updates.placeholder) {
          composer.setPlaceholder(updates.placeholder);
        }
        if (updates.accent) {
          const accent = updates.accent;
          cosmetics.updateAccent(accent);
        }
        if (updates.sendLabel) {
          composer.setSendLabel(updates.sendLabel);
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
