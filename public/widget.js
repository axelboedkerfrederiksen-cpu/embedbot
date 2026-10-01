(function () {
  const scriptTag = document.currentScript;
  const businessId = new URL(scriptTag.src).searchParams.get("id");
  const previewToken = (scriptTag.getAttribute("data-preview-token") || "").trim();
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
    chat_outline_enabled: "false",
    chat_outline_color: "#111111",
    chat_outline_width: "1",
    chat_outline_opacity: "25",
    widget_opacity: "100",
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
      return;
    }

    const welcomeMessage = (widgetConfig.welcome_message || "").trim();
    if (!welcomeMessage) {
      return;
    }

    addMessage(welcomeMessage, false);
    conversationHistory.push({ role: "assistant", content: welcomeMessage });
    hasShownWelcomeMessage = true;
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

  function clampNumber(value, min, max, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, parsed));
  }

  function getOutlineStyle(config) {
    const outlineEnabled = String(config.chat_outline_enabled || "false").toLowerCase() === "true";
    if (!outlineEnabled) {
      return "none";
    }

    const width = clampNumber(config.chat_outline_width, 0, 6, 1);
    if (width <= 0) {
      return "none";
    }

    const opacity = clampNumber(config.chat_outline_opacity, 0, 100, 25) / 100;
    const normalizedHex = normalizeHexColor(config.chat_outline_color || "#111111") || normalizeHexColor("#111111");
    const red = parseInt(normalizedHex.slice(0, 2), 16);
    const green = parseInt(normalizedHex.slice(2, 4), 16);
    const blue = parseInt(normalizedHex.slice(4, 6), 16);

    return `${width}px solid rgba(${red}, ${green}, ${blue}, ${opacity})`;
  }

  function getWidgetOpacity(config) {
    return clampNumber(config.widget_opacity, 40, 100, 100) / 100;
  }
  
  const container = document.createElement("div");
  container.innerHTML = `
    <button type="button" id="eb-bubble" aria-label="Åbn supportchat" aria-controls="eb-box" aria-expanded="false" style="position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:#ffffff;color:#1a1a1a;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:9999;box-shadow:0 6px 18px rgba(0,0,0,0.10);opacity:0;transition:opacity 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;">${OPEN_ICON}</button>
    <div id="eb-box" role="dialog" aria-label="Supportchat" aria-hidden="true" style="position:fixed;bottom:90px;right:24px;width:352px;height:510px;background:#ffffff;border:none;border-radius:18px;box-shadow:0 10px 28px rgba(15,23,42,0.10);z-index:9999;display:flex;flex-direction:column;overflow:hidden;color:#1a1a1a;opacity:0;visibility:hidden;transform:translateY(10px) scale(0.985);pointer-events:none;transition:opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease;">
      <div id="eb-header" style="background:#f9f9f9;color:#1a1a1a;padding:8px 14px;font-weight:600;display:flex;align-items:center;gap:10px;">
        <img id="eb-logo" alt="Virksomhedslogo" style="display:none;height:24px;width:auto;max-width:120px;object-fit:contain;filter:brightness(0) invert(1);" />
        <div style="display:flex;flex-direction:column;line-height:1.2;">
          <span id="eb-title">Support Chat</span>
        </div>
      </div>
      <div id="eb-messages" role="log" aria-live="polite" aria-relevant="additions text" style="flex:1;overflow-y:auto;padding:28px 24px 16px 24px;display:flex;flex-direction:column;gap:0;height:356px;background:#ffffff;"></div>
      <div id="eb-composer" style="padding:12px 24px 11px 24px;border-top:1px solid rgba(17,17,17,0.06);display:flex;flex-direction:column;gap:6px;align-items:stretch;background:#ffffff;">
        <div id="eb-input-wrap" style="display:flex;align-items:center;gap:8px;flex:1;border:1px solid rgba(17,17,17,0.10);border-radius:15px;padding:7px 7px 7px 14px;background:#ffffff;transition:border-color 0.18s ease, box-shadow 0.18s ease;">
          <input id="eb-input" aria-label="Skriv en besked" type="text" placeholder="Skriv dit spørgsmål..." style="flex:1;padding:11px 0;border:none;outline:none;pointer-events:all;position:relative;z-index:99999;color:#1a1a1a;background:#ffffff;cursor:text;user-select:text;-webkit-user-select:text;font-size:14px;font-family:inherit;line-height:1.45;caret-color:#1a1a1a;"/>
          <button id="eb-send" aria-label="Send besked" style="background:#ffffff;color:#1a1a1a;border:none;padding:8px;border-radius:10px;cursor:pointer;white-space:nowrap;font-weight:600;line-height:1;display:flex;align-items:center;justify-content:center;transition:transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M13 7l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div id="eb-watermark" aria-label="Lavet af EmbedBot" style="color:#6b6258;font-size:10px;line-height:1.2;text-align:center;letter-spacing:0.01em;">Lavet af EmbedBot · <a href="https://www.embedbot.dk/privacy" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;text-underline-offset:2px;">Privatliv</a></div>
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
  const watermark = document.getElementById("eb-watermark");
  const input = document.getElementById("eb-input");
  const send = document.getElementById("eb-send");
  const messages = document.getElementById("eb-messages");

  const conversationHistory = [];
  let activeWidgetOpacity = 1;
  let activeOutlineStyle = "none";

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
      #eb-bubble:focus-visible,
      #eb-send:focus-visible {
        outline: 3px solid #6d28d9 !important;
        outline-offset: 3px !important;
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
      #eb-messages .eb-meta {
        all: unset;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
        color: #6b7280;
        font-size: 10px;
        line-height: 1;
      }
      #eb-messages .eb-time,
      #eb-messages .eb-status {
        all: unset;
        display: inline-block;
        list-style: none !important;
      }
      #eb-messages .eb-meta::before,
      #eb-messages .eb-meta::after,
      #eb-messages .eb-time::before,
      #eb-messages .eb-time::after,
      #eb-messages .eb-status::before,
      #eb-messages .eb-status::after,
      #eb-messages .eb-meta::marker,
      #eb-messages .eb-time::marker,
      #eb-messages .eb-status::marker {
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
      .eb-thinking-card {
        display: inline-grid;
        place-items: center;
        width: 34px;
        height: 34px;
        margin: 2px 0;
      }
      #eb-messages .eb-thinking-host + .eb-meta {
        display: inline-flex !important;
        width: 34px !important;
        justify-content: center !important;
        margin-top: 1px !important;
      }
      .eb-thinking-orb {
        position: relative;
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        flex: 0 0 30px;
      }
      .eb-thinking-core {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #111111;
        box-shadow: 0 0 0 4px rgba(17, 17, 17, 0.07), 0 0 14px rgba(17, 17, 17, 0.28);
        animation: eb-thinking-breathe 1.45s ease-in-out infinite;
      }
      .eb-thinking-ring {
        position: absolute;
        inset: 2px;
        border: 1px solid rgba(17, 17, 17, 0.18);
        border-radius: 50%;
        animation: eb-thinking-orbit 1.65s linear infinite;
      }
      .eb-thinking-ring::after {
        content: "";
        position: absolute;
        top: -2px;
        left: 50%;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #111111;
        box-shadow: 0 0 8px rgba(17, 17, 17, 0.3);
      }
      .eb-thinking-ring-secondary {
        inset: 6px;
        border-color: rgba(17, 17, 17, 0.11);
        animation-duration: 1.05s;
        animation-direction: reverse;
      }
      .eb-thinking-ring-secondary::after {
        top: auto;
        bottom: -2px;
        width: 4px;
        height: 4px;
        background: #8a8176;
      }
      .eb-answer-reveal {
        animation: eb-answer-reveal 0.28s cubic-bezier(0.22, 1, 0.36, 1);
      }
      @keyframes eb-thinking-breathe {
        0%, 100% { transform: scale(0.82); opacity: 0.68; }
        50% { transform: scale(1.14); opacity: 1; }
      }
      @keyframes eb-thinking-orbit {
        to { transform: rotate(360deg); }
      }
      @keyframes eb-answer-reveal {
        from { opacity: 0; transform: translateY(4px); filter: blur(2px); }
        to { opacity: 1; transform: translateY(0); filter: blur(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        .eb-thinking-core,
        .eb-thinking-ring,
        .eb-answer-reveal {
          animation: none !important;
        }
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
    const resolvedOutline = getOutlineStyle(widgetConfig);
    const resolvedWidgetOpacity = getWidgetOpacity(widgetConfig);

    activeOutlineStyle = resolvedOutline;
    activeWidgetOpacity = resolvedWidgetOpacity;

    bubble.style.background = fabBackground;
    bubble.style.color = fabTextColor;
    bubble.style.border = resolvedOutline;
    bubble.style.boxShadow = fabTextColor === "#ffffff"
      ? "0 6px 16px rgba(0,0,0,0.18)"
      : "0 6px 16px rgba(15,23,42,0.10)";
    box.style.border = resolvedOutline;
    if (chatOpen) {
      box.style.opacity = String(activeWidgetOpacity);
    }
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
    setFontImportant(watermark, fontStack);

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
    } catch {
      return null;
    }
  }

  function saveConfigToCache(config) {
    try {
      if (typeof localStorage === "undefined") {
        return;
      }
      localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
    } catch {
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

      const resolvedName = (data.name || scriptName || defaultConfig.name || "").trim();
      const freshConfig = {
        primary_color: scriptTag.getAttribute("data-primary-color") || data.primary_color || defaultConfig.primary_color,
        secondary_color: scriptTag.getAttribute("data-secondary-color") || data.secondary_color || defaultConfig.secondary_color,
        fab_color: scriptTag.getAttribute("data-fab-color") || data.fab_color || defaultConfig.fab_color,
        logo_url: data.logo_url || defaultConfig.logo_url,
        font_choice: scriptTag.getAttribute("data-font") || data.font_choice || defaultConfig.font_choice,
        welcome_message: data.welcome_message || defaultConfig.welcome_message,
        chat_outline_enabled: data.chat_outline_enabled || defaultConfig.chat_outline_enabled,
        chat_outline_color: data.chat_outline_color || defaultConfig.chat_outline_color,
        chat_outline_width: data.chat_outline_width || defaultConfig.chat_outline_width,
        chat_outline_opacity: data.chat_outline_opacity || defaultConfig.chat_outline_opacity,
        widget_opacity: data.widget_opacity || defaultConfig.widget_opacity,
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
    } catch {
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
    chatOpen = isOpen;
    box.classList.toggle("eb-open", chatOpen);
    box.style.opacity = chatOpen ? String(activeWidgetOpacity) : "0";
    box.style.visibility = chatOpen ? "visible" : "hidden";
    box.style.transform = chatOpen ? "translateY(0) scale(1)" : "translateY(10px) scale(0.985)";
    box.style.pointerEvents = chatOpen ? "auto" : "none";
    bubble.innerHTML = chatOpen ? CLOSE_ICON : OPEN_ICON;
    bubble.setAttribute("aria-label", chatOpen ? "Luk supportchat" : "Åbn supportchat");
    bubble.setAttribute("aria-expanded", String(chatOpen));
    box.setAttribute("aria-hidden", String(!chatOpen));
    if (chatOpen) {
      tryShowWelcomeMessage();
      input.focus();
    }
  }

  bubble.onclick = () => {
    setChatOpen(!chatOpen);
  };

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && chatOpen) {
      setChatOpen(false);
      bubble.focus();
    }
  });

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

  function renderThinkingState(target, language) {
    if (!target) return;
    target.textContent = "";
    target.classList.add("eb-thinking-host");

    const loader = document.createElement("div");
    loader.className = "eb-thinking-card";
    loader.setAttribute("role", "status");
    loader.setAttribute("aria-live", "polite");
    loader.setAttribute("aria-label", language === "en" ? "Preparing your answer" : "Forbereder dit svar");
    loader.innerHTML = `
      <span class="eb-thinking-orb" aria-hidden="true">
        <span class="eb-thinking-ring"></span>
        <span class="eb-thinking-ring eb-thinking-ring-secondary"></span>
        <span class="eb-thinking-core"></span>
      </span>
    `;
    target.appendChild(loader);
  }

  function addMessage(text, isUser, options = {}) {
    const showStatus = options.showStatus || false;
    const timestamp = options.timestamp || nowAsTime();
    const isGrouped = lastSender === (isUser ? "user" : "bot");

    const row = document.createElement("div");
    const isFirstMessage = messages.childElementCount === 0;
    row.className = "eb-row";
    row.style.cssText = `display:flex;align-items:flex-end;gap:6px;justify-content:${isUser ? "flex-end" : "flex-start"};margin-top:${isFirstMessage ? "8px" : (isGrouped ? "3px" : "7px")};`;

    const bubbleWrap = document.createElement("div");
    bubbleWrap.style.cssText = `display:flex;flex-direction:column;max-width:${isUser ? "72%" : "80%"};align-items:${isUser ? "flex-end" : "flex-start"};${isUser ? "margin-right:10px;" : "margin-left:2px;"}`;

    const msg = document.createElement("div");
    const userBubbleColor = widgetConfig.secondary_color || defaultConfig.secondary_color;
    const bubbleBackgroundColor = isUser ? userBubbleColor : "transparent";
    const bubbleTextColor = getBubbleTextColor(bubbleBackgroundColor);
    const userMsgStyles = `background:${bubbleBackgroundColor};color:${bubbleTextColor};padding:8px 12px;border-radius:14px;display:inline-block;max-width:100%;font-size:14px;line-height:1.45;word-break:break-word;white-space:pre-wrap;border:${activeOutlineStyle};`;
    const botMsgStyles = "background:transparent;color:#1a1a1a;padding:0;border-radius:0;display:block;max-width:min(100%, 58ch);font-size:15px;line-height:1.52;font-weight:400;word-break:break-word;white-space:normal;";
    msg.style.cssText = isUser ? userMsgStyles : botMsgStyles;
    if (isUser) {
      msg.textContent = text;
    } else {
      msg.classList.add("eb-ai-msg");
      renderAssistantText(msg, text);
    }

    const meta = document.createElement("span");
    meta.className = "eb-meta";
    meta.style.cssText = "all:unset;display:inline-flex;align-items:center;gap:6px;margin-top:3px;color:#6b7280;font-size:10px;line-height:1;";

    const time = document.createElement("span");
    time.className = "eb-time";
    time.style.cssText = "all:unset;display:inline-block;";
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
      status.className = "eb-status";
      status.style.cssText = "all:unset;display:inline-block;";
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

  // The nonce lives only in this widget instance. Order inputs, OTPs and private
  // responses never enter conversationHistory or browser storage.
  const commerceSession = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, "0")).join("");
  async function commerceCall(path, payload) {
    const response = await fetch(`${apiOrigin}/api/commerce/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_id: businessId, session: commerceSession, ...payload }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Funktionen er ikke tilgængelig lige nu.");
    return data;
  }
  function element(tag, text, parent) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }
  function actionButton(parent, label, action, secondary = false) {
    const button = element("button", label, parent);
    button.type = "button";
    button.className = secondary ? "eb-commerce-button eb-commerce-secondary" : "eb-commerce-button";
    button.onclick = action;
    return button;
  }
  function formField(form, label, type, required = true) {
    const wrapper = element("label", undefined, form);
    wrapper.className = "eb-commerce-field";
    element("span", label, wrapper);
    const field = element(type === "textarea" ? "textarea" : "input", undefined, wrapper);
    if (type !== "textarea") field.type = type;
    field.required = required;
    field.maxLength = type === "textarea" ? 5000 : 254;
    if (type === "textarea") field.rows = 4;
    return field;
  }
  function commerceCard(target) {
    const card = element("div", undefined, target);
    card.className = "eb-commerce-card";
    return card;
  }
  function supportAction(target) {
    actionButton(target, "Opret en supportsag", () => {
      const message = addMessage("Beskriv din henvendelse. Du får mulighed for at gennemse og bekræfte den, inden den sendes.", false);
      supportForm(message.msg);
      messages.scrollTop = messages.scrollHeight;
    }, true);
  }
  function notificationText(state) {
    if (state === "sent") return "Mailnotifikationen er sendt til webshoppens mailudbyder.";
    if (state === "failed") return "Mailnotifikationen kunne ikke sendes. Sagen er gemt i webshoppens dashboard og kan forsøges sendt igen.";
    if (state === "not_configured") return "Mailnotifikationen er ikke konfigureret. Sagen er gemt i webshoppens dashboard.";
    return "Sagen er gemt i webshoppens dashboard. Mailnotifikationen afventer afsendelse.";
  }
  function supportForm(target) {
    const card = commerceCard(target);
    const form = element("form", undefined, card);
    const description = formField(form, "Hvad skal webshoppen hjælpe med?", "textarea");
    description.minLength = 10;
    const email = formField(form, "Din kontaktmail", "email");
    const number = formField(form, "Ordrenummer (valgfrit)", "text", false);
    number.maxLength = 40;
    const contextLabel = element("label", undefined, form);
    contextLabel.className = "eb-commerce-consent";
    const context = element("input", undefined, contextLabel);
    context.type = "checkbox";
    element("span", "Vedlæg de seneste beskeder fra denne samtale", contextLabel);
    const honeypot = element("input", undefined, form);
    honeypot.name = "website"; honeypot.tabIndex = -1; honeypot.autocomplete = "off";
    honeypot.setAttribute("aria-hidden", "true"); honeypot.style.display = "none";
    const error = element("p", "", form); error.setAttribute("role", "alert");
    const review = element("button", "Gennemse henvendelsen", form); review.type = "submit"; review.className = "eb-commerce-button";
    form.onsubmit = async event => {
      event.preventDefault(); if (review.disabled) return;
      review.disabled = true; error.textContent = "";
      try {
        const data = await commerceCall("support", { action: "prepare", contactEmail: email.value, description: description.value, orderNumber: number.value, context: context.checked ? conversationHistory.slice(-10) : [], website: honeypot.value });
        form.hidden = true;
        const summary = element("div", undefined, card);
        element("strong", "Kontrollér din henvendelse", summary);
        element("p", data.summary.description, summary);
        element("p", `Kontaktmail: ${data.summary.contactEmail}`, summary);
        if (data.summary.orderNumber) element("p", `Ordrenummer: ${data.summary.orderNumber}`, summary);
        element("p", data.text, summary);
        const status = element("p", "", summary); status.setAttribute("role", "status");
        const confirm = actionButton(summary, "Send henvendelse", async () => {
          if (confirm.disabled) return;
          confirm.disabled = true; edit.disabled = true; status.textContent = "Opretter din sag…";
          try {
            const result = await commerceCall("support", { action: "confirm", confirmation: data.confirmation, confirmed: true });
            card.textContent = "";
            element("strong", `Sagsnummer: ${result.caseNumber}`, card);
            element("p", result.text, card);
            element("p", notificationText(result.notificationStatus), card);
          } catch (error) { status.textContent = error.message || "Sagen kunne ikke oprettes. Prøv igen."; confirm.disabled = false; edit.disabled = false; }
        });
        const edit = actionButton(summary, "Ret henvendelsen", () => { summary.remove(); form.hidden = false; description.focus(); }, true);
      } catch (failure) { error.textContent = failure.message || "Opsummeringen kunne ikke oprettes."; }
      finally { review.disabled = false; messages.scrollTop = messages.scrollHeight; }
    };
  }
  function renderOrder(target, data) {
    const card = commerceCard(target);
    element("strong", `Ordrestatus: ${data.order.status}`, card);
    element("p", `Hentet ${new Date(data.fetchedAt).toLocaleString("da-DK")}`, card);
    if (!data.order.shipments.length) element("p", "Ingen trackingoplysninger tilgængelige fra webshoppen.", card);
    data.order.shipments.forEach(shipment => {
      if (shipment.carrier) element("p", shipment.carrier, card);
      if (shipment.trackingNumber) element("p", `Trackingnummer: ${shipment.trackingNumber}`, card);
      if (shipment.shippedAt) element("p", `Afsendt: ${new Date(shipment.shippedAt).toLocaleDateString("da-DK")}`, card);
      const url = safeCommerceUrl(shipment.trackingUrl);
      if (url) { const link = element("a", "Følg forsendelsen", card); link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; }
    });
  }
  function orderForm(target, data) {
    const card = commerceCard(target), form = element("form", undefined, card);
    const number = formField(form, data.copy?.number || "Ordrenummer", "text"); number.maxLength = 40;
    const email = formField(form, data.copy?.email || "E-mail brugt ved købet", "email");
    const status = element("p", "", form); status.setAttribute("role", "status");
    const submit = element("button", data.copy?.submit || "Send engangskode", form); submit.type = "submit"; submit.className = "eb-commerce-button";
    form.onsubmit = async event => {
      event.preventDefault(); if (submit.disabled) return;
      submit.disabled = true; status.textContent = "Forbereder verificering…";
      try {
        const request = await commerceCall("orders", { action: "request", order: { number: number.value, email: email.value } });
        form.hidden = true;
        const verifyForm = element("form", undefined, card);
        element("p", request.text, verifyForm);
        const code = formField(verifyForm, "Engangskode fra mailen", "text"); code.inputMode = "numeric"; code.autocomplete = "one-time-code"; code.pattern = "[0-9]{6}"; code.maxLength = 6; code.minLength = 6;
        const verifyStatus = element("p", "", verifyForm); verifyStatus.setAttribute("role", "status");
        const verify = element("button", "Bekræft og hent ordrestatus", verifyForm); verify.type = "submit"; verify.className = "eb-commerce-button";
        actionButton(verifyForm, "Bed om en ny kode", () => { verifyForm.remove(); form.hidden = false; status.textContent = ""; }, true);
        verifyForm.onsubmit = async event => {
          event.preventDefault(); if (verify.disabled) return;
          verify.disabled = true; verifyStatus.textContent = "Kontrollerer kode…";
          try {
            const result = await commerceCall("orders", { action: "verify", challenge: request.challenge, code: code.value });
            card.remove(); renderOrder(target, result); messages.scrollTop = messages.scrollHeight;
          } catch (error) { code.value = ""; verifyStatus.textContent = error.message || "Ordreopslaget kunne ikke gennemføres."; verify.disabled = false; }
        };
        code.focus();
      } catch (error) { status.textContent = error.message || "Ordreopslag er ikke tilgængeligt."; }
      finally { submit.disabled = false; messages.scrollTop = messages.scrollHeight; }
    };
  }
  function safeCommerceUrl(value) {
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
  }
  function productPrice(price, currency) {
    if (price === null || !currency) return "Pris ikke bekræftet";
    try { return new Intl.NumberFormat("da-DK", { style: "currency", currency }).format(Number(price)); } catch { return "Pris ikke bekræftet"; }
  }
  function renderCommerce(target, data) {
    target.classList.remove("eb-thinking-host");
    renderAssistantText(target, data.text || "");
    if (data.kind === "products") {
      (data.products || []).forEach(product => {
        const card = commerceCard(target);
        element("strong", product.name, card);
        element("p", product.description, card);
        const details = element("p", "", card);
        const display = item => {
          details.textContent = `${productPrice(item.price, item.currency)} · ${item.available === true ? "Lager registreret som tilgængeligt" : item.available === false ? "Ikke tilgængelig" : "Lagerstatus ikke bekræftet"}${typeof item.stock === "number" ? ` · Lager: ${item.stock}` : ""}`;
        };
        display(product);
        if (product.variants?.length) {
          const label = element("label", "Vælg variant", card); label.className = "eb-commerce-field";
          const select = element("select", undefined, label);
          const prompt = element("option", "Alle varianter", select); prompt.value = "";
          product.variants.forEach((variant,index) => { const option = element("option", variant.name, select); option.value = String(index); });
          select.onchange = () => display(select.value === "" ? product : product.variants[Number(select.value)]);
          if (product.requestedVariant?.id) {
            const matched = product.variants.findIndex(v => v.id === product.requestedVariant.id);
            if (matched >= 0) { select.value = String(matched); display(product.variants[matched]); }
          }
        }
        if (product.requestedVariant && !product.requestedVariant.id) element("p", product.requestedVariant.complete ? `Varianten “${product.requestedVariant.value}” blev ikke fundet blandt produktets varianter.` : `Jeg kan ikke bekræfte varianten “${product.requestedVariant.value}”, fordi listen over varianter er ufuldstændig.`, card);
        if (!product.variantsComplete) element("p", "Der kan være flere varianter. Se alle varianter i webshoppen.", card);
        const url = safeCommerceUrl(product.url);
        if (url) { const link = element("a", "Se produkt i webshoppen", card); link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; }
      });
      if (data.fetchedAt) element("p", `Hentet ${new Date(data.fetchedAt).toLocaleTimeString("da-DK")} · Data kan være op til ${data.cacheSeconds || 30} sekunder gamle. Pris og lager kan ændre sig.`, target);
      if (data.more) element("p", data.moreText || "Der er flere produkter. Prøv et mere præcist produktnavn.", target);
    }
    if (data.needsOrderInput) orderForm(target, data);
    if (data.needsSupportInput) supportForm(target);
    else if (data.offerSupport) supportAction(target);
    messages.scrollTop = messages.scrollHeight;
  }
  const supportShortcut = actionButton(composer, "Opret en supportsag", () => {
    const message = addMessage("Jeg hjælper dig med at sende din henvendelse videre til webshoppen.", false);
    supportForm(message.msg); messages.scrollTop = messages.scrollHeight;
  }, true);
  supportShortcut.classList.add("eb-support-shortcut");
  const commerceStyles = element("style", undefined, document.head);
  commerceStyles.textContent = `
    #eb-box .eb-commerce-card { border:1px solid #e8e3db; border-radius:12px; padding:12px; margin:10px 0; background:#fdfcf9; max-width:100%; font-size:13px; }
    #eb-box .eb-commerce-card p { margin:8px 0; white-space:pre-wrap; overflow-wrap:anywhere; font-size:12px; line-height:1.55; }
    #eb-box .eb-commerce-card a { color:#237a57; font-size:12px; text-decoration:underline; }
    #eb-box .eb-commerce-field { display:flex; flex-direction:column; gap:5px; margin:10px 0; font-size:12px; font-weight:500; }
    #eb-box .eb-commerce-field input, #eb-box .eb-commerce-field textarea, #eb-box .eb-commerce-field select { border:1px solid #d8d2c8; border-radius:8px; padding:9px; background:white; color:#171716; font:inherit; font-size:13px; width:100%; min-width:0; box-sizing:border-box; }
    #eb-box .eb-commerce-field input:focus, #eb-box .eb-commerce-field textarea:focus, #eb-box .eb-commerce-field select:focus { outline:2px solid #237a57; outline-offset:1px; }
    #eb-box .eb-commerce-button { border:1px solid #171716; border-radius:8px; padding:8px 10px; background:#171716; color:white; font:inherit; font-size:12px; cursor:pointer; margin:6px 5px 0 0; line-height:1.4; }
    #eb-box .eb-commerce-secondary { background:transparent; color:#575149; border-color:#d8d2c8; }
    #eb-box .eb-commerce-button:disabled { opacity:.5; cursor:wait; }
    #eb-box .eb-commerce-consent { display:flex; gap:8px; align-items:flex-start; font-size:11px; margin:10px 0; line-height:1.5; }
    #eb-box .eb-commerce-consent input { width:auto; }
    #eb-box .eb-support-shortcut { border:0; font-size:10px; padding:0; margin:0; align-self:center; text-decoration:underline; }
  `;

  let messageSending = false;
  async function sendMessage() {
    const text = input.value.trim();
    if (!text || messageSending) return;
    messageSending = true; send.disabled = true;

    const language = detectLanguage(text);
    const labels = language === "en"
      ? { sending: "Sending...", sent: "Sent", failed: "Failed", errorReply: "Sorry, there was an error. Please try again." }
      : { sending: "Sender...", sent: "Sendt", failed: "Fejl", errorReply: "Beklager, der opstod en fejl. Proev igen." };

    input.value = "";
    const userMessage = addMessage(text, true, { showStatus: true, statusText: labels.sending });
    const botMessage = addMessage("", false);
    renderThinkingState(botMessage.msg, language);
    let botStreamText = "";
    let hasStartedResponse = false;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, business_id: businessId, page_url: window.location.href, preview_token: previewToken || undefined, history: conversationHistory.slice(-10) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const apiError = typeof data.error === "string" && data.error.trim()
          ? data.error.trim()
          : "Failed to send message";
        throw new Error(apiError);
      }

      if ((res.headers.get("content-type") || "").includes("application/json")) {
        const data = await res.json();
        renderCommerce(botMessage.msg, data);
        if (userMessage.status) userMessage.status.textContent = "";
        // Structured private flows never enter the model's conversation history.
        if (data.kind === "products") {
          conversationHistory.push({ role: "user", content: text }, { role: "assistant", content: (data.products || []).map(p => p.name).join(", ") || data.text });
        }
        return;
      }
      if (!res.body) {
        throw new Error(labels.errorReply);
      }

      if (userMessage.status) {
        userMessage.status.textContent = labels.sent;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        const streamedText = decoder.decode(value, { stream: true });
        if (!streamedText) {
          continue;
        }

        botStreamText += streamedText;
        if (!hasStartedResponse) {
          hasStartedResponse = true;
          botMessage.msg.classList.remove("eb-thinking-host");
          botMessage.msg.classList.add("eb-answer-reveal");
        }
        renderAssistantText(botMessage.msg, botStreamText);
        messages.scrollTop = messages.scrollHeight;
      }

      if (!botStreamText.trim()) {
        botStreamText = labels.errorReply;
      }

      renderAssistantText(botMessage.msg, botStreamText);

      botMessage.msg.classList.remove("eb-thinking-host");
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
      botMessage.msg.classList.remove("eb-thinking-host");
      if (userMessage.status) {
        userMessage.status.textContent = labels.failed;
        userMessage.status.style.color = "#b91c1c";
      }
    } finally { messageSending = false; send.disabled = false; }
  }

  send.onclick = sendMessage;
  input.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } };

  loadWidgetConfig();
})();
