(function () {
  if (window.__IRFMAK_WIDGET_LOADED__) return;
  window.__IRFMAK_WIDGET_LOADED__ = true;

  const API_BASE = "https://brave-compassion-production.up.railway.app";
  const SESSION_STORAGE_KEY = "irfmak_widget_session_id";

  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY) || null;
  let isSending = false;
  let welcomeDismissed = false;

  const style = document.createElement("style");
  style.textContent = `
    :root {
      --irfmak-brand: #a30019;
      --irfmak-brand-dark: #7d0012;
      --irfmak-border: #e5e7eb;
      --irfmak-white: #ffffff;
      --irfmak-success: #25d366;
    }
    .irfmak-widget * { box-sizing: border-box; font-family: Arial, sans-serif; }
    .irfmak-widget .hidden { display: none !important; }
    .irfmak-widget .welcome-card {
      position: fixed; right: 22px; bottom: 96px; width: 300px;
      background: #ffffff; border-radius: 18px;
      box-shadow: 0 14px 34px rgba(0,0,0,0.14);
      z-index: 9999; padding: 16px 16px 14px; border: 1px solid #f1d4da;
    }
    .irfmak-widget .welcome-close {
      position: absolute; top: 8px; right: 10px; width: 28px; height: 28px;
      border: none; background: #fff5f6; border-radius: 999px;
      font-size: 16px; cursor: pointer; color: #6b7280;
    }
    .irfmak-widget .welcome-title {
      font-size: 22px; font-weight: 800; margin-bottom: 8px;
      color: var(--irfmak-brand); line-height: 1.1;
    }
    .irfmak-widget .welcome-text {
      color: #4b5563; line-height: 1.45; margin-bottom: 14px; font-size: 15px;
    }
    .irfmak-widget .welcome-open-btn {
      width: 100%; border: none; border-radius: 12px; padding: 12px 14px;
      background: linear-gradient(135deg, var(--irfmak-brand), var(--irfmak-brand-dark));
      color: white; cursor: pointer; font-size: 15px; font-weight: 700;
    }
    .irfmak-widget .chat-bubble {
      position: fixed; right: 22px; bottom: 22px; width: 66px; height: 66px;
      border: none; border-radius: 999px;
      background: linear-gradient(135deg, var(--irfmak-brand), var(--irfmak-brand-dark));
      color: white; cursor: pointer;
      box-shadow: 0 12px 28px rgba(163,0,25,0.35);
      z-index: 10001; display: flex; align-items: center;
      justify-content: center; overflow: hidden;
    }
    .irfmak-widget .chat-panel {
      position: fixed; right: 22px; bottom: 98px; width: 390px; height: 620px;
      background: var(--irfmak-white); border-radius: 22px;
      box-shadow: 0 22px 48px rgba(0,0,0,0.16); overflow: hidden;
      display: flex; flex-direction: column; z-index: 10000; border: 1px solid #f1d4da;
    }
    .irfmak-widget .chat-header {
      background: linear-gradient(135deg, var(--irfmak-brand), var(--irfmak-brand-dark));
      color: white; padding: 16px 18px; display: flex;
      align-items: flex-start; justify-content: space-between;
    }
    .irfmak-widget .chat-header-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .irfmak-widget .chat-header-subtitle { font-size: 12px; opacity: 0.92; max-width: 270px; line-height: 1.4; }
    .irfmak-widget .chat-close {
      border: none; background: rgba(255,255,255,0.18); color: white;
      font-size: 18px; cursor: pointer; width: 34px; height: 34px; border-radius: 999px;
    }
    .irfmak-widget .chat-box {
      flex: 1; overflow-y: auto; padding: 18px;
      background: linear-gradient(180deg, #fffafb 0%, #fffefe 100%);
    }
    .irfmak-widget .message-wrapper {
      display: flex; flex-direction: column; margin-bottom: 14px;
    }
    .irfmak-widget .message-wrapper.user { align-items: flex-end; }
    .irfmak-widget .message-wrapper.bot { align-items: flex-start; }
    .irfmak-widget .message {
      padding: 12px 16px; line-height: 1.55; max-width: 84%;
      white-space: pre-wrap; font-size: 15px; border-radius: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06); word-break: break-word;
    }
    .irfmak-widget .user.message {
      background: #fdecef; color: #7f1d1d; border-bottom-right-radius: 8px;
    }
    .irfmak-widget .bot.message {
      background: #ffffff; color: #1f2937;
      border: 1px solid #f0d7dd; border-bottom-left-radius: 8px;
    }
    .irfmak-widget .quick-buttons {
      display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; margin-bottom: 6px;
    }
    .irfmak-widget .quick-btn {
      border: 1px solid #efc6cf; background: #fff; border-radius: 999px;
      padding: 9px 13px; cursor: pointer; font-size: 13px; color: var(--irfmak-brand);
    }
    .irfmak-widget .product-links {
      display: flex; flex-direction: column; gap: 8px;
      margin-top: 8px; margin-bottom: 6px;
    }
    .irfmak-widget .product-link {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px; background: #fff5f6; border: 1px solid #efc6cf;
      border-radius: 12px; text-decoration: none; color: #a30019;
      font-size: 13px; font-weight: 600; transition: background 0.2s;
    }
    .irfmak-widget .product-link:hover { background: #ffe8ec; }
    .irfmak-widget .product-link-price {
      white-space: nowrap; margin-left: 8px; font-weight: 700;
    }
    .irfmak-widget .chat-form {
      display: flex; gap: 10px; padding: 14px;
      border-top: 1px solid var(--irfmak-border); background: #fff;
    }
    .irfmak-widget .chat-form input {
      flex: 1; padding: 13px 14px; border: 1px solid #d8d8d8;
      border-radius: 16px; font-size: 15px; outline: none; background: #fff;
    }
    .irfmak-widget .chat-form button {
      padding: 13px 18px; border: none; border-radius: 16px; cursor: pointer;
      font-size: 15px;
      background: linear-gradient(135deg, var(--irfmak-brand), var(--irfmak-brand-dark));
      color: white; font-weight: 700;
    }
    .irfmak-widget .whatsapp-btn {
      padding: 10px 14px; border: none; border-radius: 12px; cursor: pointer;
      background: var(--irfmak-success); color: white; font-weight: 700; margin-top: 8px;
    }
    @media (max-width: 520px) {
      .irfmak-widget .chat-panel {
        right: 10px; left: 10px; width: auto; height: 78vh; bottom: 86px;
      }
      .irfmak-widget .welcome-card {
        right: 10px; left: 10px; width: auto; bottom: 86px;
      }
      .irfmak-widget .chat-bubble { right: 10px; bottom: 14px; }
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = "irfmak-widget";
  root.innerHTML = `
    <div id="irfmak-welcome-card" class="welcome-card">
      <button id="irfmak-welcome-close" class="welcome-close" type="button">×</button>
      <div class="welcome-title">İrfmak Asistan 🤖</div>
      <div class="welcome-text">Merhaba, ben İrfmak Yapay Zeka Asistanıyım, size yardımcı olabilir miyim?</div>
      <button id="irfmak-open-chat-btn" class="welcome-open-btn" type="button">Sohbeti Başlat</button>
    </div>
    <button id="irfmak-chat-bubble" class="chat-bubble" type="button" aria-label="Sohbeti aç">
      <img src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" alt="Robot"
        style="width:80%;height:auto;display:block;margin:auto;">
    </button>
    <div id="irfmak-chat-panel" class="chat-panel hidden">
      <div class="chat-header">
        <div>
          <div class="chat-header-title">İrfmak Asistan</div>
          <div class="chat-header-subtitle">Satın alma, teknik servis ve ürün danışmanı.</div>
        </div>
        <button id="irfmak-chat-close" class="chat-close" type="button">×</button>
      </div>
      <div id="irfmak-chat-box" class="chat-box"></div>
      <form id="irfmak-chat-form" class="chat-form">
        <input id="irfmak-message-input" type="text" placeholder="Mesajınızı yazın..." autocomplete="off">
        <button type="submit">Gönder</button>
      </form>
    </div>
  `;
  document.body.appendChild(root);

  const chatForm = document.getElementById("irfmak-chat-form");
  const messageInput = document.getElementById("irfmak-message-input");
  const chatBox = document.getElementById("irfmak-chat-box");
  const chatPanel = document.getElementById("irfmak-chat-panel");
  const chatBubble = document.getElementById("irfmak-chat-bubble");
  const chatClose = document.getElementById("irfmak-chat-close");
  const welcomeCard = document.getElementById("irfmak-welcome-card");
  const welcomeClose = document.getElementById("irfmak-welcome-close");
  const openChatBtn = document.getElementById("irfmak-open-chat-btn");

  function scrollChatToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function addMessage(text, sender, options = {}) {
    const showWhatsappButton = options.showWhatsappButton || false;
    const whatsappLink = options.whatsappLink || null;

    const wrapper = document.createElement("div");
    wrapper.classList.add("message-wrapper", sender);

    const div = document.createElement("div");
    div.classList.add("message", sender);
    div.textContent = text;
    wrapper.appendChild(div);

    if (showWhatsappButton && whatsappLink) {
      const link = document.createElement("a");
      link.href = whatsappLink;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const button = document.createElement("button");
      button.className = "whatsapp-btn";
      button.type = "button";
      button.textContent = "WhatsApp Business ile devam et";

      link.appendChild(button);
      wrapper.appendChild(link);
    }

    chatBox.appendChild(wrapper);
    scrollChatToBottom();
    return wrapper;
  }

  function addProductLinks(products) {
    if (!products || !products.length) return;

    const wrapper = document.createElement("div");
    wrapper.classList.add("product-links");

    products.forEach(function (p) {
      const link = document.createElement("a");
      link.href = p.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.classList.add("product-link");
      link.innerHTML = `
        <span>${p.title}</span>
        <span class="product-link-price">${p.price} →</span>
      `;
      wrapper.appendChild(link);
    });

    chatBox.appendChild(wrapper);
    scrollChatToBottom();
  }

  function addQuickButtons() {
    const old = chatBox.querySelector(".quick-buttons");
    if (old) old.remove();

    const wrapper = document.createElement("div");
    wrapper.classList.add("quick-buttons");

    const buttons = [
      "Singer ev tipi dikiş makinesi öner",
      "Pfaff ev tipi dikiş makinesi öner",
      "Singer sanayi tipi makine öner",
      "Singer overlok makinesi öner",
      "Pfaff overlok makinesi öner",
      "Yetkiliyle görüşmek istiyorum"
    ];
    

    buttons.forEach(function (label) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.add("quick-btn");
      button.textContent = label;
      button.addEventListener("click", async function () {
        openChat();
        messageInput.value = label;
        await submitCurrentMessage();
      });
      wrapper.appendChild(button);
    });

    chatBox.appendChild(wrapper);
  }

  function resetSession() {
    sessionId = null;
    localStorage.removeItem(SESSION_STORAGE_KEY);
    chatBox.innerHTML = "";
    addMessage("Merhaba, size nasıl yardımcı olabilirim?", "bot");
    addQuickButtons();
  }

  function openChat() {
    chatPanel.classList.remove("hidden");
    welcomeCard.classList.add("hidden");
    messageInput.focus();
  }

  function closeChat() {
    chatPanel.classList.add("hidden");
    if (!welcomeDismissed) {
      welcomeCard.classList.remove("hidden");
    }
  }

  function closeWelcomeCard() {
    welcomeDismissed = true;
    welcomeCard.classList.add("hidden");
  }

  async function sendMessage(message) {
    if (!message || isSending) return;

    isSending = true;
    addMessage(message, "user");

    const typingMessage = addMessage("Yazıyor...", "bot");
    messageInput.value = "";
    messageInput.disabled = true;

    const submitButton = chatForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(API_BASE + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message, sessionId: sessionId })
      });

      const rawText = await response.text();
      console.log("CHAT RAW RESPONSE:", rawText);

      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (e) {
        throw new Error("Sunucu JSON dönmedi: " + rawText);
      }

      if (!response.ok) {
        throw new Error(data.error || "HTTP " + response.status);
      }

      if (typingMessage && typingMessage.parentNode) {
        typingMessage.parentNode.removeChild(typingMessage);
      }

      if (data.sessionId) {
        sessionId = data.sessionId;
        localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      }

      if (data.reply) {
        addMessage(data.reply, "bot", {
          showWhatsappButton: !!data.showWhatsappButton,
          whatsappLink: data.whatsappLink || null
        });

        if (data.productLinks && data.productLinks.length) {
          addProductLinks(data.productLinks);
        }
      } else {
        addMessage("Boş cevap geldi", "bot");
      }

    } catch (error) {
      console.error("CHAT HATASI:", error);
      if (typingMessage && typingMessage.parentNode) {
        typingMessage.parentNode.removeChild(typingMessage);
      }
      addMessage("HATA: " + error.message, "bot");
    } finally {
      isSending = false;
      messageInput.disabled = false;
      if (submitButton) submitButton.disabled = false;
      messageInput.focus();
      scrollChatToBottom();
    }
  }

  async function submitCurrentMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    await sendMessage(message);
  }

  chatBubble.addEventListener("click", openChat);
  openChatBtn.addEventListener("click", openChat);
  chatClose.addEventListener("click", closeChat);
  welcomeClose.addEventListener("click", closeWelcomeCard);

  chatForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    await submitCurrentMessage();
  });

  resetSession();
  chatPanel.classList.add("hidden");
})();