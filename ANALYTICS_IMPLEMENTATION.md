# VSRCPlayer Analytics Implementation

## Overview

This document summarizes the player-side analytics implementation for VSRCPlayer that sends data to `api.vsrc.video`.

## Implementation Details

### Core Features

1. **Always Enabled**: Analytics cannot be disabled and is initialized automatically when the player is created
2. **Dual Transport**: Uses WebSocket (primary) with automatic AJAX fallback
3. **Event Batching**: Non-critical events are batched to reduce network overhead
4. **Auto-Reconnect**: WebSocket automatically reconnects after disconnection
5. **Clean Disposal**: Analytics properly cleaned up when player is disposed

### Endpoints

- **WebSocket**: `wss://api.vsrc.video/ws/analytics`
- **AJAX Fallback**: `https://api.vsrc.video/api/analytics/event`

### Tracked Events

The following events are automatically tracked:

| Event | Trigger | Priority |
|-------|---------|----------|
| `play` | Video starts playing | Batched |
| `pause` | Video is paused | Batched |
| `seek` | User seeks to different position | Batched |
| `ended` | Video playback completes | Immediate |
| `error` | Playback error occurs | Immediate |
| `buffer` | Video buffering/waiting | Batched |

### Data Collected

For each event, the following data is sent:

```javascript
{
  sessionId: "session_1234567890_abc123",  // Auto-generated
  mediaId: "video-456",                     // Required
  eventType: "play",
  currentTime: 10.5,
  duration: 120.0,
  quality: null,                            // Future use
  bufferDuration: null,                     // For buffer events
  errorMessage: null,                       // For error events
  metadata: null                            // Custom metadata
}
```

### Batching Configuration

- **Batch Size**: 10 events
- **Batch Interval**: 5 seconds
- **Critical Events**: `error` and `ended` are sent immediately, bypassing the batch queue

## Usage

### Basic Usage

```javascript
const player = new VSRCPlayer('#my-player', {
    type: 'vod',
    mediaId: 'video-456'     // Required - generates source URL
});
```

### With All Options

```javascript
const player = new VSRCPlayer('#my-player', {
    type: 'live',
    mediaId: 'content-id-123',  // Required
    onReady: (player) => {
        console.log('Player ready with analytics enabled');
        console.log('Session ID:', player.analytics.sessionId);
    }
});
```

## Code Structure

### AnalyticsReporter Class

Located at the top of `src/vsrc-player.js`:

- **Constructor**: Initializes WebSocket, session ID, and batch timer
- **_initWebSocket()**: Establishes WebSocket connection with auto-reconnect
- **_startBatchTimer()**: Starts the event batching timer
- **_flushQueue()**: Sends batched events via WebSocket or AJAX
- **_sendViaAjax()**: Sends single event via AJAX (fallback method)
- **track()**: Main method to track events
- **destroy()**: Cleanup method that flushes remaining events and closes connections

### Integration Points

1. **Constructor**: Added `mediaId` option (required), initialized `this.analytics`
2. **_init()**: Calls `_initAnalytics()` after player initialization
3. **_initAnalytics()**: Sets up event listeners for all tracked events
4. **dispose()**: Calls `analytics.destroy()` for cleanup

## Files Modified

1. **src/vsrc-player.js**: Added AnalyticsReporter class and integration
2. **README.md**: Added analytics documentation
3. **examples/analytics.html**: Created demonstration page

## Testing

Run the verification test:

```bash
node /tmp/test-analytics-implementation.js
```

Open the example page:

```bash
# Build the player first
npm run build

# Open examples/analytics.html in a browser
```

## Notes

- Analytics is always enabled and cannot be disabled per requirements
- The endpoint `api.vsrc.video` is hardcoded (not configurable)
- WebSocket uses secure connection (wss://) and AJAX uses HTTPS
- Session ID is unique per player instance
- All console output is prefixed with "VSRCPlayer Analytics:" for easy identification

## Security Considerations

- All communication uses secure protocols (WSS/HTTPS)
- No sensitive data is sent (only playback events and optional IDs)
- Failed requests fail silently to not disrupt playback
- No credentials or authentication tokens are sent

## Performance

- Event batching reduces network requests
- Critical events (errors, ended) bypass batching for immediate reporting
- WebSocket connection is reused for all events in a session
- Automatic fallback ensures no data loss if WebSocket fails
