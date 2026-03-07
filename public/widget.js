(function () {
  const scriptTag = document.currentScript;
  const businessId = new URL(scriptTag.src).searchParams.get("id");
  const apiOrigin = new URL(scriptTag.src).origin;
  const API_URL = `${apiOrigin}/api/chat`;
  const CONFIG_URL = `${apiOrigin}/api/widget-config?id=${encodeURIComponent(businessId || "")}`;

  const hasPrimaryColorAttr = scriptTag.getAttribute("data-primary-color") !== null;
  const hasSecondaryColorAttr = scriptTag.getAttribute("data-secondary-color") !== null;
  const hasFabColorAttr = scriptTag.getAttribute("data-fab-color") !== null;
  const hasFontAttr = scriptTag.getAttribute("data-font") !== null;
  const hasAnyStyleDataAttribute = hasPrimaryColorAttr || hasSecondaryColorAttr || hasFabColorAttr || hasFontAttr;

  const defaultConfig = {
    primary_color: "#000000",
    secondary_color: "#000000",
    fab_color: "#000000",
    logo_url: "",
    font_choice: "sans-serif",
  };

  let widgetConfig = {
    ...defaultConfig,
    primary_color: scriptTag.getAttribute("data-primary-color") || defaultConfig.primary_color,
    secondary_color: scriptTag.getAttribute("data-secondary-color") || defaultConfig.secondary_color,
    fab_color: scriptTag.getAttribute("data-fab-color") || defaultConfig.fab_color,
    font_choice: scriptTag.getAttribute("data-font") || defaultConfig.font_choice,
  };
  
  const container = document.createElement("div");
  container.innerHTML = `
    <div id="eb-bubble" style="position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:#000;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:9999;">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 4.75h14a2.75 2.75 0 0 1 2.75 2.75v7A2.75 2.75 0 0 1 19 17.25h-6.23l-2.9 2.6a.75.75 0 0 1-1.24-.65l.33-1.95H5A2.75 2.75 0 0 1 2.25 14.5v-7A2.75 2.75 0 0 1 5 4.75Z" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="8.5" cy="11" r="1.05" fill="#fff"/>
        <circle cx="12" cy="11" r="1.05" fill="#fff"/>
        <circle cx="15.5" cy="11" r="1.05" fill="#fff"/>
      </svg>
    </div>
    <div id="eb-box" style="display:none;position:fixed;bottom:90px;right:24px;width:340px;height:480px;background:white;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.15);z-index:9999;flex-direction:column;overflow:hidden;">
      <div id="eb-header" style="background:#000;color:white;padding:16px;font-weight:bold;display:flex;align-items:center;gap:10px;">
        <img id="eb-logo" alt="Company logo" style="display:none;height:24px;width:auto;max-width:120px;object-fit:contain;" />
        <span>Support Chat</span>
      </div>
      <div id="eb-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;height:340px"></div>
      <div style="padding:12px;border-top:1px solid #eee;display:flex;gap:8px">
        <input id="eb-input" type="text" placeholder="Skriv dit spørgsmål..." style="flex:1;padding:8px 12px;border:1px solid #ddd;border-radius:8px;outline:none;pointer-events:all;position:relative;z-index:99999;color:black;background:white;cursor:text;user-select:text;-webkit-user-select:text;font-size:14px;font-family:inherit;caret-color:black;"/>
        <button id="eb-send" style="background:#000;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  const bubble = document.getElementById("eb-bubble");
  const box = document.getElementById("eb-box");
  const header = document.getElementById("eb-header");
  const logo = document.getElementById("eb-logo");
  const input = document.getElementById("eb-input");
  const send = document.getElementById("eb-send");
  const messages = document.getElementById("eb-messages");

  function applyWidgetStyles() {
    bubble.style.background = widgetConfig.fab_color || defaultConfig.fab_color;
    send.style.background = widgetConfig.primary_color || defaultConfig.primary_color;
    header.style.background = widgetConfig.primary_color || defaultConfig.primary_color;
    box.style.fontFamily = widgetConfig.font_choice || defaultConfig.font_choice;

    if (widgetConfig.logo_url) {
      logo.src = widgetConfig.logo_url;
      logo.style.display = "block";
    } else {
      logo.style.display = "none";
    }
  }

  async function loadWidgetConfig() {
    if (hasAnyStyleDataAttribute) {
      applyWidgetStyles();
      return;
    }

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
      console.log("Widget config:", data);
      widgetConfig = {
        primary_color: data.primary_color || defaultConfig.primary_color,
        secondary_color: data.secondary_color || defaultConfig.secondary_color,
        fab_color: data.fab_color || defaultConfig.fab_color,
        logo_url: data.logo_url || defaultConfig.logo_url,
        font_choice: data.font_choice || defaultConfig.font_choice,
      };
    } catch (_) {
      widgetConfig = { ...defaultConfig };
    }

    applyWidgetStyles();
  }

  bubble.onclick = () => {
    box.style.display = box.style.display === "none" ? "flex" : "none";
    if (box.style.display === "flex") {
      input.focus();
    }
  };

  function addMessage(text, isUser) {
    const row = document.createElement("div");
    row.style.cssText = `display:flex;align-items:flex-end;gap:6px;justify-content:${isUser ? "flex-end" : "flex-start"}`;

    const icon = document.createElement("span");
    icon.style.cssText = "display:flex;align-items:center;justify-content:center;flex:0 0 auto;";
    icon.innerHTML = isUser
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#aaa"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#aaa"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/></svg>';

    const msg = document.createElement("div");
    const userBubbleColor = widgetConfig.secondary_color || defaultConfig.secondary_color;
    msg.style.cssText = `background:${isUser ? userBubbleColor : "#f1f1f1"};color:${isUser ? "white" : "black"};padding:8px 12px;border-radius:12px;max-width:80%;font-size:14px`;
    msg.textContent = text;

    if (isUser) {
      row.appendChild(msg);
      row.appendChild(icon);
    } else {
      row.appendChild(icon);
      row.appendChild(msg);
    }

    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return msg;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMessage(text, true);
    const typingMessage = addMessage("Skriver...", false);

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, business_id: businessId }),
    });

    const data = await res.json();
    typingMessage.textContent = data.answer;
  }

  send.onclick = sendMessage;
  input.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } };

  loadWidgetConfig();
})();