/**
 * VSRCChat - WebSocket-based chat component for VSRCPlayer
 */
class VSRCChat {
  /**
   * Create a new VSRCChat instance
   * @param {string|Element} element - The container element or selector
   * @param {Object} options - Chat options
   * @param {string} options.serverUrl - WebSocket server URL (e.g., 'ws://localhost:8080')
   * @param {string} options.username - Username for the chat
   * @param {Object} options.colors - Color palette for the chat
   * @param {string} options.colors.background - Chat background color
   * @param {string} options.colors.inputBackground - Input background color
   * @param {string} options.colors.userMessage - User message background color
   * @param {string} options.colors.otherMessage - Other user message background color
   * @param {string} options.colors.systemMessage - System message color
   * @param {string} options.colors.text - Text color
   * @param {string} options.colors.border - Border color
   * @param {Function} options.onMessage - Callback when message is received
   * @param {Function} options.onConnect - Callback when connected
   * @param {Function} options.onDisconnect - Callback when disconnected
   */
  constructor(element, options = {}) {
    this.element = typeof element === 'string' ? document.querySelector(element) : element;
    
    // Default options
    this.options = {
      serverUrl: options.serverUrl || 'ws://localhost:8080',
      username: options.username || 'User' + Math.floor(Math.random() * 1000),
      colors: {
        background: '#1f1f1f',
        inputBackground: '#2a2a2a',
        userMessage: '#0e4c92',
        otherMessage: '#2a2a2a',
        systemMessage: '#666',
        text: '#ffffff',
        border: '#3a3a3a',
        ...options.colors
      },
      onMessage: options.onMessage || (() => {}),
      onConnect: options.onConnect || (() => {}),
      onDisconnect: options.onDisconnect || (() => {}),
      ...options
    };

    this.ws = null;
    this.connected = false;
    this.messages = [];

    this._init();
  }

  /**
   * Initialize the chat UI
   * @private
   */
  _init() {
    if (!this.element) {
      console.error('VSRCChat: Container element not found');
      return;
    }

    // Create chat UI
    this._createUI();
    
    // Connect to WebSocket server
    this._connect();
  }

  /**
   * Create the chat UI
   * @private
   */
  _createUI() {
    const colors = this.options.colors;
    
    this.element.innerHTML = `
      <div class="vsrc-chat-container" style="
        display: flex;
        flex-direction: column;
        height: 100%;
        background-color: ${colors.background};
        color: ${colors.text};
        font-family: Arial, sans-serif;
        border-left: 1px solid ${colors.border};
      ">
        <div class="vsrc-chat-header" style="
          padding: 12px 16px;
          background-color: ${colors.inputBackground};
          border-bottom: 1px solid ${colors.border};
          font-weight: bold;
          font-size: 14px;
        ">
          Live Chat
        </div>
        
        <div class="vsrc-chat-messages" style="
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        ">
          <!-- Messages will be inserted here -->
        </div>
        
        <div class="vsrc-chat-status" style="
          padding: 8px 16px;
          background-color: ${colors.inputBackground};
          border-top: 1px solid ${colors.border};
          font-size: 12px;
          color: #888;
          text-align: center;
        ">
          Connecting...
        </div>
        
        <div class="vsrc-chat-input-container" style="
          padding: 12px;
          background-color: ${colors.inputBackground};
          border-top: 1px solid ${colors.border};
          display: flex;
          gap: 8px;
        ">
          <input 
            type="text" 
            class="vsrc-chat-input" 
            placeholder="Send a message..."
            style="
              flex: 1;
              padding: 8px 12px;
              background-color: ${colors.background};
              color: ${colors.text};
              border: 1px solid ${colors.border};
              border-radius: 4px;
              font-size: 14px;
              outline: none;
            "
          />
          <button 
            class="vsrc-chat-send" 
            style="
              padding: 8px 16px;
              background-color: #0e4c92;
              color: white;
              border: none;
              border-radius: 4px;
              font-size: 14px;
              cursor: pointer;
              font-weight: bold;
            "
          >
            Send
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    this._setupEventListeners();
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    const input = this.element.querySelector('.vsrc-chat-input');
    const sendBtn = this.element.querySelector('.vsrc-chat-send');

    const sendMessage = () => {
      const message = input.value.trim();
      if (message && this.connected) {
        this.sendMessage(message);
        input.value = '';
      }
    };

    sendBtn.addEventListener('click', sendMessage);
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }

  /**
   * Connect to WebSocket server
   * @private
   */
  _connect() {
    try {
      this.ws = new WebSocket(this.options.serverUrl);

      this.ws.onopen = () => {
        console.log('VSRCChat: Connected to server');
        this.connected = true;
        this._updateStatus('Connected');
        this.options.onConnect();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._handleMessage(data);
        } catch (error) {
          console.error('VSRCChat: Error parsing message', error);
        }
      };

      this.ws.onclose = () => {
        console.log('VSRCChat: Disconnected from server');
        this.connected = false;
        this._updateStatus('Disconnected - Reconnecting...');
        this.options.onDisconnect();
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (!this.connected) {
            this._connect();
          }
        }, 3000);
      };

      this.ws.onerror = (error) => {
        console.error('VSRCChat: WebSocket error', error);
        this._updateStatus('Connection error');
      };
    } catch (error) {
      console.error('VSRCChat: Failed to connect', error);
      this._updateStatus('Failed to connect');
    }
  }

  /**
   * Handle incoming message
   * @private
   */
  _handleMessage(data) {
    this.messages.push(data);
    this._displayMessage(data);
    this.options.onMessage(data);
  }

  /**
   * Display a message in the chat
   * @private
   */
  _displayMessage(data) {
    const messagesContainer = this.element.querySelector('.vsrc-chat-messages');
    const colors = this.options.colors;
    
    const messageEl = document.createElement('div');
    
    if (data.type === 'system') {
      messageEl.style.cssText = `
        padding: 6px 12px;
        background-color: transparent;
        color: ${colors.systemMessage};
        font-size: 12px;
        text-align: center;
        font-style: italic;
      `;
      messageEl.textContent = data.message;
    } else {
      const isOwnMessage = data.username === this.options.username;
      const bgColor = isOwnMessage ? colors.userMessage : colors.otherMessage;
      
      messageEl.style.cssText = `
        padding: 8px 12px;
        background-color: ${bgColor};
        border-radius: 6px;
        max-width: 80%;
        align-self: ${isOwnMessage ? 'flex-end' : 'flex-start'};
        word-wrap: break-word;
      `;
      
      messageEl.innerHTML = `
        <div style="font-size: 12px; font-weight: bold; margin-bottom: 4px; opacity: 0.8;">
          ${this._escapeHtml(data.username)}
        </div>
        <div style="font-size: 14px;">
          ${this._escapeHtml(data.message)}
        </div>
      `;
    }
    
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Update status text
   * @private
   */
  _updateStatus(text) {
    const statusEl = this.element.querySelector('.vsrc-chat-status');
    if (statusEl) {
      statusEl.textContent = text;
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Send a message
   * @param {string} message - Message text
   */
  sendMessage(message) {
    if (!this.connected || !this.ws) {
      console.warn('VSRCChat: Not connected to server');
      return;
    }

    const data = {
      type: 'message',
      username: this.options.username,
      message: message
    };

    try {
      this.ws.send(JSON.stringify(data));
    } catch (error) {
      console.error('VSRCChat: Error sending message', error);
    }
  }

  /**
   * Set username
   * @param {string} username - New username
   */
  setUsername(username) {
    this.options.username = username;
  }

  /**
   * Get messages
   * @returns {Array} Array of messages
   */
  getMessages() {
    return this.messages;
  }

  /**
   * Clear all messages
   */
  clearMessages() {
    this.messages = [];
    const messagesContainer = this.element.querySelector('.vsrc-chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  /**
   * Update color palette
   * @param {Object} colors - New color palette
   */
  updateColors(colors) {
    this.options.colors = { ...this.options.colors, ...colors };
    this._createUI();
    
    // Redisplay all messages
    const messagesContainer = this.element.querySelector('.vsrc-chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
      this.messages.forEach(msg => this._displayMessage(msg));
    }
  }
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VSRCChat;
}

// Also attach to window for browser usage
if (typeof window !== 'undefined') {
  window.VSRCChat = VSRCChat;
}
