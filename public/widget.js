(function () {
  const scriptTag = document.currentScript;
  const businessId = new URL(scriptTag.src).searchParams.get("id");
  const API_URL = "https://embedbot1.vercel.app/api/chat";
  
  const container = document.createElement("div");
  container.innerHTML = `
    <div id="eb-bubble" style="position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:#000;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:9999;">
      <span style="color:white;font-size:24px">💬</span>
    </div>
    <div id="eb-box" style="display:none;position:fixed;bottom:90px;right:24px;width:340px;height:480px;background:white;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.15);z-index:9999;flex-direction:column;overflow:hidden;">
      <div style="background:#000;color:white;padding:16px;font-weight:bold">Support Chat</div>
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
  const input = document.getElementById("eb-input");
  const send = document.getElementById("eb-send");
  const messages = document.getElementById("eb-messages");

  bubble.onclick = () => {
    box.style.display = box.style.display === "none" ? "flex" : "none";
    if (box.style.display === "flex") {
      input.focus();
    }
  };

  function addMessage(text, isUser) {
    const msg = document.createElement("div");
    msg.style.cssText = `align-self:${isUser ? "flex-end" : "flex-start"};background:${isUser ? "#000" : "#f1f1f1"};color:${isUser ? "white" : "black"};padding:8px 12px;border-radius:12px;max-width:80%;font-size:14px`;
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMessage(text, true);
    addMessage("Skriver...", false);

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, business_id: businessId }),
    });

    const data = await res.json();
    messages.lastChild.textContent = data.answer;
  }

  send.onclick = sendMessage;
  input.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } };
})();