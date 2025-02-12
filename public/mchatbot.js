
const COPYSVG = `<svg width="16" height="16" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" class="copy-button"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 5C7 3.34315 8.34315 2 10 2H19C20.6569 2 22 3.34315 22 5V14C22 15.6569 20.6569 17 19 17H17V19C17 20.6569 15.6569 22 14 22H5C3.34315 22 2 20.6569 2 19V10C2 8.34315 3.34315 7 5 7H7V5ZM9 7H14C15.6569 7 17 8.34315 17 10V15H19C19.5523 15 20 14.5523 20 14V5C20 4.44772 19.5523 4 19 4H10C9.44772 4 9 4.44772 9 5V7ZM5 9C4.44772 9 4 9.44772 4 10V19C4 19.5523 4.44772 20 5 20H14C14.5523 20 15 19.5523 15 19V10C15 9.44772 14.5523 9 14 9H5Z" fill="currentColor"></path></svg>`;

class MChatBotWidget extends HTMLElement {
  constructor() {
    super();
    this.chatWindow = null;
    this.toggleButton = null;
    this.messageList = null;
    this.inputForm = null;
    this.resizeHandle = null;
    this.themeColor = "#701FAB";
    this.isDarkMode = false;
    this.isMinimized = false;
    this.isStarted = false; // Change to false to show starter form
    this.userEmail = "";
    this.userName = "";
    this.userId = null;
    this.apiEndpoint = "http://localhost:5555/api/mchatbot";
    this.socketPath = "ws://localhost:5555";
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.userEmail = this.getAttribute("email") || "";
    this.userName = this.getAttribute("name") || "";
    this.render();
    this.setupEventListeners();
  }

  static get observedAttributes() {
    return ["theme-color", "dark-mode", "email", "name"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "theme-color") {
      this.themeColor = newValue;
      this.updateTheme();
    } else if (name === "dark-mode") {
      this.isDarkMode = newValue === "true";
      this.updateTheme();
    } else if (name === "email") {
      this.userEmail = newValue;
      const emailInput = this.shadowRoot?.querySelector('input[type="email"]');
      if (emailInput) emailInput.value = newValue;
    } else if (name === "name") {
      this.userName = newValue;
      const nameInput = this.shadowRoot?.querySelector('input[name="name"]');
      if (nameInput) nameInput.value = newValue;
    }
  }

  getStarterFormHTML() {
    return `
      <form class="starter-form">
        <h2 class="form-title">Start a Conversation</h2>
        <div class="form-field">
          <label for="email">Email *</label>
          <input type="email" id="email" name="email" required value="${this.userEmail}" 
            placeholder="Enter your email">
        </div>
        <div class="form-field">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" value="${this.userName}"
            placeholder="Enter your name">
        </div>
        <div class="form-field">
          <label for="message">Message *</label>
          <textarea id="message" name="message" required rows="3" 
            placeholder="What would you like to discuss?"></textarea>
        </div>
        <button type="submit" class="start-button">Start Chat</button>
      </form>
    `;
  }

  getChatInterfaceHTML() {
    return `
      <div class="chatbot-messages">
          
      </div>
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
    `;
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
          --chat-input-bg: ${this.isDarkMode ? "#2a2a2a" : "#f8f8f8"};
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
        .chatbot-header {
          background-color: var(--theme-color);
          color: #fff;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 1;
        }
        .chatbot-toggle {
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          font-size: 20px;
          padding: 5px;
        }
        .chatbot-content {
          flex-grow: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        /* Starter Form Styles */
        .starter-form {
          padding: 20px;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--text-color);
          margin: 0;
          text-align: center;
        }
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-field label {
          font-size: 0.9rem;
          color: var(--text-color);
        }
        .form-field input,
        .form-field textarea {
          padding: 8px 12px;
          border: 1px solid ${this.isDarkMode ? "#555" : "#ddd"};
          border-radius: 6px;
          background-color: ${this.isDarkMode ? "#444" : "#fff"};
          color: var(--text-color);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-field input:focus,
        .form-field textarea:focus {
          border-color: var(--theme-color);
        }
        .form-field textarea {
          resize: none;
        }
        .start-button {
          background-color: var(--theme-color);
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
          transition: opacity 0.2s;
          margin-top: auto;
        }
        .start-button:hover {
          opacity: 0.9;
        }
        .start-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        /* Rest of the existing styles */
        ${this.getExistingStyles()}
      </style>
      <div class="chatbot-container">
        <div class="resize-handle"></div>
        <div class="chatbot-header">
          <span>mChatBot</span>
          <button class="chatbot-toggle">−</button>
        </div>
        <div class="chatbot-content">
          ${
            this.isStarted
              ? this.getChatInterfaceHTML()
              : this.getStarterFormHTML()
          }
        </div>
        <div class="floating-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
      </div>
    `;

    this.chatWindow = this.shadowRoot.querySelector(".chatbot-container");
    this.toggleButton = this.shadowRoot.querySelector(".chatbot-toggle");
    this.messageList = this.shadowRoot.querySelector(".chatbot-messages");
    this.inputForm = this.shadowRoot.querySelector(".chatbot-input");
    this.resizeHandle = this.shadowRoot.querySelector(".resize-handle");

    // if (this.isStarted) {
    //   this.connectWebSocket();
    // }
  }

  getExistingStyles() {
    return `
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
      .chatbot-messages {
        flex-grow: 1;
        overflow-y: auto;
        padding: 10px;
      }
      .message {
        max-width: 80%;
        margin-bottom: 25px;
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
        padding: 0 12px;
        /* background-color: var(--message-bg-bot); */
        
        color: var(--text-color);
        align-self: flex-start;
      }
      .message-tool {
        font-size: 0.7em;
        color: #888;
        position: absolute;
        bottom: -25px;
        display: flex;
        gap: 1em;
        align-items:center;
      }
      .message.user .message-tool {
       right:0;
       bottom:-30px;
      }
       .message-tool .tool-button{
        display: flex;
        cursor: pointer;
        padding: 5px;
        border:none;
        background:none;
        color:#888;
      }
      .message a{
        color: var(--text-color);
        font-style: italic;
      }
      .message-tool .tool-button:hover {
          background-color: var(--chat-input-bg);
          border-radius: 5px;
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
        padding: 20px;
        background-color: var(--chat-input-bg);
        border-top: 1px solid ${this.isDarkMode ? "#444" : "#eee"};
      }
      .input-container {
        position: relative;
        margin-bottom: 8px;
      }
      .chatbot-input textarea {
        width: 100%;
        
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
      .chatbot-container.minimized .chatbot-content,
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
    `;
  }

  setupEventListeners() {
    this.toggleButton.addEventListener("click", () => this.toggleChat());
    this.shadowRoot
      .querySelector(".floating-icon")
      .addEventListener("click", () => this.toggleChat());

    const starterForm = this.shadowRoot.querySelector(".starter-form");
    if (starterForm) {
      starterForm.addEventListener("submit", (e) =>
        this.handleStarterSubmit(e)
      );
    }

    if (this.isStarted) {
      this.inputForm.addEventListener("submit", (e) => this.handleSubmit(e));
      const textarea = this.inputForm.querySelector("textarea");
      textarea.addEventListener("keydown", (e) => this.handleKeyDown(e));

      // this.shadowRoot
      //   .querySelector(".tool-button.copy")
      //   .addEventListener("click", () => console.log("copy button clicked"));
    }

    this.setupResizeListener();
  }

  toggleChat() {
    this.isMinimized = !this.isMinimized;
    this.chatWindow.classList.toggle("minimized");
    this.toggleButton.textContent = this.isMinimized ? "+" : "−";
  }

  async handleStarterSubmit(e) {
    e.preventDefault();

    const getClientIP = async () => {
      try {
        const response = await fetch("https://api64.ipify.org?format=json");
        const data = await response.json();
        return data.ip;
      } catch (error) {
        console.error("IP fetch failed:", error);
        return null;
      }
    };
    const form = e.target;
    const formData = new FormData(form);

    const email = formData.get("email");
    const name = formData.get("name");
    const message = formData.get("message");
    const domain = window.location.hostname;
    const user_agent = navigator.userAgent;
    const ip_address = await getClientIP();
    try {
      const response = await fetch(`${this.apiEndpoint}/start-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name,
          message,
          domain,
          user_agent,
          ip_address,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start chat");
      }
      const data = await response.json();
      this.userId = data.userId;
      this.userEmail = email;
      this.userName = name;

      this.isStarted = true;
      this.render();
      this.connectWebSocket(message);
      // if (this.isStarted) {
      // }
      this.setupEventListeners();

      // this.sendMessage(message);
    } catch (error) {
      console.error("Failed to start chat:", error);
    }
  }

  handleSubmit(e) {
    e.preventDefault();
    const textarea = this.inputForm.querySelector("textarea");
    const message = textarea.value.trim();
    if (message) {
      this.sendMessage(message);
      textarea.value = "";
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
    const contentWrapper = document.createElement("div");
    contentWrapper.classList.add("message-content");
    contentWrapper.innerHTML =content
    messageElement.appendChild(contentWrapper);

    const toolElement = document.createElement("div");
    toolElement.classList.add("message-tool");
    const toolButton = document.createElement("button");
    toolButton.classList.add("tool-button", "copy");
    toolButton.addEventListener("click", function (event) {
       const messageContent = event.target
         .closest(".message")
         .querySelector(".message-content"); // Get message text
        if (messageContent) {
          navigator.clipboard
            .writeText(messageContent.textContent.trim())
            .then(() => console.log("Message copied!"))
            .catch((err) => console.error("Copy failed", err));
        }
    });
    toolButton.innerHTML = COPYSVG;
    toolElement.appendChild(toolButton);
    const timeElement = document.createElement("span");
    timeElement.classList.add("message-time");
    timeElement.textContent = new Date().toLocaleTimeString();
    toolElement.appendChild(timeElement);
    messageElement.appendChild(toolElement);

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

  connectWebSocket(firstMessage = null) {
    this.ws = new WebSocket(`${this.socketPath}?userId=${this.userId}`);

    this.ws.onopen = () => {
      console.log("✅ WebSocket Connected");
      if (firstMessage) {
        this.sendMessage(firstMessage);
      }
    };
    this.ws.onerror = (error) => console.error("❌ WebSocket Error:", error);
    this.ws.onclose = () => {
      console.log("🔄 WebSocket Disconnected. Attempting to Reconnect...");
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.ws.onmessage = (event) => {
      this.addMessage("bot", event.data);
    };
  }

  sendMessage(message) {
    this.addMessage("user", message);

    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ message, userId: this.userId }));
    } else {
      console.warn("⚠️ WebSocket is not connected. Retrying...");
      setTimeout(() => this.sendMessage(message), 1000);
    }
  }
}

customElements.define("mchatbot-widget", MChatBotWidget);
