document.addEventListener("DOMContentLoaded", () => {
  const chatbotHtml = `
    <button class="chatbot-toggle" id="chatbotToggle" aria-label="Open chat">
      💬
    </button>

    <section class="chatbot-panel" id="chatbotPanel">
      <div class="chatbot-header">
        <h3>Metal Minds Assistant</h3>
        <p>Ask about products, quotes, and enquiries.</p>
      </div>

      <div class="chatbot-messages" id="chatbotMessages"></div>

      <div class="chatbot-actions">
        <a class="whatsapp-btn" id="whatsappBtn" href="#" target="_blank" rel="noopener noreferrer">
          Continue on WhatsApp
        </a>
      </div>

      <div class="chatbot-input-row">
        <input
          class="chatbot-input"
          id="chatbotInput"
          type="text"
          placeholder="Type your message..."
        />
        <button class="chatbot-send" id="chatbotSend">Send</button>
      </div>
    </section>
  `;

  document.body.insertAdjacentHTML("beforeend", chatbotHtml);

  const toggle = document.getElementById("chatbotToggle");
  const panel = document.getElementById("chatbotPanel");
  const messagesBox = document.getElementById("chatbotMessages");
  const input = document.getElementById("chatbotInput");
  const sendBtn = document.getElementById("chatbotSend");
  const whatsappBtn = document.getElementById("whatsappBtn");

  const chatHistory = [];

  function addMessage(role, text) {
    const msg = document.createElement("div");
    msg.className = `chat-msg ${role === "user" ? "user" : "bot"}`;
    msg.textContent = text;
    messagesBox.appendChild(msg);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function buildWhatsAppLink(lastUserMessage = "Hello Metal Minds, I would like more information.") {
    const whatsappNumber = "447763724762"; // Replace with your WhatsApp number in international format
    const text = encodeURIComponent(
      `Hi Metal Minds, I need help with this enquiry: ${lastUserMessage}`
    );
    return `https://wa.me/${whatsappNumber}?text=${text}`;
  }

  function updateWhatsAppButton(lastUserMessage) {
    whatsappBtn.href = buildWhatsAppLink(lastUserMessage);
  }

  async function sendMessage() {
    const text = input.value.trim();

    if (!text) return;

    input.value = "";
    sendBtn.disabled = true;
    sendBtn.textContent = "...";

    addMessage("user", text);

    chatHistory.push({
      role: "user",
      content: text
    });

    updateWhatsAppButton(text);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: chatHistory
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Chat failed.");
      }

      const reply = data.reply || "Please contact us on WhatsApp for assistance.";

      addMessage("assistant", reply);

      chatHistory.push({
        role: "assistant",
        content: reply
      });
    } catch (error) {
      console.error("Chatbot request failed:", error);

      addMessage(
        "assistant",
        "I could not respond right now. Please continue on WhatsApp and our team will help you."
      );
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
      input.focus();
    }
  }

  toggle.addEventListener("click", () => {
    panel.classList.toggle("show");

    if (panel.classList.contains("show")) {
      input.focus();
    }
  });

  sendBtn.addEventListener("click", sendMessage);

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  });

  addMessage(
    "assistant",
    "Hi! I’m the Metal Minds assistant. Ask me about products, quotes, or what information you need before ordering."
  );

  updateWhatsAppButton();
});