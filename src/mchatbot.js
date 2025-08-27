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
    this.isStarted = false;
    this.userEmail = "";
    this.userName = "";
    this.userId = null;
    this.sessionId = null;
    this.sessionMode = "session"; // default value
    this.storage = window.localStorage; // default storage
    this.widgetHeight = "70%"; // default height
    this.widgetPosition = "bottom-right"; // default position
    this.mode = "chat";
    const is_ssl = import.meta.env.VITE_IS_SSL === "true";
    const api_domain = import.meta.env.VITE_API_DOMAIN;
    this.apiEndpoint = `${is_ssl ? "https" : "http"}://${api_domain}/mchatbot/public`;
    this.socketPath = `${is_ssl ? "wss" : "ws"}://${api_domain}/ws`;
    this.errorMessage = "";
    
         // Voice recording properties
     this.audioRecorder = null;
     this.isRecording = false;
     this.recordingStartTime = 0;
     this.recordingTimer = null;
     this.countdownTimer = null;
     this.maxRecordingTime = 30000; // 30 seconds
     this.countdownTime = 3000; // 3 seconds
     
     // WebSocket management
     this.isIntentionalClose = false;
    
    this.attachShadow({ mode: "open" });
    this.domain_name = window.location.hostname === "localhost" ? "mahiruho.com" : window.location.hostname;
  }

  connectedCallback() {
    this.userEmail = this.getAttribute("email") || "";
    this.userName = this.getAttribute("name") || "";
    this.sessionMode = this.getAttribute("session-mode") || "session";
    this.widgetHeight = this.getAttribute("height") || "70%";
    this.widgetPosition = this.getAttribute("position") || "bottom-right";
    this.storage = this.sessionMode === "global" ? window.localStorage : window.sessionStorage;
    this.initializeSession();
  }

  static get observedAttributes() {
    return ["theme-color", "dark-mode", "email", "name", "session-mode", "height", "position"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "session-mode") {
      this.sessionMode = newValue || "global";
      this.storage = this.sessionMode === "global" ? window.localStorage : window.sessionStorage;
      this.initializeSession();
    } else if (name === "theme-color") {
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
    } else if (name === "height") {
      this.widgetHeight = newValue || "70%";
      this.updateHeight();
    } else if (name === "position") {
      this.widgetPosition = newValue || "bottom-right";
      this.updatePosition();
    }
  }

  async initializeSession() {
    const storedSessionId = this.storage.getItem('mchatbot_session_id');
    if (storedSessionId) {
      try {
        const response = await fetch(`${this.apiEndpoint}/session/${storedSessionId}?domain=${this.domain_name}`,{
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Session retrieval failed');
        }

        const data = await response.json();
        
        if (data.error || data.expired) {
          // Handle error or expired session
          this.storage.removeItem('mchatbot_session_id');
          this.startNewSession();
          return;
        }

        // Session is valid, restore the chat
        this.userId = data.user_id;
        this.userEmail = data.user_email;
        
        this.sessionId = data.id;
        this.isStarted = true;
        
        // Load conversation history
        if (data.messages && Array.isArray(data.messages)) {
          this.render();
          this.setupEventListeners();
          this.connectWebSocket(null, this.mode);
          data.messages.forEach(msg => {
            this.addMessage("user", msg.message,msg.created_at);
            this.addMessage("bot", msg.response,msg.created_at);
          });
        }
      } catch (error) {
        console.error('Failed to retrieve session:', error);
        // TODO: uncomment this when we have a way to handle expired sessions
        this.storage.removeItem('mchatbot_session_id');
        this.startNewSession();
      }
    }
    else{
      this.startNewSession();
    }
  }

  startNewSession() {
    this.isStarted = false;
    this.render();
    this.setupEventListeners();
  }

  handleSessionExpiration() {
    this.storage.removeItem('mchatbot_session_id');
    this.startNewSession();
    this.errorMessage = "Your session has expired. Please start a new chat.";
    this.render();
    this.setupEventListeners();
  }

  getStarterFormHTML() {
    return `
      <form class="starter-form">
        <h2 class="form-title">Start a Conversation</h2>
        ${this.errorMessage ? `<div class="error-message">${this.errorMessage}</div>` : ""}
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
    if (this.mode === "voiceChat") {
      return `
        <div class="chatbot-messages">
            
        </div>
        
        <div class="voice-chat-input">
          <div class="voice-recording-container">
            <button type="button" class="voice-record-btn" title="Press and hold to record">
              <div class="voice-btn-content">
                <svg class="mic-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
                <span class="voice-btn-text">Press to start recording</span>
                <div class="recording-timer" style="display: none;">00:00</div>
              </div>
            </button>
            
          </div>
          
          <div class="voice-controls">
            <div class="spacer"></div>
            <button type="button" class="end-session-btn" title="End this session">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="4" y1="4" x2="20" y2="20"></line>
                <line x1="20" y1="4" x2="4" y2="20"></line>
              </svg>
            </button>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="chatbot-messages">
            
        </div>
        
        <form class="chatbot-input">
          <div class="input-row">
            <div class="input-container">
              <textarea rows="3" placeholder="Press Ctrl + Enter to send"></textarea>
            </div>
            <div class="button-container">
              <button type="button" class="end-session-btn" title="End this session">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="4" y1="4" x2="20" y2="20"></line>
                  <line x1="20" y1="4" x2="4" y2="20"></line>
                </svg>
              </button>
              <button type="submit" class="send-button" title="Send message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        </form>
      `;
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
          --chat-input-bg: ${this.isDarkMode ? "#2a2a2a" : "#f8f8f8"};
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .chatbot-container {
          position: fixed;
          ${this.getPositionStyles()}
          min-width: 350px;
          width: 380px;
          height: ${this.widgetHeight};
          background-color: var(--bg-color);
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: all 0.3s ease;
          border: 2px solid var(--theme-color);
          z-index: 999999;
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
                 .header-controls {
           display: flex;
           align-items: center;
           gap: 8px;
         }
         
         .toggle-chat-mode-btn {
           background: rgba(255, 255, 255, 0.15);
           border: 2px solid rgba(255, 255, 255, 0.3);
           color: #fff;
           cursor: pointer;
           font-size: 18px;
           padding: 8px 12px;
           border-radius: 20px;
           transition: all 0.3s ease;
           backdrop-filter: blur(10px);
           min-width: 44px;
           height: 44px;
           display: flex;
           align-items: center;
           justify-content: center;
           position: relative;
           overflow: hidden;
         }
         
         .toggle-chat-mode-btn:hover {
           background: rgba(255, 255, 255, 0.25);
           border-color: rgba(255, 255, 255, 0.5);
           transform: translateY(-2px);
           box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
         }
         
         .toggle-chat-mode-btn:active {
           transform: translateY(0);
           background: rgba(255, 255, 255, 0.3);
         }
         
         .toggle-chat-mode-btn::before {
           content: '';
           position: absolute;
           top: 0;
           left: -100%;
           width: 100%;
           height: 100%;
           background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
           transition: left 0.5s ease;
         }
         
         .toggle-chat-mode-btn:hover::before {
           left: 100%;
         }
         
         .chatbot-toggle {
           background: rgba(255, 255, 255, 0.15);
           border: 2px solid rgba(255, 255, 255, 0.3);
           color: #fff;
           cursor: pointer;
           font-size: 18px;
           padding: 8px 12px;
           border-radius: 20px;
           transition: all 0.3s ease;
           backdrop-filter: blur(10px);
           min-width: 44px;
           height: 44px;
           display: flex;
           align-items: center;
           justify-content: center;
           position: relative;
           overflow: hidden;
         }
         
         .chatbot-toggle:hover {
           background: rgba(255, 255, 255, 0.25);
           border-color: rgba(255, 255, 255, 0.5);
           transform: translateY(-2px);
           box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
         }
         
         .chatbot-toggle:active {
           transform: translateY(0);
           background: rgba(255, 255, 255, 0.3);
         }
         
         .chatbot-toggle::before {
           content: '';
           position: absolute;
           top: 0;
           left: -100%;
           width: 100%;
           height: 100%;
           background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
           transition: left 0.5s ease;
         }
         
         .chatbot-toggle:hover::before {
           left: 100%;
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
         <div class="header-controls"> ${this.isStarted ? `<button class="toggle-chat-mode-btn" title="Toggle Chat Mode">${this.mode == "chat" ? "🎙" : "💬"}</button>` : ""}
          <button class="chatbot-toggle">−</button></div>
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
    // background-color: rgba(255, 255, 255, 0.9);
    //     box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    // transform: rotate(-45deg);

    // transform: rotate(-45deg) scale(1.2);
    return `
      .resize-handle {
        position: absolute;
        left: -2px;
        top: -2px;
        width: 16px;
        height: 16px;
        cursor: nw-resize;
        
        border: 2px solid var(--theme-color);
        border-radius: 3px;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .resize-handle::after {
        content: "⤡";
        color: white;
        font-size: 12px;
        font-weight: bold;
        line-height: 1;
        
        transition: all 0.2s ease;
      }
      .resize-handle:hover {
        background-color: rgba(255, 255, 255, 1);
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
        transform: scale(1.1);
      }
      .resize-handle:hover::after {
        
        color: var(--theme-color);
      }
             .chatbot-container.minimized {
         min-width: 80px;
         width: 80px !important;
         height: 80px;
         border-radius: 50%;
         border: none;
         overflow: visible;
       }
      .chatbot-messages {
        flex-grow: 1;
        overflow-y: auto;
        padding: 10px;
        display: flex;
        flex-direction: column;
      }
      .message {
        max-width: 80%;
        margin-bottom: 25px;
        padding: 8px 12px;
        border-radius: 18px;
        line-height: 1.4;
        position: relative;
        animation: bubble-in 0.5s ease-out;
        word-wrap: break-word;
        overflow-wrap: break-word;
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
        /* background-color: var(--message-bg-user); */
        color: var(--text-color);
        align-self: flex-end;
        margin-left: auto;
        text-align: left;
        min-width: 100px;
      }
      .message.bot {
        padding: 0 12px;
        /* background-color: var(--message-bg-bot); */
        color: var(--text-color);
        align-self: flex-start;
        text-align: left;
        min-width: 100px;
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
       
       /* Audio Message Styles */
       .message-audio {
         margin-top: 8px;
         padding: 8px;
         background-color: rgba(0, 0, 0, 0.05);
         border-radius: 8px;
         border: 1px solid rgba(0, 0, 0, 0.1);
       }
       
       .message.user .message-audio {
         background-color: rgba(112, 31, 171, 0.1);
         border-color: rgba(112, 31, 171, 0.2);
       }
       
       .message.bot .message-audio {
         background-color: rgba(0, 0, 0, 0.05);
         border-color: rgba(0, 0, 0, 0.1);
       }
       
       .audio-info {
         display: flex;
         align-items: center;
         gap: 6px;
         margin-top: 6px;
         font-size: 12px;
         color: #666;
       }
       
       .audio-icon {
         font-size: 14px;
       }
       
       .audio-duration {
         font-weight: 500;
       }
       
       .message-transcription {
         margin-top: 6px;
         padding: 6px 8px;
         background-color: rgba(112, 31, 171, 0.1);
         border-radius: 6px;
         font-size: 13px;
         color: #666;
         border-left: 3px solid var(--theme-color);
       }
       
       .message-text {
         margin-bottom: 4px;
       }
      .new-day-divider {
        text-align: center;
        margin: 20px 0;
        color: #888;
        font-size: 0.8em;
      }
        .end-session-btn {
          background: none;
          border: none;
          color: #ff4444;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
          padding: 5px 8px;
          border-radius: 4px;
        }
        .end-session-btn:hover {
          text-decoration: underline;
          background-color: rgba(255, 68, 68, 0.1);
        }
        .chatbot-input {
          display: flex;
          flex-direction: column;
          padding: 10px;
          background-color: var(--chat-input-bg);
          border-top: 1px solid ${this.isDarkMode ? "#444" : "#eee"};
        }
        .input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }
        .input-container {
          position: relative;
          flex: 1;
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
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
        flex-direction: column-reverse;
      }
      .send-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 5px;
        color: var(--theme-color);
        display: flex;
        align-items: center;
        gap: 5px;
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
         position: absolute;
         top: 50%;
         left: 50%;
         transform: translate(-50%, -50%);
         cursor: pointer;
         transition: all 0.3s ease;
         box-shadow: 0 4px 12px rgba(0,0,0,0.15);
         z-index: 1000;
       }
       
       .floating-icon:hover {
         transform: translate(-50%, -50%) scale(1.1);
         box-shadow: 0 6px 20px rgba(0,0,0,0.25);
       }
      
      /* Voice Chat Styles */
      .voice-chat-input {
        display: flex;
        gap:1rem;        
        padding: 15px;
        background-color: var(--chat-input-bg);
        border-top: 1px solid ${this.isDarkMode ? "#444" : "#eee"};
        
      }
      
      .voice-recording-container {
        display: flex;
        flex:auto;
      }
      
      .voice-record-btn {
        flex:auto;
        height: 60px;
        border-radius: 12px;
        border: 3px solid var(--theme-color);
        background-color: var(--bg-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .voice-record-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
      }
      
      .voice-record-btn:active {
        transform: translateY(0);
        background-color: var(--theme-color);
        color: white;
      }
      
      .voice-record-btn.recording {
        background-color: #ff4444;
        border-color: #ff4444;
        color: white;
        animation: pulse 1s infinite;
      }
      
      .voice-record-btn.countdown {
        background-color: #ffaa00;
        border-color: #ffaa00;
        color: white;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      
      .voice-btn-content {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 12px;
        text-align: center;
        width: 100%;
        justify-content: center;
      }
      
      .mic-icon {
        width: 24px;
        height: 24px;
        stroke-width: 2;
        flex-shrink: 0;
      }
      
      .voice-btn-text {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-color);
        line-height: 1.2;
        flex-grow: 1;
      }
      
      .recording-timer {
        font-size: 16px;
        font-weight: bold;
        color: var(--text-color);
        flex-shrink: 0;
        min-width: 50px;
        text-align: center;
      }
      
      .recording-status {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #ff4444;
        font-weight: 500;
        font-size: 14px;
      }
      
      .recording-indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: #ff4444;
        animation: blink 1s infinite;
      }
      
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
      }
      
      .voice-controls {
        display: flex;
        
        align-items: center;
      }
      
      .voice-controls .end-session-btn {
        width: 60px;
        height: 60px;
        border-radius: 8px;
        background-color: rgba(255, 68, 68, 0.1);
        border: 2px solid #ff4444;
        color: #ff4444;
        font-weight: 500;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .voice-controls .end-session-btn:hover {
        background-color: #ff4444;
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(255, 68, 68, 0.3);
      }
      
      .voice-controls .spacer {
        flex-grow: 1;
      }
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
             .chatbot-container.minimized .floating-icon {
         display: flex;
         z-index: 1001;
       }
      .chatbot-container.minimized .chatbot-header,
      .chatbot-container.minimized .chatbot-content,
      .chatbot-container.minimized .resize-handle {
        display: none;
      }
      .error-message {
        color: #fff;
        background: #d32f2f;
        padding: 10px 14px;
        border-radius: 6px;
        margin-bottom: 10px;
        font-size: 0.98em;
        text-align: center;
        box-shadow: 0 2px 6px rgba(211,47,47,0.08);
        letter-spacing: 0.01em;
      }
      
      @media (max-width: 480px) {
        .chatbot-container {
          width: 100%;
          height: 100%;
          bottom: 0;
          right: 0;
          border-radius: 0;
        }

        .resize-handle {
          display: none !important;
        }
      }
    `;
  }

  setupEventListeners() {
    // Remove existing event listeners to prevent duplicates
    if (this.toggleButton) {
      this.toggleButton.removeEventListener("click", this.toggleChatHandler);
    }
    if (this.floatingIcon) {
      this.floatingIcon.removeEventListener("click", this.toggleChatHandler);
    }
    
    // Store references and add event listeners
    this.toggleButton = this.shadowRoot.querySelector(".chatbot-toggle");
    this.floatingIcon = this.shadowRoot.querySelector(".floating-icon");
    
    if (this.toggleButton) {
      this.toggleChatHandler = () => this.toggleChat();
      this.toggleButton.addEventListener("click", this.toggleChatHandler);
    }
    
    if (this.floatingIcon) {
      this.toggleChatHandler = this.toggleChatHandler || (() => this.toggleChat());
      this.floatingIcon.addEventListener("click", this.toggleChatHandler);
    }

    const starterForm = this.shadowRoot.querySelector(".starter-form");
    if (starterForm) {
      starterForm.addEventListener("submit", (e) =>
        this.handleStarterSubmit(e)
      );
      // Clear error message on input
      const clearError = () => {
        if (this.errorMessage) {
          this.errorMessage = "";
          this.render();
          this.setupEventListeners();
        }
      };
      starterForm.querySelectorAll("input, textarea").forEach((el) => {
        el.addEventListener("input", clearError);
      });
    }

    if (this.isStarted) {
      // Handle different input types based on mode
      if (this.mode === "voiceChat") {
        this.setupVoiceRecordingEvents();
      } else {
        this.inputForm.addEventListener("submit", (e) => this.handleSubmit(e));
        const textarea = this.inputForm.querySelector("textarea");
        textarea.addEventListener("keydown", (e) => this.handleKeyDown(e));
      }

      // Add end session button event listener
      const endSessionBtn = this.shadowRoot.querySelector(".end-session-btn");
      if (endSessionBtn) {
        endSessionBtn.addEventListener("click", () => this.clearSession());
      }
      const toggleChatModeBtn = this.shadowRoot.querySelector(".toggle-chat-mode-btn");
      if (toggleChatModeBtn) {
        toggleChatModeBtn.addEventListener("click", () => this.toggleChatMode());
      }
      // this.shadowRoot
      //   .querySelector(".tool-button.copy")
      //   .addEventListener("click", () => console.log("copy button clicked"));
    }

    this.setupResizeListener();
    this.setupCollisionDetection();
  }

  toggleChat() {
    this.isMinimized = !this.isMinimized;
    this.chatWindow.classList.toggle("minimized");
    this.toggleButton.textContent = this.isMinimized ? "+" : "−";
    
    // Re-setup event listeners after state change
    this.setupEventListeners();
  }

  toggleChatMode() {
    const oldMode = this.mode;
    this.mode = this.mode == "chat" ? "voiceChat" : "chat";
    
    console.log(`🔄 Switching from ${oldMode} to ${this.mode} mode`);
    
    // Update the toggle button icon
    const toggleBtn = this.shadowRoot.querySelector('.toggle-chat-mode-btn');
    if (toggleBtn) {
      toggleBtn.textContent = this.mode == "chat" ? "🎙" : "💬";
    }
    
    // Only swap the input area, preserving messages
    this.swapInputInterface();
    
    // Connect to WebSocket with new mode
    console.log(`🔌 Connecting to WebSocket with ${this.mode} mode...`);
    console.log(`📊 Current WebSocket state:`, this.ws ? this.ws.readyState : 'null');
    this.connectWebSocket(null, this.mode);
  }

  async handleStarterSubmit(e) {
    e.preventDefault();
    this.errorMessage = "";
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
    const domain = this.domain_name;
    const user_agent = navigator.userAgent;
    const ip_address = await getClientIP();
    try {
      const response = await fetch(`${this.apiEndpoint}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          domain,// replace domain with domain variable in production
          user_agent,
          ip_address,
          name
        }),
      });

      if (!response.ok) {
        let errorMsg = "Something went wrong. Please try again later.";
        let errorData;
        try {
          errorData = await response.json();
        } catch {}
        if (response.status === 404) {
          errorMsg = "This domain is not registered for chat support.";
        } else if (response.status === 403) {
          errorMsg = "This email address is restricted from using chat support.";
        } else if (errorData && errorData.error) {
          errorMsg = errorData.error;
        }
        this.errorMessage = errorMsg;
        this.render();
        this.setupEventListeners();
        return;
      }
      const data = await response.json();
      this.userId = data.userId;
      this.userEmail = email;
      this.userName = name;
      this.sessionId = data.sessionId;

      // Store session ID in appropriate storage
      this.storage.setItem('mchatbot_session_id', this.sessionId);

      this.isStarted = true;
      this.render();
      this.connectWebSocket(message, this.mode);
      this.setupEventListeners();
      this.errorMessage = "";
    } catch (error) {
      this.errorMessage = "Something went wrong. Please try again later.";
      this.render();
      this.setupEventListeners();
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
    let resizeType = null; // 'width' or 'height'
    let startX, startY;
    let startWidth, startHeight;

    const startResize = (e) => {
      e.preventDefault();
      isResizing = true;
      
      // Determine if we're resizing width or height based on mouse position
      const rect = this.resizeHandle.getBoundingClientRect();
      const isNearLeft = Math.abs(e.clientX - rect.left) < 10;
      const isNearTop = Math.abs(e.clientY - rect.top) < 10;
      
      if (isNearLeft && isNearTop) {
        resizeType = 'both'; // Corner resize - both width and height
      } else if (isNearLeft) {
        resizeType = 'width'; // Left edge - width only
      } else if (isNearTop) {
        resizeType = 'height'; // Top edge - height only
      } else {
        resizeType = 'both'; // Default to both for corner
      }
      
      startX = e.clientX;
      startY = e.clientY;
      startWidth = Number.parseInt(getComputedStyle(this.chatWindow).width, 10);
      startHeight = Number.parseInt(getComputedStyle(this.chatWindow).height, 10);
      
      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResize);
    };

    const resize = (e) => {
      if (!isResizing) return;
      
      if (resizeType === 'width' || resizeType === 'both') {
        const width = startWidth - (e.clientX - startX);
        if (width >= 350) {
          this.chatWindow.style.width = `${width}px`;
        }
      }
      
      if (resizeType === 'height' || resizeType === 'both') {
        const height = startHeight - (e.clientY - startY);
        if (height >= 400) {
          this.chatWindow.style.height = `${height}px`;
        }
      }
    };

    const stopResize = () => {
      isResizing = false;
      resizeType = null;
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResize);
    };

    this.resizeHandle.addEventListener("mousedown", startResize);
  }

  addMessage(sender, content, timestamp, audioContent = null, transcription = null) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", sender);
    
    // Create content wrapper
    const contentWrapper = document.createElement("div");
    contentWrapper.classList.add("message-content");
    
    // Add text content
    if (content) {
      const textContent = document.createElement("div");
      textContent.classList.add("message-text");
      textContent.innerHTML = content;
      contentWrapper.appendChild(textContent);
    }
    
    // Add transcription if available (for user voice messages)
    if (transcription && sender === "user") {
      const transcriptionElement = document.createElement("div");
      transcriptionElement.classList.add("message-transcription");
      transcriptionElement.innerHTML = `<em>🎤 "${transcription}"</em>`;
      contentWrapper.appendChild(transcriptionElement);
    }
    
    // Add audio player if audio content is available
    if (audioContent) {
      const audioWrapper = document.createElement("div");
      audioWrapper.classList.add("message-audio");
      
      // Create audio element
      const audioElement = document.createElement("audio");
      audioElement.controls = true;
      audioElement.preload = "metadata";
      // audioElement.style.width = "80%";
      audioElement.style.maxWidth = "-webkit-fill-available";
      
      // Handle different audio content formats
      if (typeof audioContent === "string") {
        // Base64 audio data
        if (audioContent.startsWith("data:audio")) {
          audioElement.src = audioContent;
        } else {
          // Assume it's base64 without data URL prefix
          audioElement.src = `data:audio/mpeg;base64,${audioContent}`;
        }
      } else if (audioContent instanceof Blob) {
        // Blob object
        audioElement.src = URL.createObjectURL(audioContent);
      }
      
      // Add audio controls info
      const audioInfo = document.createElement("div");
      audioInfo.classList.add("audio-info");
      audioInfo.innerHTML = `
        <span class="audio-icon">🎵</span>
        <span class="audio-duration">Voice Message</span>
      `;
      
      audioWrapper.appendChild(audioElement);
      audioWrapper.appendChild(audioInfo);
      contentWrapper.appendChild(audioWrapper);
    }
    
    messageElement.appendChild(contentWrapper);

    // Add message tools (copy button, timestamp)
    const toolElement = document.createElement("div");
    toolElement.classList.add("message-tool");
    
    // Copy button
    const toolButton = document.createElement("button");
    toolButton.classList.add("tool-button", "copy");
    toolButton.addEventListener("click", function (event) {
      const messageContent = event.target
        .closest(".message")
        .querySelector(".message-text"); // Get text content only
      if (messageContent) {
        navigator.clipboard
          .writeText(messageContent.textContent.trim())
          .then(() => console.log("Message copied!"))
          .catch((err) => console.error("Copy failed", err));
      }
    });
    toolButton.innerHTML = COPYSVG;
    toolElement.appendChild(toolButton);
    
    // Timestamp
    const timeElement = document.createElement("span");
    timeElement.classList.add("message-time");
    timeElement.textContent = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
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

  updateHeight() {
    if (this.chatWindow && !this.isMinimized) {
      this.chatWindow.style.height = this.widgetHeight;
    }
  }

  updatePosition() {
    if (this.chatWindow) {
      const styles = this.getPositionStyles();
      const styleArray = styles.split(';').filter(style => style.trim());
      styleArray.forEach(style => {
        const [property, value] = style.split(':').map(s => s.trim());
        if (property && value) {
          this.chatWindow.style[property] = value;
        }
      });
    }
  }

  detectAndAvoidConflicts() {
    if (!this.chatWindow) return;
    
    const widgetRect = this.chatWindow.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Check for common conflicting elements
    const conflictingSelectors = [
      '.go-to-top',
      '.scroll-to-top', 
      '.back-to-top',
      '.g-recaptcha',
      '.recaptcha',
      '[data-sitekey]', // Google 
      '.rc-anchor',
      '.floating-button',
      '.fixed-bottom-right',
      '.chat-widget',
      '.support-widget',
      '.mchatbot-conflict-test' // Our test element
    ];
    
    let hasConflict = false;
    conflictingSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (element !== this && this.elementsOverlap(widgetRect, element.getBoundingClientRect())) {
          hasConflict = true;
          console.log(`Conflict detected with: ${selector}`);
        }
      });
    });
    
    if (hasConflict) {
      console.log('Attempting to reposition widget due to conflict...');
      this.repositionWidget();
    }
  }

  elementsOverlap(rect1, rect2) {
    return !(rect1.right < rect2.left || 
             rect1.left > rect2.right || 
             rect1.bottom < rect2.top || 
             rect1.top > rect2.bottom);
  }

  repositionWidget() {
    const positions = [
      { position: "bottom-right", styles: "bottom: 20px; right: 20px;" },
      { position: "bottom-extra-right", styles: "bottom: 20px; right: 100px;" },  // More to the left
      { position: "bottom-right-extra-up", styles: "bottom: 80px; right: 20px;" }, // Higher up
      { position: "bottom-right-more-up", styles: "bottom: 120px; right: 20px;" }, // Higher up
      { position: "bottom-left", styles: "bottom: 20px; left: 20px;" },
      { position: "top-right", styles: "top: 20px; right: 20px;" },
      { position: "top-left", styles: "top: 20px; left: 20px;" },
      
      
    ];
    
    for (let pos of positions) {
      if (!this.checkPositionConflict(pos.styles)) {
        this.widgetPosition = pos.position;
        this.updatePosition();
        console.log(`Widget repositioned to: ${pos.position}`);
        break;
      }
    }
  }

  checkPositionConflict(styles) {
    if (!this.chatWindow) return true;
    
    // Temporarily apply the position to check for conflicts
    const originalStyles = {
      bottom: this.chatWindow.style.bottom,
      top: this.chatWindow.style.top,
      left: this.chatWindow.style.left,
      right: this.chatWindow.style.right
    };
    
    const styleArray = styles.split(';').filter(style => style.trim());
    styleArray.forEach(style => {
      const [property, value] = style.split(':').map(s => s.trim());
      if (property && value) {
        this.chatWindow.style[property] = value;
      }
    });
    
    // Check for conflicts at this position
    const widgetRect = this.chatWindow.getBoundingClientRect();
    const conflictingSelectors = [
      '.go-to-top',
      '.scroll-to-top', 
      '.back-to-top',
      '.g-recaptcha',
      '.recaptcha',
      '[data-sitekey]',
      '.floating-button',
      '.fixed-bottom-right',
      '.chat-widget',
      '.support-widget',
      '.mchatbot-conflict-test'
    ];
    
    let hasConflict = false;
    conflictingSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (element !== this && this.elementsOverlap(widgetRect, element.getBoundingClientRect())) {
          hasConflict = true;
        }
      });
    });
    
    // Restore original styles
    Object.keys(originalStyles).forEach(property => {
      this.chatWindow.style[property] = originalStyles[property];
    });
    
    return hasConflict;
  }

  setupCollisionDetection() {
    // Check for conflicts every 2 seconds
    setInterval(() => {
      this.detectAndAvoidConflicts();
    }, 2000);
    
    // Also check on window resize
    window.addEventListener('resize', () => {
      this.detectAndAvoidConflicts();
    });
  }

  connectWebSocket(firstMessage = null, mode="chat") {
    try {
      // Use namespace as query parameter instead of path
      const wsUrl = `${this.socketPath}?namespace=${mode}&userId=${this.userId}&sessionId=${this.sessionId}`;
      console.log("Attempting to connect to WebSocket:", wsUrl);
      
      // Mark that we're intentionally closing the connection
      this.isIntentionalClose = true;
      
      // Close existing connection if it's open
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log("Closing existing WebSocket connection...");
        this.ws.close(1000, "Mode switch"); // Use code 1000 for normal closure
      }
      
      // Wait a bit for the connection to close before creating a new one
      setTimeout(() => {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log(`✅ WebSocket Connected to ${mode} mode`);
          this.isIntentionalClose = false; // Reset the flag
          if (firstMessage) {
            this.sendMessage(firstMessage);
          }
        };

        this.ws.onerror = (error) => {
          console.error("❌ WebSocket Error:", {
            readyState: this.ws.readyState,
            url: this.ws.url,
            error: error
          });
          
          // Log the current connection state
          const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
          console.log("WebSocket State:", states[this.ws.readyState]);
        };

        this.ws.onclose = (event) => {
          console.log("🔄 WebSocket Disconnected:", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          
          // Only attempt reconnect if it wasn't an intentional closure
          if (!this.isIntentionalClose && event.code !== 1000) {
            console.log("Attempting to reconnect in 3 seconds...");
            setTimeout(() => this.connectWebSocket(null, this.mode), 3000);
          } else {
            console.log("Connection closed intentionally, no reconnection needed");
          }
        };

        this.ws.onmessage = (event) => {
          try {
            console.log("📨 WebSocket message received:", event.data);
            const data = JSON.parse(event.data);
            if (data.error) {
              console.error("WebSocket Error Message:", data.error);
              return;
            }
            
            // Handle different message types
            if (data.type === 'voice' && data.audio) {
              // Voice message with audio content
              this.addMessage("bot", data.text || data.message || "Voice response", 
                data.timestamp || new Date().toISOString(), 
                data.audio, 
                data.transcription);
            } else if (data.type === 'mixed') {
              // Mixed message with both text and audio
              this.addMessage("bot", data.text || data.message || "Response", 
                data.timestamp || new Date().toISOString(), 
                data.audio, 
                data.transcription);
            } else {
              // Regular text message
              this.addMessage("bot", data.data || data.text || data.message || data);
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };
      }, 100);
      
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
    }
  }

  // Voice Recording Methods
  async initializeAudioRecorder() {
    try {
      // Import the library dynamically
      const AudioRecorder = await import('simple-audio-recorder');
      
      // Try different paths for the MP3 worker
      const workerPaths = [
        './mp3worker.js',
        '/mp3worker.js',
        `${window.location.origin}/mp3worker.js`,
        `${window.location.origin}/public/mp3worker.js`
      ];
      
      let workerLoaded = false;
      for (const path of workerPaths) {
        try {
          console.log(`�� Trying to load MP3 worker from: ${path}`);
          await AudioRecorder.default.preload(path);
          console.log(`✅ MP3 worker loaded successfully from: ${path}`);
          workerLoaded = true;
          break;
        } catch (workerError) {
          console.warn(`⚠️ Failed to load MP3 worker from ${path}:`, workerError);
        }
      }
      
      if (!workerLoaded) {
        throw new Error('Failed to load MP3 worker from all attempted paths');
      }
      
      // Create the audio recorder instance
      this.audioRecorder = new AudioRecorder.default({
        recordingGain: 1,
        encoderBitRate: 64, // Reduced bitrate for better compatibility
        streaming: false,
        constraints: {
          channelCount: 1,
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100 // Explicit sample rate
        }
      });

      console.log("✅ Audio recorder initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize audio recorder:", error);
      
      // Provide more helpful error messages
      if (error.message.includes('MP3 worker')) {
        this.addMessage("bot", "Voice recording setup failed: MP3 encoder not available. Please check if mp3worker.js is accessible.");
      } else if (error.message.includes('getUserMedia')) {
        this.addMessage("bot", "Microphone access denied. Please allow microphone permissions and try again.");
      } else {
        this.addMessage("bot", "Voice recording is not available in your browser. Please use text chat instead.");
      }
      
      // Disable voice mode if initialization fails
      this.mode = "chat";
      this.swapInputInterface();
    }
  }

  startVoiceRecording() {
    if (!this.audioRecorder) {
      console.error("Audio recorder not initialized");
      return;
    }

    // Start countdown
    this.startCountdown();
  }

  startCountdown() {
    const voiceBtn = this.shadowRoot.querySelector('.voice-record-btn');
    const voiceBtnText = this.shadowRoot.querySelector('.voice-btn-text');
    const recordingTimer = this.shadowRoot.querySelector('.recording-timer');
    // const recordingStatus = this.shadowRoot.querySelector('.recording-status');

    if (!voiceBtn) return;

    voiceBtn.classList.add('countdown');
    voiceBtnText.textContent = 'Starting in...';
    recordingTimer.style.display = 'block';
    // recordingStatus.style.display = 'none';

    let countdown = Math.ceil(this.countdownTime / 1000);
    
    this.countdownTimer = setInterval(() => {
      countdown--;
      recordingTimer.textContent = countdown;
      
      if (countdown <= 0) {
        clearInterval(this.countdownTimer);
        this.actuallyStartRecording();
      }
    }, 1000);
  }

  async actuallyStartRecording() {
    try {
      await this.audioRecorder.start();
      
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      
      const voiceBtn = this.shadowRoot.querySelector('.voice-record-btn');
      const voiceBtnText = this.shadowRoot.querySelector('.voice-btn-text');
      const recordingTimer = this.shadowRoot.querySelector('.recording-timer');
      // const recordingStatus = this.shadowRoot.querySelector('.recording-status');

      if (voiceBtn) {
        voiceBtn.classList.remove('countdown');
        voiceBtn.classList.add('recording');
        voiceBtnText.textContent = 'Recording...';
        recordingTimer.textContent = '00:00';
        // recordingStatus.style.display = 'flex';
      }

      // Start recording timer
      this.startRecordingTimer();
      
      // Set max recording time limit
      setTimeout(() => {
        if (this.isRecording) {
          this.stopVoiceRecording();
        }
      }, this.maxRecordingTime);

      console.log("✅ Voice recording started");
    } catch (error) {
      console.error("❌ Failed to start voice recording:", error);
      this.addMessage("bot", "Sorry, failed to start voice recording. Please try again.");
    }
  }

  startRecordingTimer() {
    this.recordingTimer = setInterval(() => {
      if (this.isRecording) {
        const elapsed = Date.now() - this.recordingStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        const timerElement = this.shadowRoot.querySelector('.recording-timer');
        if (timerElement) {
          timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
      }
    }, 1000);
  }

  async stopVoiceRecording() {
    if (!this.isRecording || !this.audioRecorder) {
      return;
    }

    try {
      // Stop recording
      const mp3Blob = await this.audioRecorder.stop();
      
      this.isRecording = false;
      
      // Clear timers
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }

      // Reset UI
      this.resetVoiceRecordingUI();

      // Send audio message
      if (mp3Blob) {
        await this.sendVoiceMessage(mp3Blob);
      }

      console.log("✅ Voice recording stopped and sent");
    } catch (error) {
      console.error("❌ Failed to stop voice recording:", error);
      this.addMessage("bot", "Sorry, failed to process voice recording. Please try again.");
      this.resetVoiceRecordingUI();
    }
  }

  resetVoiceRecordingUI() {
    const voiceBtn = this.shadowRoot.querySelector('.voice-record-btn');
    const voiceBtnText = this.shadowRoot.querySelector('.voice-btn-text');
    const recordingTimer = this.shadowRoot.querySelector('.recording-timer');
    const recordingStatus = this.shadowRoot.querySelector('.recording-status');

    if (voiceBtn) {
      voiceBtn.classList.remove('recording', 'countdown');
    }
    if (voiceBtnText) {
      voiceBtnText.textContent = 'Press to start recording';
    }
    if (recordingTimer) {
      recordingTimer.style.display = 'none';
    }
    if (recordingStatus) {
      recordingStatus.style.display = 'none';
    }
  }

  async sendVoiceMessage(audioBlob) {
    try {
      // Convert blob to base64 for sending
      const reader = new FileReader();
      reader.onload = () => {
        const base64Audio = reader.result.split(',')[1]; // Remove data:audio/mpeg;base64, prefix
        
        const messageData = {
          type: 'voice',
          audio: base64Audio,
          timestamp: new Date().toISOString(),
          mode: this.mode,
          userId: this.userId,
          sessionId: this.sessionId
        };

        // Send via WebSocket
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(messageData));
          console.log("✅ Voice message sent via WebSocket");
          
          // Add voice message to chat with audio player
          this.addMessage("user", "🎤 Voice message sent", new Date().toISOString(), audioBlob);
        } else {
          console.error("WebSocket not connected");
          this.addMessage("bot", "Connection lost. Please try again.");
        }
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error("❌ Failed to send voice message:", error);
      this.addMessage("bot", "Sorry, failed to send voice message. Please try again.");
    }
  }

  setupVoiceRecordingEvents() {
    const voiceBtn = this.shadowRoot.querySelector('.voice-record-btn');
    if (!voiceBtn) return;

    // Initialize audio recorder when entering voice mode
    this.initializeAudioRecorder();

    // Mouse events for desktop - single click handler
    voiceBtn.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopVoiceRecording();
      } else {
        this.startVoiceRecording();
      }
    });

    // voiceBtn.addEventListener('mouseleave', () => {
    //   if (this.isRecording) {
    //     this.stopVoiceRecording();
    //   }
    // });

    // // Touch events for mobile
    // voiceBtn.addEventListener('touchstart', (e) => {
    //   e.preventDefault();
    //   this.startVoiceRecording();
    // });

    // voiceBtn.addEventListener('touchend', (e) => {
    //   e.preventDefault();
    //   if (this.isRecording) {
    //     this.stopVoiceRecording();
    //   }
    // });

    // voiceBtn.addEventListener('touchcancel', (e) => {
    //   e.preventDefault();
    //   if (this.isRecording) {
    //     this.stopVoiceRecording();
    //   }
    // });
  }

  swapInputInterface() {
    if (!this.shadowRoot || !this.isStarted) return;

    const chatContent = this.shadowRoot.querySelector('.chatbot-content');
    if (!chatContent) return;

    // Find the current input area
    const currentInput = chatContent.querySelector('.chatbot-input, .voice-chat-input');
    if (!currentInput) return;

    // Create the new input interface
    let newInput;
    if (this.mode === "voiceChat") {
      newInput = document.createElement('div');
      newInput.className = 'voice-chat-input';
      newInput.innerHTML = `
        <div class="voice-recording-container">
          <button type="button" class="voice-record-btn" title="Press and hold to record">
            <div class="voice-btn-content">
              <svg class="mic-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
              <span class="voice-btn-text">Press to start recording</span>
              <div class="recording-timer" style="display: none;">00:00</div>
            </div>
          </button>
          
        </div>
        
        <div class="voice-controls">
          <div class="spacer"></div>
          <button type="button" class="end-session-btn" title="End this session">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="4" y1="4" x2="20" y2="20"></line>
              <line x1="20" y1="4" x2="4" y2="20"></line>
            </svg>
          </button>
        </div>
      `;
    } else {
      newInput = document.createElement('form');
      newInput.className = 'chatbot-input';
      newInput.innerHTML = `
        <div class="input-row">
          <div class="input-container">
            <textarea rows="3" placeholder="Press Ctrl + Enter to send"></textarea>
          </div>
          <div class="button-container">
            <button type="button" class="end-session-btn" title="End this session">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="4" y1="4" x2="20" y2="20"></line>
                <line x1="20" y1="4" x2="4" y2="20"></line>
              </svg>
            </button>
            <button type="submit" class="send-button" title="Send message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      `;
    }

    // Replace the old input with the new one
    currentInput.replaceWith(newInput);

    // Update the inputForm reference
    this.inputForm = this.shadowRoot.querySelector('.chatbot-input');

    // Setup event listeners for the new input
    if (this.mode === "voiceChat") {
      this.setupVoiceRecordingEvents();
    } else {
      if (this.inputForm) {
        this.inputForm.addEventListener("submit", (e) => this.handleSubmit(e));
        const textarea = this.inputForm.querySelector("textarea");
        if (textarea) {
          textarea.addEventListener("keydown", (e) => this.handleKeyDown(e));
        }
      }
    }

    // Re-setup end session button
    const endSessionBtn = newInput.querySelector('.end-session-btn');
    if (endSessionBtn) {
      endSessionBtn.addEventListener('click', () => this.clearSession());
    }

    console.log(`✅ Switched to ${this.mode} mode`);
  }

  sendMessage(message) {
    this.addMessage("user", message);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const messageData = { 
        message, 
        userId: this.userId,
        sessionId: this.sessionId 
      };
      console.log("📤 Sending message:", messageData);
      this.ws.send(JSON.stringify(messageData));
    } else {
      console.warn("⚠️ WebSocket is not connected. Retrying...");
      console.log("WebSocket state:", this.ws ? this.ws.readyState : "null");
      setTimeout(() => this.sendMessage(message), 1000);
    }
  }

  getPositionStyles() {
    // { position: "bottom-right", styles: "bottom: 20px; right: 20px;" },
    // { position: "bottom-extra-right", styles: "bottom: 20px; right: 100px;" },  // More to the left
    // { position: "bottom-right-extra-up", styles: "bottom: 80px; right: 20px;" }, // Higher up
    // { position: "bottom-right-more-up", styles: "bottom: 120px; right: 20px;" }, // Higher up
    // { position: "bottom-left", styles: "bottom: 20px; left: 20px;" },
    // { position: "top-right", styles: "top: 20px; right: 20px;" },
    // { position: "top-left", styles: "top: 20px; left: 20px;" },
      const positionStyles = {
        "bottom-right": "bottom: 20px; right: 20px;",
        "bottom-extra-right": "bottom: 20px; right: 100px;",
        "bottom-right-extra-up": "bottom: 80px; right: 20px;",
        "bottom-right-more-up": "bottom: 120px; right: 20px;",
        "bottom-left": "bottom: 20px; left: 20px;",
        "top-right": "top: 20px; right: 20px;",
        "top-left": "top: 20px; left: 20px;"
      };
    return positionStyles[this.widgetPosition] || "bottom: 20px; right: 20px;";
  }

  async clearSession() {
    if (!this.sessionId) {
      console.log("No active session to clear");
      return;
    }

    try {
      // Call the backend endpoint to terminate the session
      const response = await fetch(`${this.apiEndpoint}/session/${this.sessionId}?domain=${this.domain_name}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log("✅ Session terminated successfully");
      } else {
        console.warn("⚠️ Failed to terminate session on backend:", response.status);
      }
    } catch (error) {
      console.error("❌ Error terminating session:", error);
    }

    // Clear local session data regardless of backend response
    this.storage.removeItem('mchatbot_session_id');
    this.sessionId = null;
    this.userId = null;
    
    // Reset to starter form
    this.isStarted = false;
    this.render();
    this.setupEventListeners();
    
    console.log("🔄 Session cleared, ready for new chat");
  }
}

customElements.define("mchatbot-widget", MChatBotWidget);
