# VSRCPlayer

An HTML5 video player built on top of video.js, with enhanced support for both VOD (Video on Demand) and live streaming content.

## Features

- 🎬 **VOD Support** - Full support for Video on Demand playback
- 📡 **Live Streaming** - HLS (HTTP Live Streaming) with automatic M3U8 probing
- 🔄 **Smart Probing** - Automatically probe for M3U8 files at configurable intervals
- 💬 **Live Chat** - WebSocket-based real-time chat with configurable color palette
- 📊 **Built-in Analytics** - Automatic event tracking to api.vsrc.video (always enabled)
- 🎯 **Easy API** - Simple, intuitive JavaScript API
- 📱 **Responsive** - Fluid player that adapts to any screen size
- ⚡ **Event-Driven** - Rich callback system for lifecycle events
- 🎨 **Customizable** - Full access to underlying video.js instance

## Installation

```bash
npm install
npm run build
```

## Quick Start

### Basic VOD Usage

```html
<!DOCTYPE html>
<html>
<head>
    <script src="dist/vsrc-player.js"></script>
</head>
<body>
    <video id="my-player" class="video-js"></video>
    
    <script>
        const player = new VSRCPlayer('#my-player', {
            type: 'vod',
            src: 'path/to/video.mp4',
            onReady: (player) => {
                console.log('Player is ready!');
            }
        });
    </script>
</body>
</html>
```

### Live Streaming with Probing

```javascript
const player = new VSRCPlayer('#my-player', {
    type: 'live',
    src: 'https://example.com/stream/playlist.m3u8',
    probeInterval: 5000,        // Probe every 5 seconds
    maxProbeAttempts: 12,       // Maximum 12 attempts
    onProbeSuccess: (player) => {
        console.log('Stream found and starting playback');
    },
    onProbeFailed: (player) => {
        console.error('Stream not available');
    }
});
```

### Live Chat Integration

```javascript
// Initialize chat alongside your video player
const player = new VSRCPlayer('#my-player', {
    type: 'live',
    src: 'https://example.com/stream/playlist.m3u8',
    userId: 'user-123',           // Optional: for analytics tracking
    mediaId: 'video-456',         // Optional: for analytics tracking
    chat: {
        element: '#chat-container',
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
        }
    },
    onReady: (player) => {
        console.log('Player ready with chat');
    }
});

// Access chat via player
const chat = player.getChat();
```

**Chat Backend Setup:**

```bash
cd chat_backend
npm install
npm start  # Starts WebSocket server on port 8080
```


## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `type` | string | `'vod'` | Player type: `'vod'` or `'live'` |
| `src` | string | `''` | Video source URL |
| `userId` | string | `undefined` | User ID for analytics tracking (optional) |
| `mediaId` | string | `undefined` | Media/video ID for analytics tracking (optional) |
| `probeInterval` | number | `5000` | Probe interval in milliseconds (live only) |
| `maxProbeAttempts` | number | `12` | Maximum probe attempts (live only) |
| `onReady` | function | `null` | Callback when player is ready |
| `onError` | function | `null` | Callback when error occurs |
| `onProbeSuccess` | function | `null` | Callback when M3U8 probe succeeds |
| `onProbeFailed` | function | `null` | Callback when all probe attempts fail |

## Analytics

VSRCPlayer includes built-in analytics tracking that is **always enabled** and sends data to `api.vsrc.video`. The following events are automatically tracked:

- **play** - When video playback starts
- **pause** - When video is paused
- **seek** - When user seeks to a different position
- **ended** - When video playback completes
- **error** - When a playback error occurs
- **buffer** - When video buffering occurs

Analytics data includes:
- Session ID (automatically generated)
- User ID (if provided via `userId` option)
- Media ID (if provided via `mediaId` option)
- Event type
- Current playback time
- Video duration
- Error messages (for error events)

**Note:** Analytics cannot be disabled and is a core feature of the player.

## API Methods

### Playback Control

```javascript
player.play()           // Start playback
player.pause()          // Pause playback
player.seek(seconds)    // Seek to specific time
```

### Volume Control

```javascript
player.volume(0.5)      // Set volume (0-1)
const vol = player.volume()  // Get current volume
```

### State Queries

```javascript
player.currentTime()    // Get current playback time
player.isPlaying()      // Check if video is playing
```

### Source Management

```javascript
player.setSource(src, type)  // Change video source
```

### Advanced

```javascript
player.getPlayer()      // Access underlying video.js instance
player.dispose()        // Clean up and destroy player
```

## Examples

The `examples/` directory contains comprehensive demonstrations:

- **VOD Example** (`examples/vod/`) - Basic video on demand playback
- **Live Streaming** (`examples/live/`) - HLS streaming with M3U8 probing
- **Advanced Features** (`examples/advanced/`) - Full API demonstration
- **Live Chat** (`examples/chat/`) - Real-time chat with WebSocket integration

To view examples:

1. Build the project: `npm run build`
2. Open any example HTML file in your browser
3. Or run a local server: `npx http-server -p 8080`

## How M3U8 Probing Works

When configured for live streaming (`type: 'live'`), the player can probe for M3U8 playlists:

1. Player makes HEAD requests to the M3U8 URL at regular intervals
2. If the file is available (HTTP 200), playback starts immediately
3. If not available, it retries until `maxProbeAttempts` is reached
4. Callbacks notify you of probe success or failure

This is useful for:
- Starting playback when a live stream becomes available
- Handling streams that start at scheduled times
- Graceful degradation when streams are unavailable

## Live Chat

VSRCPlayer includes an optional WebSocket-based chat component for live streaming scenarios, similar to YouTube Live or Twitch.

### Features

- Real-time messaging via WebSockets
- Configurable color palette
- Responsive layout (chat appears alongside video)
- Auto-reconnect on disconnect
- Customizable usernames
- System messages for user join/leave events

### Setup

1. **Start the chat backend:**
   ```bash
   cd chat_backend
   npm install
   npm start
   ```

2. **Include the chat client:**
   ```html
   <script src="src/vsrc-chat.js"></script>
   ```

3. **Initialize the chat:**
   ```javascript
   const player = new VSRCPlayer('#my-player', {
       type: 'live',
       src: 'https://example.com/stream.m3u8',
       chat: {
           element: '#chat-container',
           serverUrl: 'ws://localhost:8080',
           username: 'MyUsername',
           colors: {
               background: '#1f1f1f',
               userMessage: '#0e4c92',
               // ... other colors
           }
       }
   });
   ```

### Chat API

```javascript
// Get chat instance from player
const chat = player.getChat();

// Chat methods
chat.sendMessage('Hello!')      // Send a message
chat.setUsername('NewName')     // Update username
chat.clearMessages()            // Clear chat history
chat.updateColors({ ... })      // Update color palette
chat.disconnect()               // Disconnect from server
```

See `examples/chat/` for a complete working example.

## Development

```bash
# Install dependencies
npm install

# Build the player
npm run build

# Run development server (if needed)
npm run dev
```

## Building

The project uses Webpack to bundle the player:

```bash
npm run build
```

This creates `dist/vsrc-player.js` which includes:
- VSRCPlayer wrapper
- video.js library
- All necessary CSS

## Browser Support

VSRCPlayer supports all modern browsers that support:
- HTML5 video
- ES6 JavaScript
- video.js 8.x

## License

ISC

## Credits

Built on top of [video.js](https://videojs.com/) - An open source HTML5 video player.