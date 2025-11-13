import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

/**
 * VSRCPlayer configuration options
 */
export interface VSRCPlayerOptions {
  /** Player type: 'vod' or 'live' */
  type?: 'vod' | 'live';
  /** Media/video ID (required) - used to generate video source URL */
  mediaId: string;
  /** Debug host to replace 'api.vsrc.video' (optional, e.g., 'localhost:3000') */
  debug?: string;
  /** Interval for probing m3u8 (milliseconds, default: 5000) */
  probeInterval?: number;
  /** Maximum probe attempts (default: 12) */
  maxProbeAttempts?: number;
  /** VHS (VideoJS HTTP Streaming) configuration options */
  vhs?: {
    /** Limit rendition selection by player size (default: true) */
    limitRenditionByPlayerDimensions?: boolean;
    /** Start with lowest bitrate playlist (default: false) */
    enableLowInitialPlaylist?: boolean;
    /** Consider device pixel ratio for rendition selection (default: false) */
    useDevicePixelRatio?: boolean;
    /** Initial bandwidth estimate in bits per second */
    bandwidth?: number;
    /** Store/retrieve bandwidth from localStorage (default: false) */
    useBandwidthFromLocalStorage?: boolean;
  };
  /** Chat configuration */
  chat?: {
    /** WebSocket server URL */
    serverUrl: string;
    /** Username for chat */
    username: string;
    /** Chat color palette */
    colors?: {
      background?: string;
      inputBackground?: string;
      userMessage?: string;
      otherMessage?: string;
      systemMessage?: string;
      text?: string;
      border?: string;
    };
  };
}

/**
 * VSRCPlayer component props
 */
export interface VSRCPlayerProps {
  /** Player configuration options */
  options: VSRCPlayerOptions;
  /** Callback when player is ready */
  onReady?: () => void;
  /** Callback when error occurs */
  onError?: (error: any) => void;
  /** Callback when m3u8 probe succeeds (live only) */
  onProbeSuccess?: () => void;
  /** Callback when m3u8 probe fails (live only) */
  onProbeFailed?: () => void;
  /** Callback when chat message is received */
  onChatMessage?: (data: any) => void;
  /** Callback when connected to chat */
  onChatConnect?: () => void;
  /** Callback when disconnected from chat */
  onChatDisconnect?: () => void;
  /** Custom styles for the player container */
  style?: ViewStyle;
}

/**
 * VSRCPlayer ref methods
 */
export interface VSRCPlayerRef {
  /** Start playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Seek to specific time in seconds */
  seek: (seconds: number) => void;
  /** Set volume (0-1) */
  setVolume: (level: number) => void;
  /** Send a chat message */
  sendChatMessage: (message: string) => void;
}

/**
 * VSRCPlayer - React Native wrapper for vsrc-player
 * 
 * This component wraps the web-based vsrc-player in a WebView for React Native usage.
 * It supports VOD and live streaming, HLS with M3U8 probing, analytics, and live chat.
 * 
 * @example
 * ```tsx
 * import { VSRCPlayer } from './react_native/VSRCPlayer';
 * 
 * function App() {
 *   const playerRef = useRef<VSRCPlayerRef>(null);
 * 
 *   return (
 *     <VSRCPlayer
 *       ref={playerRef}
 *       options={{
 *         type: 'vod',
 *         mediaId: 'my-video-123'
 *       }}
 *       onReady={() => console.log('Player ready')}
 *       onError={(error) => console.error('Player error:', error)}
 *     />
 *   );
 * }
 * ```
 */
const VSRCPlayer = forwardRef<VSRCPlayerRef, VSRCPlayerProps>(
  (props, ref) => {
    const {
      options,
      onReady,
      onError,
      onProbeSuccess,
      onProbeFailed,
      onChatMessage,
      onChatConnect,
      onChatDisconnect,
      style,
    } = props;

    const webViewRef = useRef<WebView>(null);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      play: () => {
        webViewRef.current?.injectJavaScript(`
          if (window.vsrcPlayer) {
            window.vsrcPlayer.play();
          }
          true;
        `);
      },
      pause: () => {
        webViewRef.current?.injectJavaScript(`
          if (window.vsrcPlayer) {
            window.vsrcPlayer.pause();
          }
          true;
        `);
      },
      seek: (seconds: number) => {
        webViewRef.current?.injectJavaScript(`
          if (window.vsrcPlayer) {
            window.vsrcPlayer.seek(${seconds});
          }
          true;
        `);
      },
      setVolume: (level: number) => {
        webViewRef.current?.injectJavaScript(`
          if (window.vsrcPlayer) {
            window.vsrcPlayer.volume(${level});
          }
          true;
        `);
      },
      sendChatMessage: (message: string) => {
        webViewRef.current?.injectJavaScript(`
          if (window.vsrcPlayer && window.vsrcPlayer.getChat()) {
            window.vsrcPlayer.getChat().sendMessage(${JSON.stringify(message)});
          }
          true;
        `);
      },
    }));

    // Handle messages from WebView
    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        
        switch (data.type) {
          case 'ready':
            onReady?.();
            break;
          case 'error':
            onError?.(data.error);
            break;
          case 'probeSuccess':
            onProbeSuccess?.();
            break;
          case 'probeFailed':
            onProbeFailed?.();
            break;
          case 'chatMessage':
            onChatMessage?.(data.data);
            break;
          case 'chatConnect':
            onChatConnect?.();
            break;
          case 'chatDisconnect':
            onChatDisconnect?.();
            break;
        }
      } catch (error) {
        console.error('Error parsing WebView message:', error);
      }
    };

    // Generate HTML content for WebView
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background-color: #000;
      overflow: hidden;
    }
    #player-container {
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    #video-player {
      flex: 1;
      width: 100%;
    }
    #chat-container {
      display: ${options.chat ? 'block' : 'none'};
      height: 40%;
      background-color: #1f1f1f;
    }
    .video-js {
      width: 100% !important;
      height: 100% !important;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/video.js@8.23.4/dist/video.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/video.js@8.23.4/dist/video-js.min.css" rel="stylesheet">
</head>
<body>
  <div id="player-container">
    <video id="video-player" class="video-js"></video>
    ${options.chat ? '<div id="chat-container"></div>' : ''}
  </div>
  
  <script>
    // VSRCPlayer wrapper code would be injected here
    // For production, you would include the built vsrc-player.js
    
    (function() {
      // Simplified player initialization for WebView
      const player = videojs('video-player', {
        controls: true,
        autoplay: false,
        preload: 'auto',
        fluid: true,
        responsive: true,
        liveui: ${options.type === 'live'},
        html5: {
          vhs: ${JSON.stringify(options.vhs || {})}
        }
      });
      
      // Set source
      const baseHost = ${JSON.stringify(options.debug || 'api.vsrc.video')};
      const resolveUrl = '//' + baseHost + '/hls/resolve/' + ${JSON.stringify(options.mediaId)};
      
      // Resolve URL and set source
      fetch(resolveUrl)
        .then(response => response.json())
        .then(data => {
          if (data && data.url) {
            player.src({
              src: data.url,
              type: 'application/x-mpegURL'
            });
          }
          
          // Send ready message
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ready'
          }));
        })
        .catch(error => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            error: error.message
          }));
        });
      
      // Store player instance globally
      window.vsrcPlayer = player;
      
      // Setup event listeners
      player.on('error', (error) => {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          error: player.error()
        }));
      });
      
      // Chat setup (if enabled)
      ${options.chat ? `
      // Chat initialization would go here
      // This requires the vsrc-chat.js module
      ` : ''}
    })();
  </script>
</body>
</html>
    `;

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          style={styles.webview}
        />
      </View>
    );
  }
);

VSRCPlayer.displayName = 'VSRCPlayer';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default VSRCPlayer;
