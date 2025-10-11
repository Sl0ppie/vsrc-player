# Analytics Integration Guide

This guide explains how to integrate the new analytics tracking system into the VSRC application.

## Overview

The analytics system tracks video playback events from the player and sends them to the backend via:
1. **WebSocket** (primary) - Real-time connection that automatically uses the current hostname
2. **AJAX** (fallback) - HTTP POST to `/api/analytics/event` when WebSocket is unavailable

**Automatic Hostname Detection:** The system now automatically detects the hostname from `window.location.hostname`, so it works seamlessly when deployed to any server without configuration changes.

## Backend Setup

### 1. Database Migration

The Analytics model will be automatically created when the backend starts. It includes:

**Table: `analytics`**
- `id` - Primary key
- `session_id` - Unique session identifier (indexed)
- `user_id` - User ID (optional, indexed)
- `media_id` - Media/Video ID (optional, indexed)
- `event_type` - Type of event (play, pause, stop, seek, ended, error, buffer, quality_change)
- `user_ip` - Client IP address
- `user_agent` - Client user agent string
- `current_time` - Current playback position
- `duration` - Video duration
- `quality` - Video quality setting
- `buffer_duration` - Duration of buffering event
- `error_message` - Error message for error events
- `metadata` - Additional JSON metadata
- `created_at` - Timestamp
- `updated_at` - Timestamp

### 2. API Endpoints

**WebSocket Endpoint:**
```
ws://localhost:5001/ws/analytics
```

**HTTP Endpoints:**
- `POST /api/analytics/event` - Single event submission (AJAX fallback)
- `POST /api/analytics/batch` - Batch event submission
- `GET /api/analytics/stats` - Get analytics statistics (requires auth)

### 3. Backend Server

The WebSocket server is automatically initialized when the backend starts. No additional configuration needed.

## Frontend Integration

### Option 1: Using the Player Package (Recommended)

If using the `@vsrc/player` package:

```javascript
import { createHLSPlayerWithAnalytics, disposePlayerWithAnalytics } from '@vsrc/player';

// Create player with analytics
const { player, analyticsReporter } = createHLSPlayerWithAnalytics(
  videoElement,
  'https://example.com/stream.m3u8',
  {
    analytics: {
      userId: currentUser?.id,
      mediaId: videoId,
      // URLs are optional - automatically detects hostname if not provided
      // wsUrl: 'ws://custom-server.com:5001/ws/analytics',
      // ajaxUrl: 'http://custom-server.com:5001/api/analytics/event',
    }
  }
);

// Later, when cleaning up:
disposePlayerWithAnalytics({ player, analyticsReporter });
```

### Option 2: Manual Integration with Existing Video.js

For the existing Live.js component or other Video.js instances:

```javascript
import videojs from 'video.js';

// Create a simple analytics tracker
class SimpleAnalyticsTracker {
  constructor(sessionId, userId, mediaId) {
    this.sessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.userId = userId;
    this.mediaId = mediaId;
    // Automatically use current hostname
    this.wsUrl = `ws://${window.location.hostname}:5001/ws/analytics`;
    this.ajaxUrl = `http://${window.location.hostname}:5001/api/analytics/event`;
    this.ws = null;
    
    this.initWebSocket();
  }
  
  initWebSocket() {
    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('Analytics WebSocket connected');
      };
      
      this.ws.onerror = () => {
        console.log('WebSocket error, will use AJAX fallback');
        this.ws = null;
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket closed, will use AJAX fallback');
        this.ws = null;
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this.ws = null;
    }
  }
  
  async track(eventType, data = {}) {
    const event = {
      sessionId: this.sessionId,
      userId: this.userId,
      mediaId: this.mediaId,
      eventType,
      currentTime: data.currentTime,
      duration: data.duration,
      errorMessage: data.errorMessage,
    };
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'event', payload: event }));
    } else {
      // AJAX fallback
      try {
        await fetch(this.ajaxUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
      } catch (error) {
        console.error('Failed to send analytics:', error);
      }
    }
  }
  
  destroy() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Usage in React component:
function VideoPlayer({ hlsUrl, userId, mediaId }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const analyticsRef = useRef(null);
  
  useEffect(() => {
    if (videoRef.current) {
      // Create player
      playerRef.current = videojs(videoRef.current, {
        controls: true,
        autoplay: false,
        preload: 'auto',
        sources: [{ src: hlsUrl, type: 'application/x-mpegURL' }]
      });
      
      // Create analytics tracker
      analyticsRef.current = new SimpleAnalyticsTracker(null, userId, mediaId);
      
      // Track events
      const player = playerRef.current;
      const analytics = analyticsRef.current;
      
      player.on('play', () => {
        analytics.track('play', {
          currentTime: player.currentTime(),
          duration: player.duration(),
        });
      });
      
      player.on('pause', () => {
        analytics.track('pause', {
          currentTime: player.currentTime(),
          duration: player.duration(),
        });
      });
      
      player.on('ended', () => {
        analytics.track('ended', {
          currentTime: player.currentTime(),
          duration: player.duration(),
        });
      });
      
      player.on('error', () => {
        const error = player.error();
        analytics.track('error', {
          currentTime: player.currentTime(),
          duration: player.duration(),
          errorMessage: error ? `${error.code}: ${error.message}` : 'Unknown error',
        });
      });
    }
    
    return () => {
      if (analyticsRef.current) {
        analyticsRef.current.destroy();
      }
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, [hlsUrl, userId, mediaId]);
  
  return <video ref={videoRef} className="video-js"></video>;
}
```

## Event Types

The following event types are automatically tracked:

- **play** - User starts playing the video
- **pause** - User pauses the video
- **stop** - User stops playback (manually tracked)
- **seek** - User seeks to a different position
- **ended** - Video playback completes naturally
- **error** - Playback error occurs
- **buffer** - Video buffering/waiting event
- **quality_change** - Video quality changes (if supported)

## Data Collected

For each event, the following data is captured:

- **sessionId** - Unique session identifier
- **userId** - Authenticated user ID (if available)
- **mediaId** - Video/media identifier
- **eventType** - Type of event
- **userIp** - Client IP address (captured server-side)
- **userAgent** - Client user agent (captured server-side)
- **currentTime** - Current playback position (seconds)
- **duration** - Total video duration (seconds)
- **quality** - Current quality setting
- **bufferDuration** - Duration of buffering (for buffer events)
- **errorMessage** - Error details (for error events)
- **metadata** - Additional custom data (JSON)
- **timestamp** - When the event occurred

## Viewing Analytics

### Get Statistics

```javascript
// Get overall stats
fetch('http://localhost:5001/api/analytics/stats')
  .then(res => res.json())
  .then(data => console.log(data));

// Get stats for specific session
fetch('http://localhost:5001/api/analytics/stats?sessionId=session_123')
  .then(res => res.json())
  .then(data => console.log(data));

// Get stats for specific media
fetch('http://localhost:5001/api/analytics/stats?mediaId=video_456')
  .then(res => res.json())
  .then(data => console.log(data));

// Get stats for date range
fetch('http://localhost:5001/api/analytics/stats?startDate=2024-01-01&endDate=2024-01-31')
  .then(res => res.json())
  .then(data => console.log(data));
```

Response format:
```json
{
  "success": true,
  "data": {
    "totalEvents": 1234,
    "uniqueSessions": 56,
    "eventCounts": {
      "play": 200,
      "pause": 150,
      "seek": 80,
      "ended": 40,
      "error": 5,
      "buffer": 30
    }
  }
}
```

## Testing

### Test WebSocket Connection

```javascript
// Automatically uses current hostname
const wsUrl = `ws://${window.location.hostname}:5001/ws/analytics`;
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  console.log('Connected');
  
  // Send test event
  ws.send(JSON.stringify({
    type: 'event',
    payload: {
      sessionId: 'test_session',
      eventType: 'play',
      currentTime: 10.5,
      duration: 120,
    }
  }));
};

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

### Test AJAX Endpoint

```javascript
// Automatically uses current hostname
const apiUrl = `http://${window.location.hostname}:5001/api/analytics/event`;
fetch(apiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'test_session',
    eventType: 'play',
    currentTime: 10.5,
    duration: 120,
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

## Production Considerations

1. **✅ Hostname Auto-Detection**: The system now automatically detects the hostname - no hardcoded URLs!
2. **Enable HTTPS/WSS**: Use secure WebSocket (wss://) in production by configuring SSL/TLS on your backend
3. **Add Authentication**: Include JWT token for authenticated analytics (already supports optional auth)
4. **Rate Limiting**: Backend already has rate limiting configured
5. **Data Retention**: Consider archiving old analytics data
6. **Privacy**: Comply with GDPR/privacy regulations for IP address storage

## Environment Configuration

**Backend (.env):**

```env
# Backend already configured, no additional env vars needed
# Analytics WebSocket runs on same port as HTTP server
PORT=5001
```

**Frontend (Optional Override):**

The system automatically uses `window.location.hostname`, but you can override if needed:

```javascript
const ANALYTICS_CONFIG = {
  // No need to configure URLs - they auto-detect!
  // Or override if needed:
  // wsUrl: 'ws://custom-server.com:5001/ws/analytics',
  // ajaxUrl: 'http://custom-server.com:5001/api/analytics/event',
  useBatching: true,
  batchSize: 10,
  batchInterval: 5000,
};
```
