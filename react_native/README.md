# VSRCPlayer React Native Wrapper

React Native wrapper component for vsrc-player, providing VOD and live streaming capabilities with HLS support, analytics, and live chat.

## Features

- 🎬 **VOD Support** - Full support for Video on Demand playback
- 📡 **Live Streaming** - HLS (HTTP Live Streaming) with automatic M3U8 probing
- 🔄 **Smart Probing** - Automatically probe for M3U8 files at configurable intervals
- 💬 **Live Chat** - WebSocket-based real-time chat support
- 📊 **Built-in Analytics** - Automatic event tracking
- ⚡ **Event-Driven** - Rich callback system for lifecycle events
- 🎨 **Customizable** - Configurable options for adaptive bitrate streaming

## Installation

```bash
# Install peer dependencies
npm install react-native-webview

# Or with yarn
yarn add react-native-webview
```

### iOS Setup

For iOS, you need to link the WebView:

```bash
cd ios && pod install && cd ..
```

### Android Setup

No additional setup required for Android.

## Quick Start

### Basic VOD Usage

```tsx
import React, { useRef } from 'react';
import { View, Button } from 'react-native';
import { VSRCPlayer, VSRCPlayerRef } from './react_native';

function App() {
  const playerRef = useRef<VSRCPlayerRef>(null);

  const handlePlay = () => {
    playerRef.current?.play();
  };

  const handlePause = () => {
    playerRef.current?.pause();
  };

  return (
    <View style={{ flex: 1 }}>
      <VSRCPlayer
        ref={playerRef}
        options={{
          type: 'vod',
          mediaId: 'my-video-123'
        }}
        onReady={() => console.log('Player is ready!')}
        onError={(error) => console.error('Player error:', error)}
      />
      <View style={{ flexDirection: 'row', padding: 10 }}>
        <Button title="Play" onPress={handlePlay} />
        <Button title="Pause" onPress={handlePause} />
      </View>
    </View>
  );
}

export default App;
```

### Live Streaming with Probing

```tsx
import React from 'react';
import { View } from 'react-native';
import { VSRCPlayer } from './react_native';

function LiveStream() {
  return (
    <View style={{ flex: 1 }}>
      <VSRCPlayer
        options={{
          type: 'live',
          mediaId: 'my-live-stream-456',
          probeInterval: 5000,        // Probe every 5 seconds
          maxProbeAttempts: 12,       // Maximum 12 attempts
        }}
        onProbeSuccess={() => console.log('Stream found and starting playback')}
        onProbeFailed={() => console.error('Stream not available')}
        onReady={() => console.log('Player ready')}
      />
    </View>
  );
}

export default LiveStream;
```

### Debug Mode (Local Development)

```tsx
<VSRCPlayer
  options={{
    type: 'vod',
    mediaId: 'my-video-123',
    debug: 'localhost:3000',  // Replaces api.vsrc.video with localhost:3000
  }}
  onReady={() => console.log('Player connected to debug server')}
/>
```

### Live Chat Integration

```tsx
import React from 'react';
import { View } from 'react-native';
import { VSRCPlayer } from './react_native';

function LiveStreamWithChat() {
  return (
    <View style={{ flex: 1 }}>
      <VSRCPlayer
        options={{
          type: 'live',
          mediaId: 'video-456',
          chat: {
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
            }
          }
        }}
        onChatMessage={(data) => console.log('New message:', data)}
        onChatConnect={() => console.log('Connected to chat')}
        onReady={() => console.log('Player ready with chat')}
      />
    </View>
  );
}

export default LiveStreamWithChat;
```

## Configuration Options

### VSRCPlayerOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `type` | `'vod' \| 'live'` | `'vod'` | Player type |
| `mediaId` | `string` | **required** | Media/video ID - used to generate source URL: `//api.vsrc.video/hls/resolve/<mediaId>` |
| `debug` | `string` | `null` | Debug host to replace `api.vsrc.video` (e.g., `'localhost:3000'`) |
| `probeInterval` | `number` | `5000` | Probe interval in milliseconds (live only) |
| `maxProbeAttempts` | `number` | `12` | Maximum probe attempts (live only) |
| `vhs` | `object` | - | VHS (adaptive bitrate) configuration options |
| `chat` | `object` | - | Chat configuration options |

### VHS Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `vhs.limitRenditionByPlayerDimensions` | `boolean` | `true` | Limit rendition selection by player size |
| `vhs.enableLowInitialPlaylist` | `boolean` | `false` | Start with lowest bitrate playlist |
| `vhs.useDevicePixelRatio` | `boolean` | `false` | Consider device pixel ratio for high-DPI displays |
| `vhs.bandwidth` | `number` | - | Initial bandwidth estimate in bits per second |
| `vhs.useBandwidthFromLocalStorage` | `boolean` | `false` | Store/retrieve bandwidth from localStorage |

## Component Props

### VSRCPlayerProps

| Prop | Type | Description |
|------|------|-------------|
| `options` | `VSRCPlayerOptions` | Player configuration options (required) |
| `onReady` | `() => void` | Callback when player is ready |
| `onError` | `(error: any) => void` | Callback when error occurs |
| `onProbeSuccess` | `() => void` | Callback when M3U8 probe succeeds (live only) |
| `onProbeFailed` | `() => void` | Callback when all probe attempts fail (live only) |
| `onChatMessage` | `(data: any) => void` | Callback when chat message is received |
| `onChatConnect` | `() => void` | Callback when connected to chat |
| `onChatDisconnect` | `() => void` | Callback when disconnected from chat |
| `style` | `ViewStyle` | Custom styles for the player container |

## Ref Methods

Access player controls via ref:

```tsx
const playerRef = useRef<VSRCPlayerRef>(null);

// Available methods:
playerRef.current?.play();              // Start playback
playerRef.current?.pause();             // Pause playback
playerRef.current?.seek(30);            // Seek to 30 seconds
playerRef.current?.setVolume(0.5);      // Set volume to 50%
playerRef.current?.sendChatMessage('Hello!'); // Send chat message
```

## Example with Full Controls

```tsx
import React, { useRef } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { VSRCPlayer, VSRCPlayerRef } from './react_native';

function FullControlsExample() {
  const playerRef = useRef<VSRCPlayerRef>(null);

  return (
    <View style={styles.container}>
      <VSRCPlayer
        ref={playerRef}
        options={{
          type: 'vod',
          mediaId: 'my-video-123',
          vhs: {
            limitRenditionByPlayerDimensions: true,
            enableLowInitialPlaylist: true,
            useDevicePixelRatio: false,
            bandwidth: 5000000  // 5 Mbps initial estimate
          }
        }}
        onReady={() => console.log('Player ready')}
        onError={(error) => console.error('Error:', error)}
        style={styles.player}
      />
      
      <View style={styles.controls}>
        <Button title="Play" onPress={() => playerRef.current?.play()} />
        <Button title="Pause" onPress={() => playerRef.current?.pause()} />
        <Button title="Seek 30s" onPress={() => playerRef.current?.seek(30)} />
        <Button title="Volume 50%" onPress={() => playerRef.current?.setVolume(0.5)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  player: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
});

export default FullControlsExample;
```

## Analytics

VSRCPlayer includes built-in analytics tracking that is **always enabled** and sends data to `api.vsrc.video`. The following events are automatically tracked:

- **play** - When video playback starts
- **pause** - When video is paused
- **seek** - When user seeks to a different position
- **ended** - When video playback completes
- **error** - When a playback error occurs
- **buffer** - When video buffering occurs

Analytics cannot be disabled and is a core feature of the player.

## Platform Support

- **iOS**: ✅ Supported (requires react-native-webview)
- **Android**: ✅ Supported (requires react-native-webview)

## Requirements

- React Native >= 0.60.0
- react-native-webview >= 11.0.0
- React >= 16.8.0 (for hooks support)

## Architecture

The React Native wrapper uses WebView to embed the web-based vsrc-player. Communication between React Native and the web player is handled via:

1. **JavaScript injection** - For controlling the player (play, pause, seek, etc.)
2. **postMessage** - For receiving events from the player (ready, error, etc.)

This approach provides:
- Full compatibility with the web-based vsrc-player features
- Seamless integration with React Native applications
- Access to video.js capabilities and plugins

## Troubleshooting

### Video not playing on iOS

Make sure `mediaPlaybackRequiresUserAction` is set to `false` in the WebView component (already configured in the wrapper).

### WebView not loading

Ensure you have installed and linked `react-native-webview`:

```bash
npm install react-native-webview
cd ios && pod install && cd ..
```

### Analytics not working

The analytics system requires network access to `api.vsrc.video`. Make sure your app has appropriate network permissions and the analytics endpoint is reachable.

## License

ISC

## Credits

Built on top of:
- [vsrc-player](https://github.com/Sl0ppie/vsrc-player) - HTML5 video player
- [video.js](https://videojs.com/) - Open source HTML5 video player
- [react-native-webview](https://github.com/react-native-webview/react-native-webview) - WebView for React Native
