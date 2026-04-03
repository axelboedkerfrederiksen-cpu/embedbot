(function () {
  const scriptTag = document.currentScript;
  const businessId = new URL(scriptTag.src).searchParams.get("id");
  const apiOrigin = new URL(scriptTag.src).origin;
  const API_URL = `${apiOrigin}/api/chat`;
  const CONFIG_URL = `${apiOrigin}/api/widget-config?id=${encodeURIComponent(businessId || "")}`;
  const OPEN_ICON = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 4.75h14a2.75 2.75 0 0 1 2.75 2.75v7A2.75 2.75 0 0 1 19 17.25h-6.23l-2.9 2.6a.75.75 0 0 1-1.24-.65l.33-1.95H5A2.75 2.75 0 0 1 2.25 14.5v-7A2.75 2.75 0 0 1 5 4.75Z" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="8.5" cy="11" r="1.05" fill="#fff"/>
      <circle cx="12" cy="11" r="1.05" fill="#fff"/>
      <circle cx="15.5" cy="11" r="1.05" fill="#fff"/>
    </svg>
  `;
  const CLOSE_ICON = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  const hasPrimaryColorAttr = scriptTag.getAttribute("data-primary-color") !== null;
  const hasSecondaryColorAttr = scriptTag.getAttribute("data-secondary-color") !== null;
  const hasFabColorAttr = scriptTag.getAttribute("data-fab-color") !== null;
  const hasFontAttr = scriptTag.getAttribute("data-font") !== null;
  const scriptName = (scriptTag.getAttribute("data-name") || "").trim();

  const defaultConfig = {
    primary_color: "#3b82f6",
    secondary_color: "#111827",
    fab_color: "#3b82f6",
    logo_url: "",
    font_choice: "sans-serif",
    name: "",
    header_title: "Support Chat",
    welcome_message: "",
  };

  const GENERIC_FONTS = new Set([
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-sans-serif",
    "ui-serif",
    "ui-monospace",
  ]);

  function getFontStack(fontChoice) {
    const cleanFont = (fontChoice || "").trim();
    if (!cleanFont) return defaultConfig.font_choice;

    const primaryFamily = cleanFont.split(",")[0].trim().replace(/^['\"]|['\"]$/g, "");
    const normalized = primaryFamily.toLowerCase();
    if (GENERIC_FONTS.has(normalized)) {
      return normalized;
    }

    const escapedFont = primaryFamily.replace(/"/g, '\\"');
    return `"${escapedFont}", sans-serif`;
  }

  function ensureFontLoaded(fontChoice) {
    const cleanFont = (fontChoice || "").trim();
    if (!cleanFont) return;

    const primaryFamily = cleanFont.split(",")[0].trim().replace(/^['\"]|['\"]$/g, "");
    const normalized = primaryFamily.toLowerCase();
    if (GENERIC_FONTS.has(normalized)) {
      return;
    }

    const fontId = `eb-font-${normalized.replace(/[^a-z0-9-]/g, "-")}`;
    if (document.getElementById(fontId)) {
      return;
    }

    const link = document.createElement("link");
    link.id = fontId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(primaryFamily).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }

  function setFontImportant(element, fontStack) {
    if (!element) return;
    element.style.setProperty("font-family", fontStack, "important");
  }

  function formatHeaderTitle(name) {
    const cleanName = (name || "").trim();
    return cleanName ? `${cleanName} ChatBot` : defaultConfig.header_title;
  }

  let widgetConfig = {
    ...defaultConfig,
    primary_color: scriptTag.getAttribute("data-primary-color") || defaultConfig.primary_color,
    secondary_color: scriptTag.getAttribute("data-secondary-color") || defaultConfig.secondary_color,
    fab_color: scriptTag.getAttribute("data-fab-color") || defaultConfig.fab_color,
    font_choice: scriptTag.getAttribute("data-font") || defaultConfig.font_choice,
    name: scriptName,
    header_title: formatHeaderTitle(scriptName),
  };

  let lastSender = null;
  let chatOpen = false;
  let hasShownWelcomeMessage = false;

  function tryShowWelcomeMessage() {
    if (hasShownWelcomeMessage) {
      console.log("[EmbedBot] Welcome already shown, skipping.");
      return;
    }

    const welcomeMessage = (widgetConfig.welcome_message || "").trim();
    if (!welcomeMessage) {
      console.log("[EmbedBot] No welcome_message available yet.");
      return;
    }

    addMessage(welcomeMessage, false);
    hasShownWelcomeMessage = true;
    console.log("[EmbedBot] Welcome message shown automatically.");
  }

  function nowAsTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function detectLanguage(text) {
    const normalized = text.toLowerCase();
    if (/[\u00E6\u00F8\u00E5]/.test(normalized) || /\b(hvordan|hvad|kan|hej|tak|klage)\b/.test(normalized)) {
      return "da";
    }
    if (/\b(how|what|can|help|complaint|hello|thanks)\b/.test(normalized)) {
      return "en";
    }
    return "da";
  }
  
  const container = document.createElement("div");
  container.innerHTML = `
    <button type="button" id="eb-bubble" aria-label="Open support chat" style="position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:#3b82f6;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:9999;box-shadow:0 8px 22px rgba(59,130,246,0.25);opacity:0;transition:opacity 0.15s;">${OPEN_ICON}</button>
    <div id="eb-box" style="display:none;position:fixed;bottom:90px;right:24px;width:340px;height:480px;background:#ffffff;border:none;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.15);z-index:9999;flex-direction:column;overflow:hidden;color:#1a1a1a;">
      <div id="eb-header" style="background:#3b82f6;color:white;padding:16px;font-weight:bold;display:flex;align-items:center;gap:10px;">
        <img id="eb-logo" alt="Company logo" style="display:none;height:24px;width:auto;max-width:120px;object-fit:contain;filter:brightness(0) invert(1);" />
        <div style="display:flex;flex-direction:column;line-height:1.1;">
          <span id="eb-title">Support Chat</span>
          <span style="font-size:12px;font-weight:500;opacity:0.85;">Online</span>
        </div>
      </div>
      <div id="eb-messages" style="flex:1;overflow-y:auto;padding:14px 14px 12px 14px;display:flex;flex-direction:column;gap:2px;height:340px"></div>
      <div style="padding:12px;border-top:1px solid rgba(255,255,255,0.05);display:flex;gap:8px;align-items:center;background:#f9f9f9;">
        <input id="eb-input" aria-label="Message input" type="text" placeholder="Skriv dit spørgsmål..." style="flex:1;padding:11px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:999px;outline:none;pointer-events:all;position:relative;z-index:99999;color:#1a1a1a;background:#f9f9f9;cursor:text;user-select:text;-webkit-user-select:text;font-size:14px;font-family:inherit;caret-color:#1a1a1a;"/>
        <button id="eb-send" aria-label="Send message" style="background:#3b82f6;color:white;border:none;padding:10px 16px;border-radius:999px;cursor:pointer;white-space:nowrap;">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  const bubble = document.getElementById("eb-bubble");
  const box = document.getElementById("eb-box");
  const header = document.getElementById("eb-header");
  const title = document.getElementById("eb-title");
  const logo = document.getElementById("eb-logo");
  const input = document.getElementById("eb-input");
  const send = document.getElementById("eb-send");
  const messages = document.getElementById("eb-messages");

  function ensureStreamingCursorStyles() {
    if (document.getElementById("eb-streaming-cursor-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "eb-streaming-cursor-style";
    style.textContent = `
      @keyframes eb-cursor-blink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
      .eb-streaming::after {
        content: "";
        display: inline-block;
        width: 2px;
        height: 1em;
        margin-left: 3px;
        vertical-align: -0.1em;
        background: currentColor;
        animation: eb-cursor-blink 0.9s steps(1, end) infinite;
      }
    `;
    document.head.appendChild(style);
  }

  ensureStreamingCursorStyles();

  function applyWidgetStyles() {
    const fontStack = getFontStack(widgetConfig.font_choice || defaultConfig.font_choice);
    ensureFontLoaded(widgetConfig.font_choice || defaultConfig.font_choice);

    bubble.style.background = widgetConfig.fab_color || defaultConfig.fab_color;
    send.style.background = widgetConfig.primary_color || defaultConfig.primary_color;
    header.style.background = widgetConfig.primary_color || defaultConfig.primary_color;
    title.textContent = widgetConfig.header_title || defaultConfig.header_title;

    setFontImportant(box, fontStack);
    setFontImportant(header, fontStack);
    setFontImportant(title, fontStack);
    setFontImportant(messages, fontStack);
    setFontImportant(input, fontStack);
    setFontImportant(send, fontStack);

    if (widgetConfig.logo_url) {
      logo.src = widgetConfig.logo_url;
      logo.style.display = "block";
    } else {
      logo.style.display = "none";
    }

    bubble.style.opacity = "1";
  }

  async function loadWidgetConfig() {
    if (!businessId) {
      applyWidgetStyles();
      return;
    }

    try {
      const res = await fetch(CONFIG_URL);
      if (!res.ok) {
        applyWidgetStyles();
        return;
      }

      const data = await res.json();
      console.log("[EmbedBot] /api/widget-config response:", data);
      console.log("[EmbedBot] welcome_message from API:", data.welcome_message);

      const resolvedName = (data.name || scriptName || defaultConfig.name || "").trim();
      widgetConfig = {
        primary_color: scriptTag.getAttribute("data-primary-color") || data.primary_color || defaultConfig.primary_color,
        secondary_color: scriptTag.getAttribute("data-secondary-color") || data.secondary_color || defaultConfig.secondary_color,
        fab_color: scriptTag.getAttribute("data-fab-color") || data.fab_color || defaultConfig.fab_color,
        logo_url: data.logo_url || defaultConfig.logo_url,
        font_choice: scriptTag.getAttribute("data-font") || data.font_choice || defaultConfig.font_choice,
        welcome_message: data.welcome_message || defaultConfig.welcome_message,
        name: resolvedName,
        header_title: formatHeaderTitle(resolvedName),
      };
    } catch (_) {
      widgetConfig = {
        ...widgetConfig,
        welcome_message: defaultConfig.welcome_message,
        header_title: formatHeaderTitle(scriptName),
      };
    }

    applyWidgetStyles();

    if (chatOpen) {
      // If chat was opened before config finished loading, try again now.
      tryShowWelcomeMessage();
    }
  }

  function setChatOpen(isOpen) {
    console.log("[EmbedBot] setChatOpen called:", { isOpen, hasShownWelcomeMessage });
    chatOpen = isOpen;
    box.style.display = chatOpen ? "flex" : "none";
    bubble.innerHTML = chatOpen ? CLOSE_ICON : OPEN_ICON;
    bubble.setAttribute("aria-label", chatOpen ? "Close support chat" : "Open support chat");
    if (chatOpen) {
      tryShowWelcomeMessage();
      input.focus();
    }
  }

  bubble.onclick = () => {
    setChatOpen(!chatOpen);
  };

  function addMessage(text, isUser, options = {}) {
    const showStatus = options.showStatus || false;
    const timestamp = options.timestamp || nowAsTime();
    const isGrouped = lastSender === (isUser ? "user" : "bot");

    const row = document.createElement("div");
    row.style.cssText = `display:flex;align-items:flex-end;gap:8px;justify-content:${isUser ? "flex-end" : "flex-start"};margin-top:${isGrouped ? "2px" : "10px"};`;

    const icon = document.createElement("span");
    icon.style.cssText = `display:flex;align-items:center;justify-content:center;flex:0 0 24px;${isGrouped ? "visibility:hidden;" : ""}`;
    icon.innerHTML = isUser
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#aaa"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#aaa"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/></svg>';

    const bubbleWrap = document.createElement("div");
    bubbleWrap.style.cssText = `display:flex;flex-direction:column;max-width:76%;align-items:${isUser ? "flex-end" : "flex-start"};`;

    const msg = document.createElement("div");
    const userBubbleColor = widgetConfig.secondary_color || defaultConfig.secondary_color;
    msg.style.cssText = `background:${isUser ? userBubbleColor : "#f0f0f0"};color:#1a1a1a;padding:10px 14px;border-radius:14px;display:inline-block;max-width:100%;font-size:14px;line-height:1.35;word-break:break-word;`;
    msg.textContent = text;

    const meta = document.createElement("div");
    meta.style.cssText = "display:flex;gap:6px;margin-top:4px;font-size:11px;color:#6b7280;align-items:center;";

    const time = document.createElement("span");
    time.textContent = timestamp;
    meta.appendChild(time);

    const fontStack = getFontStack(widgetConfig.font_choice || defaultConfig.font_choice);
    setFontImportant(row, fontStack);
    setFontImportant(icon, fontStack);
    setFontImportant(bubbleWrap, fontStack);
    setFontImportant(msg, fontStack);
    setFontImportant(meta, fontStack);
    setFontImportant(time, fontStack);

    let status = null;
    if (isUser && showStatus) {
      status = document.createElement("span");
      status.textContent = options.statusText || "Sender...";
      setFontImportant(status, fontStack);
      meta.appendChild(status);
    }

    bubbleWrap.appendChild(msg);
    bubbleWrap.appendChild(meta);

    if (isUser) {
      row.appendChild(bubbleWrap);
      row.appendChild(icon);
    } else {
      row.appendChild(icon);
      row.appendChild(bubbleWrap);
    }

    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    lastSender = isUser ? "user" : "bot";

    return { row, msg, time, status };
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    const language = detectLanguage(text);
    const labels = language === "en"
      ? { sending: "Sending...", sent: "Sent", failed: "Failed", errorReply: "Sorry, there was an error. Please try again." }
      : { sending: "Sender...", sent: "Sendt", failed: "Fejl", errorReply: "Beklager, der opstod en fejl. Proev igen." };

    input.value = "";
    const userMessage = addMessage(text, true, { showStatus: true, statusText: labels.sending });
    const botMessage = addMessage("", false);
    botMessage.msg.classList.add("eb-streaming");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, business_id: businessId, page_url: window.location.href }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const apiError = typeof data.error === "string" && data.error.trim()
          ? data.error.trim()
          : "Failed to send message";
        throw new Error(apiError);
      }

      if (!res.body) {
        throw new Error(labels.errorReply);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let sawDone = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        sseBuffer += decoder.decode(value, { stream: true });
        const events = sseBuffer.split("\n\n");
        sseBuffer = events.pop() || "";

        for (const event of events) {
          const lines = event.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data:")) {
              continue;
            }

            const payloadRaw = line.slice(5);
            const payload = payloadRaw.startsWith(" ") ? payloadRaw.slice(1) : payloadRaw;
            if (payload === "[DONE]") {
              sawDone = true;
              break;
            }

            let chunk = payload;
            try {
              const parsedPayload = JSON.parse(payload);
              if (parsedPayload && typeof parsedPayload.token === "string") {
                chunk = parsedPayload.token;
              }
            } catch {
              // Fallback for non-JSON payloads.
            }

            botMessage.msg.textContent += chunk;
            messages.scrollTop = messages.scrollHeight;
          }

          if (sawDone) {
            break;
          }
        }

        if (sawDone) {
          break;
        }
      }

      if (!botMessage.msg.textContent) {
        botMessage.msg.textContent = labels.errorReply;
      }

      botMessage.msg.classList.remove("eb-streaming");
      botMessage.time.textContent = nowAsTime();
      if (userMessage.status) {
        userMessage.status.textContent = labels.sent;
      }
    } catch (error) {
      const errorMessage = error instanceof Error && error.message
        ? error.message
        : labels.errorReply;
      botMessage.msg.textContent = errorMessage;
      botMessage.msg.classList.remove("eb-streaming");
      botMessage.time.textContent = nowAsTime();
      if (userMessage.status) {
        userMessage.status.textContent = labels.failed;
      }
    }
  }

  send.onclick = sendMessage;
  input.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } };

  loadWidgetConfig();
})();