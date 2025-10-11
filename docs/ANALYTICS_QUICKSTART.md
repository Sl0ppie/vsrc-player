# Analytics Quick Start Guide

## TL;DR

Analytics tracking for video playback has been implemented. It automatically tracks play, pause, seek, ended, error, buffer, and quality_change events via WebSocket (with AJAX fallback).

## Quick Setup

### 1. Backend (Already Configured)

The backend automatically starts with analytics support:

```bash
cd backend
npm install  # ws package already added
npm start    # WebSocket server starts automatically
```

### 2. Frontend - Live.js (Already Integrated)

The Live streaming component already has analytics integrated. No additional setup needed.

### 3. Test It

```bash
# Test HTTP endpoints
node /tmp/test-analytics.js

# Test WebSocket
node /tmp/test-websocket.js
```

## Using Analytics in New Components

### Option 1: With Player Package (Recommended)

```javascript
import { createHLSPlayerWithAnalytics } from '@vsrc/player';

const { player, analyticsReporter } = createHLSPlayerWithAnalytics(
  videoElement,
  'https://example.com/stream.m3u8',
  {
    analytics: {
      userId: currentUser?.id,
      mediaId: videoId,
    }
  }
);

// Cleanup
disposePlayerWithAnalytics({ player, analyticsReporter });
```

### Option 2: Manual Integration (Like Live.js)

```javascript
// Initialize WebSocket - automatically uses current hostname
const wsUrl = `ws://${window.location.hostname}:5001/ws/analytics`;
const ws = new WebSocket(wsUrl);
const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Track events
function trackEvent(eventType, data) {
  const event = {
    sessionId,
    eventType,
    currentTime: data.currentTime,
    duration: data.duration,
  };
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'event', payload: event }));
  } else {
    // AJAX fallback - automatically uses current hostname
    const ajaxUrl = `http://${window.location.hostname}:5001/api/analytics/event`;
    fetch(ajaxUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  }
}

// Add to player events
player.on('play', () => {
  trackEvent('play', {
    currentTime: player.currentTime(),
    duration: player.duration(),
  });
});
```

## Viewing Analytics Data

### Quick Stats

```bash
curl http://localhost:5001/api/analytics/stats
```

### Database Queries

```sql
-- Recent events
SELECT * FROM analytics ORDER BY created_at DESC LIMIT 20;

-- Events by type
SELECT event_type, COUNT(*) as count 
FROM analytics 
GROUP BY event_type;

-- Unique sessions today
SELECT COUNT(DISTINCT session_id) 
FROM analytics 
WHERE DATE(created_at) = CURDATE();
```

## Event Types

| Event | When It Fires | Key Data |
|-------|--------------|----------|
| `play` | Video starts playing | currentTime, duration |
| `pause` | Video is paused | currentTime, duration |
| `seek` | User seeks to different position | currentTime, duration |
| `ended` | Video completes | currentTime, duration |
| `error` | Playback error | errorMessage |
| `buffer` | Video buffering | bufferDuration |

## Endpoints

### WebSocket (Primary)
```
ws://<your-hostname>:5001/ws/analytics
```

Automatically connects to the backend on the same hostname as your frontend.

### HTTP (Fallback)
```
POST http://<your-hostname>:5001/api/analytics/event
POST http://<your-hostname>:5001/api/analytics/batch
GET  http://<your-hostname>:5001/api/analytics/stats
```

All endpoints automatically adapt to your deployment hostname.

## Configuration

### Backend (.env)
```env
# Already configured - no changes needed
PORT=5001
```

### Frontend

**Automatic Hostname Detection:**

The analytics system now automatically detects the hostname from the browser's URL. No configuration needed!

- When you access the app at `http://yourserver.com:3000`, analytics will connect to `ws://yourserver.com:5001`
- When you access the app at `http://localhost:3000`, analytics will connect to `ws://localhost:5001`

**Manual Configuration (Optional):**

If you need to override the default URLs, you can specify them manually:

```javascript
// Using the AnalyticsReporter class
const analyticsReporter = new AnalyticsReporter({
  wsUrl: 'ws://custom-server.com:5001/ws/analytics',
  ajaxUrl: 'http://custom-server.com:5001/api/analytics/event',
});

// Or when creating a player with analytics
const { player, analyticsReporter } = createHLSPlayerWithAnalytics(
  videoElement,
  hlsUrl,
  {
    analytics: {
      wsUrl: 'ws://custom-server.com:5001/ws/analytics',
      ajaxUrl: 'http://custom-server.com:5001/api/analytics/event',
    }
  }
);
```

**Environment Variables (Docker):**

The Analytics component also respects `REACT_APP_API_URL` for HTTP calls:

```yaml
# In docker-compose.yml
frontend:
  build:
    args:
      REACT_APP_API_URL: http://your-backend-url:5001
```


## Troubleshooting

### WebSocket Not Connecting?
1. Check backend is running on port 5001
2. Check firewall/network settings
3. Verify WebSocket URL is correct
4. System will automatically fall back to AJAX

### No Data in Database?
1. Check database connection in backend logs
2. Verify Analytics table exists (`npm start` creates it)
3. Check for validation errors in backend logs
4. Verify event format matches API requirements

### High Latency?
1. Enable batching (default: on)
2. Increase batch size (default: 10)
3. Use WebSocket instead of AJAX
4. Check network conditions

## Production Checklist

- [x] ✅ Hostname automatically detected - no hardcoded localhost
- [ ] Use secure WebSocket (wss://) - Requires HTTPS/SSL on backend
- [ ] Add authentication to analytics endpoints (optional - currently uses optionalAuth)
- [x] ✅ Database indexes already configured
- [ ] Configure data retention policy
- [ ] Enable HTTPS/SSL on backend and frontend
- [ ] Set up monitoring
- [ ] Configure backup strategy

## Documentation

- **Full Integration Guide:** `ANALYTICS_INTEGRATION.md`
- **Testing Guide:** `ANALYTICS_TESTING.md`
- **Architecture:** `ANALYTICS_ARCHITECTURE.md`
- **Summary:** `ANALYTICS_SUMMARY.md`

## Support

- Check backend logs: `backend/src/server.js`
- Check browser console: Network tab for WebSocket/AJAX
- Database: `SELECT * FROM analytics;`
- Health check: `http://localhost:5001/health`

## Example: Complete Implementation

```javascript
// In your React component
import { useEffect, useRef } from 'react';
import videojs from 'video.js';

function VideoPlayer({ hlsUrl, userId }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    // Create player
    playerRef.current = videojs(videoRef.current, {
      controls: true,
      sources: [{ src: hlsUrl, type: 'application/x-mpegURL' }]
    });

    // Setup analytics - automatically uses current hostname
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const wsUrl = `ws://${window.location.hostname}:5001/ws/analytics`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const track = (eventType, data = {}) => {
      const event = {
        sessionId,
        userId,
        eventType,
        currentTime: data.currentTime,
        duration: data.duration,
      };

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'event', payload: event }));
      } else {
        fetch('http://localhost:5001/api/analytics/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
      }
    };

    const player = playerRef.current;
    player.on('play', () => track('play', { currentTime: player.currentTime(), duration: player.duration() }));
    player.on('pause', () => track('pause', { currentTime: player.currentTime(), duration: player.duration() }));
    player.on('ended', () => track('ended', { currentTime: player.currentTime(), duration: player.duration() }));

    return () => {
      ws.close();
      player.dispose();
    };
  }, [hlsUrl, userId]);

  return <video ref={videoRef} className="video-js" />;
}
```

## What's Next?

1. **Dashboard:** Create analytics visualization dashboard
2. **Reports:** Add daily/weekly email reports
3. **Alerts:** Set up error rate alerts
4. **Export:** Add data export functionality
5. **Heatmaps:** Visualize seek patterns
6. **A/B Testing:** Compare different player configurations

## Files Reference

### Backend
- `backend/src/models/Analytics.js` - Database model
- `backend/src/routes/analytics.js` - HTTP endpoints
- `backend/src/lib/analyticsWebSocket.js` - WebSocket server
- `backend/src/server.js` - Server integration

### Frontend
- `frontend/src/components/Live.js` - Example integration

### Player Package
- `player/index.js` - AnalyticsReporter class
- `player/analytics-example.js` - Usage examples

### Tests
- `/tmp/test-analytics.js` - HTTP endpoint tests
- `/tmp/test-websocket.js` - WebSocket tests
