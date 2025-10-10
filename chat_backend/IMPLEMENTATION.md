# Chat Backend Implementation Guide

This document provides information about the VSRCPlayer chat backend implementation.

## Architecture

The chat system consists of two main components:

1. **Backend Server** (`chat_backend/server.js`) - WebSocket server handling message broadcasting
2. **Frontend Client** (`src/vsrc-chat.js`) - Browser-based chat UI component

## Backend Server

### Features
- WebSocket-based real-time messaging
- Broadcast messages to all connected clients
- User join/leave notifications
- Automatic message timestamping
- Error handling and connection management

### Installation
```bash
cd chat_backend
npm install
```

### Running the Server
```bash
npm start
```

Default port: 8080 (configurable via `PORT` environment variable)

### Custom Port
```bash
PORT=3000 npm start
```

### Message Protocol

**Client → Server:**
```json
{
  "type": "message",
  "username": "User123",
  "message": "Hello everyone!"
}
```

**Server → Client:**
```json
{
  "type": "message",
  "username": "User123",
  "message": "Hello everyone!",
  "timestamp": 1234567890
}
```

**System Messages:**
```json
{
  "type": "system",
  "message": "User joined. 5 user(s) online",
  "timestamp": 1234567890
}
```

## Frontend Client

### Installation

Include the script in your HTML:
```html
<script src="src/vsrc-chat.js"></script>
```

### Basic Usage

```javascript
const chat = new VSRCChat('#chat-container', {
    serverUrl: 'ws://localhost:8080',
    username: 'User123',
    colors: {
        background: '#1f1f1f',
        inputBackground: '#2a2a2a',
        userMessage: '#0e4c92',
        otherMessage: '#2a2a2a',
        systemMessage: '#666',
        text: '#ffffff',
        border: '#3a3a3a'
    },
    onMessage: (data) => {
        console.log('New message:', data);
    },
    onConnect: () => {
        console.log('Connected to chat');
    },
    onDisconnect: () => {
        console.log('Disconnected from chat');
    }
});
```

### API Methods

```javascript
// Send a message
chat.sendMessage('Hello!');

// Update username
chat.setUsername('NewUsername');

// Clear all messages
chat.clearMessages();

// Update color palette
chat.updateColors({
    userMessage: '#2563eb',
    background: '#000000'
});

// Disconnect from server
chat.disconnect();

// Get all messages
const messages = chat.getMessages();
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serverUrl` | string | `'ws://localhost:8080'` | WebSocket server URL |
| `username` | string | `'User' + random` | Username for the chat |
| `colors` | object | See below | Color palette configuration |
| `onMessage` | function | `() => {}` | Callback when message received |
| `onConnect` | function | `() => {}` | Callback when connected |
| `onDisconnect` | function | `() => {}` | Callback when disconnected |

### Color Palette

```javascript
colors: {
    background: '#1f1f1f',        // Chat background
    inputBackground: '#2a2a2a',   // Input area background
    userMessage: '#0e4c92',       // Your message bubble color
    otherMessage: '#2a2a2a',      // Other users' message bubble color
    systemMessage: '#666',        // System message text color
    text: '#ffffff',              // Text color
    border: '#3a3a3a'             // Border color
}
```

## Integration with VSRCPlayer

### HTML Layout

```html
<div class="player-chat-container">
    <div class="video-wrapper">
        <video id="player" class="video-js"></video>
    </div>
    <div class="chat-wrapper" id="chat"></div>
</div>
```

### CSS Styling

```css
.player-chat-container {
    display: flex;
    gap: 20px;
    height: 600px;
}

.video-wrapper {
    flex: 1;
    min-width: 0;
}

.chat-wrapper {
    width: 340px;
    flex-shrink: 0;
}

/* Responsive: Stack vertically on mobile */
@media (max-width: 968px) {
    .player-chat-container {
        flex-direction: column;
        height: auto;
    }
    
    .video-wrapper {
        height: 400px;
    }
    
    .chat-wrapper {
        width: 100%;
        height: 400px;
    }
}
```

### JavaScript Initialization

```javascript
// Initialize player
const player = new VSRCPlayer('#player', {
    type: 'live',
    src: 'https://example.com/stream.m3u8'
});

// Initialize chat
const chat = new VSRCChat('#chat', {
    serverUrl: 'ws://localhost:8080',
    username: 'User123'
});
```

## Security Considerations

The current implementation is a basic example. For production use, consider:

1. **Authentication** - Add user authentication to the WebSocket server
2. **Rate Limiting** - Prevent message spam
3. **Content Filtering** - Filter inappropriate content
4. **SSL/TLS** - Use `wss://` for encrypted connections
5. **Input Sanitization** - The client already escapes HTML, but validate on server too
6. **Message Persistence** - Store messages in a database for history
7. **User Management** - Track active users, moderators, bans, etc.

## Extending the Server

### Adding Authentication

```javascript
// In server.js
ws.on('connection', (ws) => {
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        
        // Add authentication check
        if (!isAuthenticated(message.token)) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Unauthorized'
            }));
            return;
        }
        
        // Process message...
    });
});
```

### Adding Message History

```javascript
// Store last 100 messages
const messageHistory = [];

ws.on('connection', (ws) => {
    // Send history to new client
    messageHistory.forEach(msg => {
        ws.send(JSON.stringify(msg));
    });
    
    // Store new messages
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        messageHistory.push(message);
        if (messageHistory.length > 100) {
            messageHistory.shift();
        }
        broadcast(message, ws);
    });
});
```

## Troubleshooting

### Connection Issues

1. **Check if server is running:**
   ```bash
   cd chat_backend
   npm start
   ```

2. **Verify WebSocket URL:**
   - Use `ws://localhost:8080` for local development
   - Use `wss://your-domain.com` for production with SSL

3. **Check browser console:**
   - Look for WebSocket connection errors
   - Verify CORS settings if needed

### Messages Not Appearing

1. **Check server logs** - Messages should appear in server console
2. **Verify message format** - Must be valid JSON with `type`, `username`, and `message`
3. **Check network tab** - Verify WebSocket frames are being sent/received

## Performance

The current implementation handles typical live stream chat scenarios well:

- Supports hundreds of concurrent users
- Low latency message delivery
- Minimal server resource usage

For very large deployments (thousands of concurrent users), consider:
- Using a message queue (Redis, RabbitMQ)
- Implementing horizontal scaling
- Using dedicated chat platforms (e.g., Pusher, PubNub)

## Example Use Cases

1. **Live Streaming Events** - Real-time chat during live broadcasts
2. **Webinars** - Q&A and discussion during presentations
3. **Gaming Streams** - Viewer interaction with streamers
4. **Virtual Events** - Community engagement during online events
5. **Educational Content** - Student discussions during video lessons

## Future Enhancements

Potential features to add:

- [ ] Private messaging
- [ ] User roles (moderator, admin)
- [ ] Message reactions/emojis
- [ ] File/image sharing
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Message search
- [ ] User profiles/avatars
- [ ] Message notifications
- [ ] Multi-room support
