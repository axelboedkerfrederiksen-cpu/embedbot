(function () {
  const scriptTag = document.currentScript;
  const businessId = new URL(scriptTag.src).searchParams.get("id");
  const apiOrigin = new URL(scriptTag.src).origin;
  const API_URL = `${apiOrigin}/api/chat`;
  const CONFIG_URL = `${apiOrigin}/api/widget-config?id=${encodeURIComponent(businessId || "")}`;
  const CONFIG_CACHE_KEY = `embedbot-config-${businessId}`;
  const OPEN_ICON = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 4.75h14a2.75 2.75 0 0 1 2.75 2.75v7A2.75 2.75 0 0 1 19 17.25h-6.23l-2.9 2.6a.75.75 0 0 1-1.24-.65l.33-1.95H5A2.75 2.75 0 0 1 2.25 14.5v-7A2.75 2.75 0 0 1 5 4.75Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="8.5" cy="11" r="1.05" fill="currentColor"/>
      <circle cx="12" cy="11" r="1.05" fill="currentColor"/>
      <circle cx="15.5" cy="11" r="1.05" fill="currentColor"/>
    </svg>
  `;
  const CLOSE_ICON = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  const hasPrimaryColorAttr = scriptTag.getAttribute("data-primary-color") !== null;
  const hasSecondaryColorAttr = scriptTag.getAttribute("data-secondary-color") !== null;
  const hasFabColorAttr = scriptTag.getAttribute("data-fab-color") !== null;
  const hasFontAttr = scriptTag.getAttribute("data-font") !== null;
  const scriptName = (scriptTag.getAttribute("data-name") || "").trim();

  const defaultConfig = {
    primary_color: "#ffffff",
    secondary_color: "#f6f3ed",
    fab_color: "#ffffff",
    logo_url: "",
    font_choice: "Inter",
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
    conversationHistory.push({ role: "assistant", content: welcomeMessage });
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

  function normalizeHexColor(color) {
    const trimmedColor = (color || "").trim();
    const hexMatch = trimmedColor.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!hexMatch) {
      return null;
    }

    const hexValue = hexMatch[1];
    if (hexValue.length === 3) {
      return hexValue.split("").map((char) => char + char).join("");
    }

    return hexValue;
  }

  function getBubbleTextColor(backgroundColor) {
    const normalizedHex = normalizeHexColor(backgroundColor);
    if (!normalizedHex) {
      return "#1a1a1a";
    }

    const red = parseInt(normalizedHex.slice(0, 2), 16);
    const green = parseInt(normalizedHex.slice(2, 4), 16);
    const blue = parseInt(normalizedHex.slice(4, 6), 16);
    const brightness = ((red * 299) + (green * 587) + (blue * 114)) / 1000;

    return brightness < 150 ? "#ffffff" : "#1a1a1a";
  }
  
  const container = document.createElement("div");
  container.innerHTML = `
    <button type="button" id="eb-bubble" aria-label="Open support chat" style="position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:#ffffff;color:#1a1a1a;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:9999;box-shadow:0 6px 18px rgba(0,0,0,0.10);opacity:0;transition:opacity 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;">${OPEN_ICON}</button>
    <div id="eb-box" style="position:fixed;bottom:90px;right:24px;width:352px;height:510px;background:#ffffff;border:none;border-radius:18px;box-shadow:0 10px 28px rgba(15,23,42,0.10);z-index:9999;display:flex;flex-direction:column;overflow:hidden;color:#1a1a1a;opacity:0;visibility:hidden;transform:translateY(10px) scale(0.985);pointer-events:none;transition:opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease;">
      <div id="eb-header" style="background:#f9f9f9;color:#1a1a1a;padding:10px 14px;font-weight:600;display:flex;align-items:center;gap:10px;">
        <img id="eb-logo" alt="Company logo" style="display:none;height:24px;width:auto;max-width:120px;object-fit:contain;filter:brightness(0) invert(1);" />
        <div style="display:flex;flex-direction:column;line-height:1.2;">
          <span id="eb-title">Support Chat</span>
        </div>
      </div>
      <div id="eb-messages" style="flex:1;overflow-y:auto;padding:6px 16px 12px 16px;display:flex;flex-direction:column;gap:0;height:356px;background:#ffffff;"></div>
      <div id="eb-composer" style="padding:10px 10px 12px 6px;border-top:1px solid rgba(17,17,17,0.06);display:flex;gap:8px;align-items:center;background:#ffffff;">
        <div id="eb-input-wrap" style="display:flex;align-items:center;gap:8px;flex:1;border:1px solid rgba(17,17,17,0.10);border-radius:14px;padding:4px 4px 4px 8px;background:#ffffff;transition:border-color 0.18s ease, box-shadow 0.18s ease;">
          <input id="eb-input" aria-label="Message input" type="text" placeholder="Skriv dit spørgsmål..." style="flex:1;padding:9px 0;border:none;outline:none;pointer-events:all;position:relative;z-index:99999;color:#1a1a1a;background:#ffffff;cursor:text;user-select:text;-webkit-user-select:text;font-size:14px;font-family:inherit;line-height:1.45;caret-color:#1a1a1a;"/>
          <button id="eb-send" aria-label="Send message" style="background:#ffffff;color:#1a1a1a;border:none;padding:8px;border-radius:10px;cursor:pointer;white-space:nowrap;font-weight:600;line-height:1;display:flex;align-items:center;justify-content:center;transition:transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M13 7l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  const bubble = document.getElementById("eb-bubble");
  const box = document.getElementById("eb-box");
  const header = document.getElementById("eb-header");
  const title = document.getElementById("eb-title");
  const logo = document.getElementById("eb-logo");
  const composer = document.getElementById("eb-composer");
  const inputWrap = document.getElementById("eb-input-wrap");
  const input = document.getElementById("eb-input");
  const send = document.getElementById("eb-send");
  const messages = document.getElementById("eb-messages");

  const conversationHistory = [];

  function ensureWidgetStylesheet() {
    if (document.getElementById("eb-widget-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "eb-widget-style";
    style.textContent = `
      #eb-bubble:hover {
        transform: translateY(-1px);
      }
      #eb-box.eb-open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }
      #eb-send:hover {
        transform: translateY(-1px);
        background: rgba(15, 23, 42, 0.05);
      }
      #eb-send:active {
        transform: translateY(0);
      }
      #eb-input-wrap:focus-within {
        border-color: rgba(17, 17, 17, 0.28);
        box-shadow: 0 0 0 4px rgba(17, 17, 17, 0.06);
      }
      .eb-row {
        animation: eb-message-in 0.2s ease;
      }
      #eb-messages .eb-meta,
      #eb-messages .eb-time {
        list-style: none !important;
      }
      #eb-messages .eb-meta::before,
      #eb-messages .eb-meta::after,
      #eb-messages .eb-time::before,
      #eb-messages .eb-time::after,
      #eb-messages .eb-meta::marker,
      #eb-messages .eb-time::marker {
        content: none !important;
        display: none !important;
      }
      #eb-box, #eb-box * {
        box-sizing: border-box;
      }
      .eb-ai-msg p {
        font-size: inherit;
        line-height: inherit;
        font-weight: 400;
        letter-spacing: normal;
        color: inherit;
        margin: 0;
      }
      .eb-ai-msg p + p {
        margin-top: 9px;
      }
      @keyframes eb-message-in {
        0% { opacity: 0; transform: translateY(6px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes eb-cursor-blink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
      .eb-streaming::after {
        content: "";
        display: inline-block;
        width: 2px;
        height: 0.9em;
        margin-left: 3px;
        vertical-align: middle;
        transform: translateY(-0.02em);
        background: currentColor;
        animation: eb-cursor-blink 0.9s steps(1, end) infinite;
      }
    `;
    document.head.appendChild(style);
  }

  ensureWidgetStylesheet();

  function applyWidgetStyles() {
    const fontStack = getFontStack(widgetConfig.font_choice || defaultConfig.font_choice);
    ensureFontLoaded(widgetConfig.font_choice || defaultConfig.font_choice);
    const fabBackground = widgetConfig.fab_color || defaultConfig.fab_color;
    const primaryBackground = widgetConfig.primary_color || defaultConfig.primary_color;
    const headerBackground = primaryBackground;
    const fabTextColor = getBubbleTextColor(fabBackground);
    const primaryTextColor = getBubbleTextColor(primaryBackground);
    const headerTextColor = getBubbleTextColor(headerBackground);

    bubble.style.background = fabBackground;
    bubble.style.color = fabTextColor;
    bubble.style.boxShadow = fabTextColor === "#ffffff"
      ? "0 6px 16px rgba(0,0,0,0.18)"
      : "0 6px 16px rgba(15,23,42,0.10)";
    if (composer) {
      composer.style.background = "#ffffff";
    }
    if (inputWrap) {
      inputWrap.style.background = "#ffffff";
    }
    send.style.background = primaryBackground;
    send.style.color = primaryTextColor;
    header.style.background = headerBackground;
    header.style.color = headerTextColor;
    header.style.borderBottom = "1px solid rgba(17,17,17,0.06)";
    title.textContent = widgetConfig.header_title || defaultConfig.header_title;

    setFontImportant(box, fontStack);
    setFontImportant(header, fontStack);
    setFontImportant(title, fontStack);
    setFontImportant(messages, fontStack);
    setFontImportant(inputWrap, fontStack);
    setFontImportant(input, fontStack);
    setFontImportant(send, fontStack);

    if (widgetConfig.logo_url) {
      logo.src = widgetConfig.logo_url;
      logo.style.display = "block";
      logo.style.filter = headerTextColor === "#ffffff" ? "brightness(0) invert(1)" : "none";
    } else {
      logo.style.display = "none";
    }

    bubble.style.opacity = "1";
  }

  function getConfigFromCache() {
    try {
      if (typeof localStorage === "undefined") {
        return null;
      }
      const cached = localStorage.getItem(CONFIG_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (_) {
      return null;
    }
  }

  function saveConfigToCache(config) {
    try {
      if (typeof localStorage === "undefined") {
        return;
      }
      localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
    } catch (_) {
      // Ignore cache write failures
    }
  }

  async function loadWidgetConfig() {
    if (!businessId) {
      applyWidgetStyles();
      return;
    }

    // Try loading from cache first for instant display
    const cachedConfig = getConfigFromCache();
    if (cachedConfig) {
      console.log("[EmbedBot] Using cached config", cachedConfig);
      widgetConfig = cachedConfig;
      applyWidgetStyles();
      if (chatOpen) {
        tryShowWelcomeMessage();
      }
    }

    // Fetch fresh config in the background
    try {
      const res = await fetch(CONFIG_URL);
      if (!res.ok) {
        // If cache wasn't available, at least apply default styles
        if (!cachedConfig) {
          applyWidgetStyles();
        }
        return;
      }

      const data = await res.json();
      console.log("[EmbedBot] /api/widget-config response:", data);
      console.log("[EmbedBot] welcome_message from API:", data.welcome_message);

      const resolvedName = (data.name || scriptName || defaultConfig.name || "").trim();
      const freshConfig = {
        primary_color: scriptTag.getAttribute("data-primary-color") || data.primary_color || defaultConfig.primary_color,
        secondary_color: scriptTag.getAttribute("data-secondary-color") || data.secondary_color || defaultConfig.secondary_color,
        fab_color: scriptTag.getAttribute("data-fab-color") || data.fab_color || defaultConfig.fab_color,
        logo_url: data.logo_url || defaultConfig.logo_url,
        font_choice: scriptTag.getAttribute("data-font") || data.font_choice || defaultConfig.font_choice,
        welcome_message: data.welcome_message || defaultConfig.welcome_message,
        name: resolvedName,
        header_title: formatHeaderTitle(resolvedName),
      };
      widgetConfig = freshConfig;
      saveConfigToCache(freshConfig);
      applyWidgetStyles();
      if (chatOpen) {
        // If chat was opened before config finished loading, try again now.
        tryShowWelcomeMessage();
      }
    } catch (_) {
      // If fetch failed and we have cache, keep using it
      if (!cachedConfig) {
        widgetConfig = {
          ...widgetConfig,
          welcome_message: defaultConfig.welcome_message,
          header_title: formatHeaderTitle(scriptName),
        };
        applyWidgetStyles();
      }
    }
  }

  function setChatOpen(isOpen) {
    console.log("[EmbedBot] setChatOpen called:", { isOpen, hasShownWelcomeMessage });
    chatOpen = isOpen;
    box.classList.toggle("eb-open", chatOpen);
    box.style.opacity = chatOpen ? "1" : "0";
    box.style.visibility = chatOpen ? "visible" : "hidden";
    box.style.transform = chatOpen ? "translateY(0) scale(1)" : "translateY(10px) scale(0.985)";
    box.style.pointerEvents = chatOpen ? "auto" : "none";
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

  function renderAssistantText(target, text) {
    if (!target) return;
    target.textContent = "";

    const paragraphs = String(text || "").split(/\n\n+/);
    if (paragraphs.length === 0) {
      target.textContent = text;
      return;
    }

    paragraphs.forEach((paragraphText) => {
      const paragraph = document.createElement("p");
      paragraph.style.whiteSpace = "pre-wrap";
      paragraph.style.fontSize = "inherit";
      paragraph.style.lineHeight = "inherit";
      paragraph.style.fontWeight = "400";
      paragraph.textContent = paragraphText;
      target.appendChild(paragraph);
    });
  }

  function addMessage(text, isUser, options = {}) {
    const showStatus = options.showStatus || false;
    const timestamp = options.timestamp || nowAsTime();
    const isGrouped = lastSender === (isUser ? "user" : "bot");

    const row = document.createElement("div");
    const isFirstMessage = messages.childElementCount === 0;
    row.className = "eb-row";
    row.style.cssText = `display:flex;align-items:flex-end;gap:6px;justify-content:${isUser ? "flex-end" : "flex-start"};margin-top:${isFirstMessage ? "0" : (isGrouped ? "4px" : "10px")};`;

    const bubbleWrap = document.createElement("div");
    bubbleWrap.style.cssText = `display:flex;flex-direction:column;max-width:${isUser ? "74%" : "86%"};align-items:${isUser ? "flex-end" : "flex-start"};${isUser ? "" : "margin-left:-16px;"}`;

    const msg = document.createElement("div");
    const userBubbleColor = widgetConfig.secondary_color || defaultConfig.secondary_color;
    const bubbleBackgroundColor = isUser ? userBubbleColor : "transparent";
    const bubbleTextColor = getBubbleTextColor(bubbleBackgroundColor);
    const userMsgStyles = `background:${bubbleBackgroundColor};color:${bubbleTextColor};padding:8px 12px;border-radius:14px;display:inline-block;max-width:100%;font-size:14px;line-height:1.45;word-break:break-word;white-space:pre-wrap;`;
    const botMsgStyles = "background:transparent;color:#1a1a1a;padding:0;border-radius:0;display:block;max-width:min(100%, 58ch);font-size:15px;line-height:1.52;font-weight:400;word-break:break-word;white-space:normal;";
    msg.style.cssText = isUser ? userMsgStyles : botMsgStyles;
    if (isUser) {
      msg.textContent = text;
    } else {
      msg.classList.add("eb-ai-msg");
      renderAssistantText(msg, text);
    }

    const meta = document.createElement("div");
    meta.className = "eb-meta";
    meta.style.cssText = "display:flex;gap:6px;margin-top:4px;font-size:10px;color:#9ca3af;align-items:center;";

    const time = document.createElement("span");
    time.className = "eb-time";
    time.textContent = timestamp;
    meta.appendChild(time);

    const fontStack = getFontStack(widgetConfig.font_choice || defaultConfig.font_choice);
    setFontImportant(row, fontStack);
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
    if (meta.childElementCount > 0) {
      bubbleWrap.appendChild(meta);
    }

    if (isUser) {
      row.appendChild(bubbleWrap);
    } else {
      row.appendChild(bubbleWrap);
    }

    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    lastSender = isUser ? "user" : "bot";

    return { row, msg, status };
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
    let botStreamText = "";

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, business_id: businessId, page_url: window.location.href, history: conversationHistory.slice(-10) }),
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

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        botStreamText += decoder.decode(value, { stream: true });
        renderAssistantText(botMessage.msg, botStreamText);
        messages.scrollTop = messages.scrollHeight;
      }

      if (!botStreamText.trim()) {
        botStreamText = labels.errorReply;
      }

      renderAssistantText(botMessage.msg, botStreamText);

      botMessage.msg.classList.remove("eb-streaming");
      if (userMessage.status) {
        userMessage.status.textContent = "";
      }
      conversationHistory.push({ role: "user", content: text });
      conversationHistory.push({ role: "assistant", content: botStreamText });
    } catch (error) {
      const errorMessage = error instanceof Error && error.message
        ? error.message
        : labels.errorReply;
      renderAssistantText(botMessage.msg, errorMessage);
      botMessage.msg.classList.remove("eb-streaming");
      if (userMessage.status) {
        userMessage.status.textContent = labels.failed;
        userMessage.status.style.color = "#b91c1c";
      }
    }
  }

  send.onclick = sendMessage;
  input.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } };

  loadWidgetConfig();
})();