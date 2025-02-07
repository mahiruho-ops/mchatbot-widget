class MChatBotWidget extends HTMLElement {
  constructor() {
    super();
    this.chatWindow = null;
    this.toggleButton = null;
    this.messageList = null;
    this.inputForm = null;
    this.resizeHandle = null;
    this.themeColor = "#007bff";
    this.isDarkMode = false;
    this.isMinimized = false;
    this.attachShadow({ mode: "open" });
  }

  // connectedCallback() is a lifecycle method in Web Components that is automatically called by the browser
// when the custom element is added to the DOM (document). The sequence is:
// 1. When <mchatbot-widget> element is added to a page
// 2. Browser creates instance and calls constructor() 
// 3. Then browser calls this connectedCallback()
// This method initializes the chat widget by:
// - Calling render() to create the HTML structure
// - Setting up event listeners via setupEventListeners()
connectedCallback() {
    this.render();
    this.setupEventListeners();
}
  static get observedAttributes() {
    return ["theme-color", "dark-mode"];
  }

  // attributeChangedCallback() is a lifecycle method in Web Components that is called whenever 
// an observed attribute (defined in observedAttributes) is added, removed, updated, or replaced.
// The method receives:
// - name: The name of the changed attribute
// - oldValue: The previous value of the attribute
// - newValue: The new value of the attribute
attributeChangedCallback(name, oldValue, newValue) {
    if (name === "theme-color") {
      this.themeColor = newValue;
      this.updateTheme();
    } else if (name === "dark-mode") {
      this.isDarkMode = newValue === "true";
      this.updateTheme();
    }
  }

  render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --theme-color: ${this.themeColor};
          --bg-color: ${this.isDarkMode ? "#333" : "#fff"};
          --text-color: ${this.isDarkMode ? "#fff" : "#333"};
          --message-bg-user: ${this.isDarkMode ? "#4a4a4a" : "#e6e6e6"};
          --message-bg-bot: var(--theme-color);
          font-family: Arial, sans-serif;
        }
        .chatbot-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          min-width: 350px;
          width: 380px;
          height: 500px;
          background-color: var(--bg-color);
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: all 0.3s ease;
          border: 2px solid var(--theme-color);
        }
        .resize-handle {
          position: absolute;
          left: -2px;
          top: 0;
          width: 4px;
          height: 100%;
          cursor: ew-resize;
          background-color: transparent;
        }
        .resize-handle::after {
          content: "⋮|";
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          color: var(--theme-color);
          font-size: 30px;
          opacity: 0.5;
          transition: opacity 0.2s;
        }
        .resize-handle:hover::after {
          opacity: 1;
        }
        .chatbot-container.minimized {
          min-width: 80px;
          width: 80px !important;
          height: 80px;
          border-radius: 50%;
          border: none;
        }
        .chatbot-header {
          background-color: var(--theme-color);
          color: #fff;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .chatbot-toggle {
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          font-size: 20px;
          padding: 5px;
        }
        .chatbot-messages {
          flex-grow: 1;
          overflow-y: auto;
          padding: 10px;
        }
        .message {
          max-width: 80%;
          margin-bottom: 20px;
          padding: 8px 12px;
          border-radius: 18px;
          line-height: 1.4;
          position: relative;
          animation: bubble-in 0.5s ease-out;
        }
        @keyframes bubble-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .message.user {
          background-color: var(--message-bg-user);
          color: var(--text-color);
          align-self: flex-end;
          margin-left: auto;
        }
        .message.bot {
          background-color: var(--message-bg-bot);
          color: #fff;
          align-self: flex-start;
        }
        .message-time {
          font-size: 0.7em;
          color: #888;
          position: absolute;
          bottom: -18px;
          right: 0;
        }
        .new-day-divider {
          text-align: center;
          margin: 20px 0;
          color: #888;
          font-size: 0.8em;
        }
        .chatbot-input {
          display: flex;
          flex-direction: column;
          padding: 15px;
          background-color: ${this.isDarkMode ? "#2a2a2a" : "#f8f8f8"};
          border-top: 1px solid ${this.isDarkMode ? "#444" : "#eee"};
        }
        .input-container {
          position: relative;
          margin-bottom: 8px;
        }
        .chatbot-input textarea {
          width: 100%;
          padding: 10px;
          background-color: transparent;
          border: none;
          resize: none;
          outline: none;
          color: var(--text-color);
          font-family: inherit;
          font-size: 14px;
          line-height: 1.5;
        }
        .chatbot-input textarea::placeholder {
          color: #999;
        }
        .button-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 5px;
        }
        .attach-button, .send-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 5px;
          color: var(--theme-color);
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .submit-info {
          font-size: 0.8em;
          color: #888;
          text-align: center;
        }
        .floating-icon {
          display: none;
          width: 80px;
          height: 80px;
          background-color: var(--theme-color);
          border-radius: 50%;
          justify-content: center;
          align-items: center;
          color: #fff;
          font-size: 24px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .chatbot-container.minimized .floating-icon {
          display: flex;
        }
        .chatbot-container.minimized .chatbot-header,
        .chatbot-container.minimized .chatbot-messages,
        .chatbot-container.minimized .chatbot-input,
        .chatbot-container.minimized .resize-handle {
          display: none;
        }
        @media (max-width: 480px) {
          .chatbot-container {
            width: 100%;
            height: 100%;
            bottom: 0;
            right: 0;
            border-radius: 0;
          }
          .submit-info {
            display: none;
          }
          .resize-handle {
            display: none;
          }
        }
      </style>
      <div class="chatbot-container">
        <div class="resize-handle"></div>
        <div class="chatbot-header">
          <span>Chatbot</span>
          <button class="chatbot-toggle">−</button>
        </div>
        <div class="chatbot-messages"></div>
        <form class="chatbot-input">
          <div class="input-container">
            <textarea rows="3" placeholder="Type a message..."></textarea>
          </div>
          <div class="button-container">
            <button type="button" class="attach-button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <div class="submit-info">Press Ctrl + Enter to send</div>
            <button type="submit" class="send-button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </form>
        <div class="floating-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
      </div>
    `;
    this.connectWebSocket();
    this.chatWindow = this.shadowRoot.querySelector(".chatbot-container");
    this.toggleButton = this.shadowRoot.querySelector(".chatbot-toggle");
    this.messageList = this.shadowRoot.querySelector(".chatbot-messages");
    this.inputForm = this.shadowRoot.querySelector(".chatbot-input");
    this.resizeHandle = this.shadowRoot.querySelector(".resize-handle");
  }

  setupEventListeners() {
    this.toggleButton.addEventListener("click", () => this.toggleChat());
    this.inputForm.addEventListener("submit", (e) => this.handleSubmit(e));
    this.shadowRoot
      ?.querySelector(".floating-icon")
      ?.addEventListener("click", () => this.toggleChat());

    const textarea = this.inputForm.querySelector("textarea");
    textarea.addEventListener("keydown", (e) => this.handleKeyDown(e));

    this.setupResizeListener();
  }

  toggleChat() {
    this.isMinimized = !this.isMinimized;
    this.chatWindow.classList.toggle("minimized");
    this.toggleButton.textContent = this.isMinimized ? "+" : "−";
  }

  handleSubmit(e) {
    e.preventDefault();
    const textarea = this.inputForm.querySelector("textarea");
    const message = textarea.value.trim();
    if (message) {
      this.sendMessage(message);
      // this.addMessage("user", message);
      textarea.value = "";
      // // Simulate bot response
      // setTimeout(() => {
      //   this.addMessage("bot", `You said: ${message}`);
      // }, 1000);
    }
  }

  handleKeyDown(e) {
    if (e.key === "Enter") {
      if (e.ctrlKey) {
        this.handleSubmit(e);
      } else {
        e.preventDefault();
        const textarea = e.target;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        textarea.value =
          value.substring(0, start) + "\n" + value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }
    }
  }

  setupResizeListener() {
    let isResizing = false;
    let startX;
    let startWidth;

    const startResize = (e) => {
      e.preventDefault();
      isResizing = true;
      startX = e.clientX;
      startWidth = Number.parseInt(getComputedStyle(this.chatWindow).width, 10);
      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResize);
    };

    const resize = (e) => {
      if (!isResizing) return;
      const width = startWidth - (e.clientX - startX);
      if (width >= 350) {
        this.chatWindow.style.width = `${width}px`;
      }
    };

    const stopResize = () => {
      isResizing = false;
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResize);
    };

    this.resizeHandle.addEventListener("mousedown", startResize);
  }

  addMessage(sender, content) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", sender);
    messageElement.textContent = content;

    const timeElement = document.createElement("span");
    timeElement.classList.add("message-time");
    timeElement.textContent = new Date().toLocaleTimeString();
    messageElement.appendChild(timeElement);

    this.messageList.appendChild(messageElement);
    this.messageList.scrollTop = this.messageList.scrollHeight;

    this.addNewDayDividerIfNeeded();
  }

  addNewDayDividerIfNeeded() {
    const messages = this.messageList.querySelectorAll(".message");
    if (messages.length < 2) return;

    const lastMessage = messages[messages.length - 1];
    const secondLastMessage = messages[messages.length - 2];
    const lastDate = new Date(
      lastMessage.querySelector(".message-time").textContent
    );
    const secondLastDate = new Date(
      secondLastMessage.querySelector(".message-time").textContent
    );

    if (lastDate.toDateString() !== secondLastDate.toDateString()) {
      const divider = document.createElement("div");
      divider.classList.add("new-day-divider");
      divider.textContent = lastDate.toDateString();
      this.messageList.insertBefore(divider, lastMessage);
    }
  }

  updateTheme() {
    if (this.shadowRoot) {
      const style = document.createElement("style");
      style.textContent = `
        :host {
          --theme-color: ${this.themeColor};
          --bg-color: ${this.isDarkMode ? "#333" : "#fff"};
          --text-color: ${this.isDarkMode ? "#fff" : "#333"};
          --message-bg-user: ${this.isDarkMode ? "#4a4a4a" : "#e6e6e6"};
        }
      `;
      this.shadowRoot.appendChild(style);
    }
  }
  connectWebSocket() {
    this.ws = new WebSocket("ws://localhost:5000");

    this.ws.onopen = () => console.log("✅ WebSocket Connected");
    this.ws.onerror = (error) => console.error("❌ WebSocket Error:", error);
    this.ws.onclose = () => {
      console.log("🔄 WebSocket Disconnected. Attempting to Reconnect...");
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    // WebSocket Message Handler
    this.ws.onmessage = (event) => {
      console.log(event);
      this.addMessage("bot", event.data);
      // const chatBody = this.shadowRoot.querySelector(".chat-body");
      // const botMessage = document.createElement("p");
      // botMessage.textContent = `Bot: ${event.data}`;
      // chatBody.appendChild(botMessage);
      // chatBody.scrollTop = chatBody.scrollHeight; // Auto-scroll
    };
  }
  sendMessage(message) {
    this.addMessage("user", message);
    // const chatBody = this.shadowRoot.querySelector(".chat-body");
    // const userMessage = document.createElement("p");
    // userMessage.textContent = `User: ${message}`;
    // chatBody.appendChild(userMessage);
    // chatBody.scrollTop = chatBody.scrollHeight;

    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      console.warn("⚠️ WebSocket is not connected. Retrying...");
      setTimeout(() => this.sendMessage(message), 1000);
    }
  }
}

customElements.define("mchatbot-widget", MChatBotWidget);

