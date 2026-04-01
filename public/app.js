const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const chatBox = document.getElementById("chat-box");

const chatPanel = document.getElementById("chat-panel");
const chatBubble = document.getElementById("chat-bubble");
const chatClose = document.getElementById("chat-close");

const welcomeCard = document.getElementById("welcome-card");
const welcomeClose = document.getElementById("welcome-close");
const openChatBtn = document.getElementById("open-chat-btn");

let sessionId = localStorage.getItem("irfmak_session_id") || null;
let welcomeDismissed = false;

function isIframeMode() {
  return !chatBubble || chatBubble.classList.contains("hidden");
}

function addMessage(text, sender, options = {}) {
  const { showWhatsappButton = false, whatsappLink = null } = options;

  if (!chatBox) return;

  const wrapper = document.createElement("div");
  wrapper.classList.add("message-wrapper", sender);

  const div = document.createElement("div");
  div.classList.add("message", sender);
  div.textContent = text;
  wrapper.appendChild(div);

  if (showWhatsappButton && whatsappLink) {
    const buttonWrap = document.createElement("div");
    buttonWrap.classList.add("separate-button-wrap");

    buttonWrap.innerHTML = `
      <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer">
        <button class="whatsapp-btn" type="button">WhatsApp Business ile devam et</button>
      </a>
    `;

    wrapper.appendChild(buttonWrap);
  }

  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addQuickButtons() {
  if (!chatBox) return;

  const oldQuick = chatBox.querySelector(".quick-buttons");
  if (oldQuick) oldQuick.remove();

  const wrapper = document.createElement("div");
  wrapper.classList.add("quick-buttons");

  const buttons = [
    "Ev tipi dikiş makinesi öner",
    "Sanayi tipi makine arıyorum",
    "Yedek parça lazım",
    "Ödeme sayfasına yönlendir",
    "Yetkiliyle görüşmek istiyorum",
  ];

  buttons.forEach((label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("quick-btn");
    button.textContent = label;

    button.addEventListener("click", () => {
      openChat();
      if (messageInput) {
        messageInput.value = label;
      }
      if (chatForm) {
        chatForm.requestSubmit();
      }
    });

    wrapper.appendChild(button);
  });

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.classList.add("quick-btn");
  resetButton.textContent = "Yeni sohbet";
  resetButton.addEventListener("click", () => {
    resetSession();
    openChat();
  });

  wrapper.appendChild(resetButton);
  chatBox.appendChild(wrapper);
}

function resetSession() {
  sessionId = null;
  localStorage.removeItem("irfmak_session_id");

  if (chatBox) {
    chatBox.innerHTML = "";
  }

  addMessage("Merhaba, size nasıl yardımcı olabilirim?", "bot");
  addQuickButtons();
}

function openChat() {
  if (chatPanel) {
    chatPanel.classList.remove("hidden");
  }

  if (welcomeCard) {
    welcomeCard.classList.add("hidden");
  }

  if (chatBubble) {
    chatBubble.classList.add("chat-bubble-active");
  }

  if (messageInput) {
    messageInput.focus();
  }
}

function closeChat() {
  if (isIframeMode()) return;

  if (chatPanel) {
    chatPanel.classList.add("hidden");
  }

  if (chatBubble) {
    chatBubble.classList.remove("chat-bubble-active");
  }

  if (welcomeCard && !welcomeDismissed) {
    welcomeCard.classList.remove("hidden");
  }
}

function closeWelcomeCard() {
  welcomeDismissed = true;
  if (welcomeCard) {
    welcomeCard.classList.add("hidden");
  }
}

if (chatBubble) {
  chatBubble.addEventListener("click", openChat);
}

if (openChatBtn) {
  openChatBtn.addEventListener("click", openChat);
}

if (chatClose) {
  chatClose.addEventListener("click", closeChat);
}

if (welcomeClose) {
  welcomeClose.addEventListener("click", closeWelcomeCard);
}

resetSession();

if (isIframeMode()) {
  if (chatPanel) {
    chatPanel.classList.remove("hidden");
  }
} else {
  if (chatPanel) {
    chatPanel.classList.add("hidden");
  }
  if (welcomeCard) {
    welcomeCard.classList.remove("hidden");
  }
}

if (chatForm) {
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const message = messageInput ? messageInput.value.trim() : "";
    if (!message) return;

    addMessage(message, "user");

    if (messageInput) {
      messageInput.value = "";
    }

    addMessage("Yazıyor...", "bot");
    const typingMessage = chatBox.lastChild;

    try {
      const response = await fetch("https://brave-compassion-production.up.railway.app/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          sessionId,
        }),
      });

      const data = await response.json();
      if (typingMessage) typingMessage.remove();

      if (data.sessionId) {
        sessionId = data.sessionId;
        localStorage.setItem("irfmak_session_id", sessionId);
      }

      if (data.reply) {
        addMessage(data.reply, "bot", {
          showWhatsappButton: data.showWhatsappButton,
          whatsappLink: data.whatsappLink,
        });
      } else if (data.error) {
        addMessage(`Hata: ${data.error}`, "bot");
      } else {
        addMessage("Bir hata oluştu.", "bot");
      }
    } catch (error) {
      if (typingMessage) typingMessage.remove();
      addMessage("Sohbet sırasında hata oluştu.", "bot");
    }
  });
}