class MChatBotWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // Get user-defined properties
    const themeColor = this.getAttribute("theme-color") || "#6200ea"; // Default purple
    const foregroundColor = this.getAttribute("foreground-color") || "#ffffff"; // Default white
    const darkMode = this.getAttribute("dark-mode") === "true"; // Default false

    // Styling for chatbot
    const style = document.createElement("style");
    style.textContent = `
      :host {
        --theme-color: ${themeColor};
        --foreground-color: ${foregroundColor};
        --background-color: ${darkMode ? "#222" : "#fff"};
        --text-color: ${darkMode ? "#fff" : "#333"};
      }
      .chatbot-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 300px;
        height: 400px;
        background: var(--background-color);
        border-radius: 10px;
        box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        border: 2px solid var(--theme-color);
        font-family: Arial, sans-serif;
      }
      .chat-header {
        background: var(--theme-color);
        color: var(--foreground-color);
        padding: 10px;
        text-align: center;
        font-size: 16px;
        font-weight: bold;
      }
      .chat-body {
        flex: 1;
        padding: 10px;
        overflow-y: auto;
        color: var(--text-color);
      }
      .chat-input {
        display: flex;
        border-top: 1px solid #ccc;
        padding: 10px;
        background: var(--background-color);
      }
      input {
        flex: 1;
        padding: 8px;
        border: 1px solid var(--theme-color);
        border-radius: 4px;
        outline: none;
      }
      button {
        background: var(--theme-color);
        color: var(--foreground-color);
        border: none;
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        margin-left: 5px;
      }
    `;

    // HTML structure for chatbot
    const chatbotContainer = document.createElement("div");
    chatbotContainer.classList.add("chatbot-container");

    chatbotContainer.innerHTML = `
      <div class="chat-header">mChatBot</div>
      <div class="chat-body">
        <p>Welcome to mChatBot! How can I help you?</p>
      </div>
      <div class="chat-input">
        <input type="text" placeholder="Type a message..." />
        <button>Send</button>
      </div>
    `;

    // Append styles and chatbot to Shadow DOM
    this.shadowRoot.append(style, chatbotContainer);

    // Connect WebSocket
    this.connectWebSocket();

    // Handle send button click
    this.shadowRoot.querySelector("button").addEventListener("click", () => {
      const input = this.shadowRoot.querySelector("input");
      const message = input.value.trim();
      if (message) {
        this.sendMessage(message);
        input.value = "";
      }
    });
  }

  connectWebSocket() {
    this.ws = new WebSocket("ws://localhost:5555");

    this.ws.onopen = () => console.log("✅ WebSocket Connected");
    this.ws.onerror = (error) => console.error("❌ WebSocket Error:", error);
    this.ws.onclose = () => {
      console.log("🔄 WebSocket Disconnected. Attempting to Reconnect...");
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    // WebSocket Message Handler
    this.ws.onmessage = (event) => {
      const chatBody = this.shadowRoot.querySelector(".chat-body");
      const botMessage = document.createElement("p");
      botMessage.textContent = `Bot: ${event.data}`;
      chatBody.appendChild(botMessage);
      chatBody.scrollTop = chatBody.scrollHeight; // Auto-scroll
    };
  }

  sendMessage(message) {
    const chatBody = this.shadowRoot.querySelector(".chat-body");
    const userMessage = document.createElement("p");
    userMessage.textContent = `User: ${message}`;
    chatBody.appendChild(userMessage);
    chatBody.scrollTop = chatBody.scrollHeight;

    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      console.warn("⚠️ WebSocket is not connected. Retrying...");
      setTimeout(() => this.sendMessage(message), 1000);
    }
  }
}

// Register the custom element
customElements.define("mchatbot-widget", MChatBotWidget);
