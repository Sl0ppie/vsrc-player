# Analytics Testing Guide

This guide provides instructions for testing the analytics functionality in VSRC.

## Prerequisites

Before testing, ensure:
1. Backend server is running (`cd backend && npm start`)
2. Database is running (MySQL)
3. You have access to the API endpoints

## Test Scripts

Two test scripts are provided:

### 1. HTTP Endpoint Tests (`/tmp/test-analytics.js`)

Tests the AJAX/HTTP fallback endpoints:
- Health check
- Single event submission
- Batch event submission
- Analytics statistics retrieval
- Validation tests

**Run:**
```bash
node /tmp/test-analytics.js
```

**Expected Output:**
```
============================================================
📊 VSRC Analytics Endpoint Tests
============================================================

🧪 Testing health check endpoint...
✅ Health check passed

🧪 Testing single analytics event submission...
✅ Single event submission passed
   Event ID: 123

🧪 Testing batch analytics event submission...
✅ Batch event submission passed
   Events recorded: 3

🧪 Testing analytics stats endpoint...
✅ Analytics stats retrieval passed
   Total events: 10
   Unique sessions: 3
   Event counts: { play: 4, pause: 3, seek: 3 }

🧪 Testing invalid event type validation...
✅ Invalid event type validation passed (correctly rejected)

🧪 Testing missing required fields validation...
✅ Missing fields validation passed (correctly rejected)

============================================================
📊 Test Results: 6/6 tests passed
============================================================
✅ All tests passed!
```

### 2. WebSocket Tests (`/tmp/test-websocket.js`)

Tests the WebSocket real-time connection:
- WebSocket connection
- Single event transmission
- Batch event transmission
- Ping/pong heartbeat
- Error handling

**Run:**
```bash
node /tmp/test-websocket.js
```

**Expected Output:**
```
============================================================
📊 VSRC Analytics WebSocket Tests
============================================================

🔌 Connecting to WebSocket: ws://localhost:5001/ws/analytics
✅ WebSocket connection established
📨 Received message: { type: 'connected', message: '...', timestamp: ... }
✅ Received welcome message

🧪 Running WebSocket tests...

🧪 Test 1: Sending single play event...
📨 Received message: { type: 'ack', eventId: 123, ... }
✅ Event acknowledged (ID: 123)

🧪 Test 2: Sending pause event...
📨 Received message: { type: 'ack', eventId: 124, ... }
✅ Event acknowledged (ID: 124)

🧪 Test 3: Sending batch of events...
📨 Received message: { type: 'batch_ack', count: 3, ... }
✅ Batch acknowledged (3 events)

🧪 Test 4: Sending invalid event (missing sessionId)...
📨 Received message: { type: 'error', message: '...' }
❌ Error message: sessionId and eventType are required

🧪 Test 5: Sending ping...
📨 Received message: { type: 'pong', timestamp: ... }

🔌 Closing WebSocket connection...

🔌 WebSocket connection closed

============================================================
📊 Test Results: 3 passed, 1 failed
============================================================
```

## Manual Testing

### Test 1: Browser Console - WebSocket

Open browser console and run:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:5001/ws/analytics');

ws.onopen = () => {
  console.log('Connected');
  
  // Send a play event
  ws.send(JSON.stringify({
    type: 'event',
    payload: {
      sessionId: 'browser_test_' + Date.now(),
      eventType: 'play',
      currentTime: 10,
      duration: 120,
      mediaId: 'test_video'
    }
  }));
};

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

### Test 2: Browser Console - AJAX Fallback

```javascript
// Send analytics event via AJAX
fetch('http://localhost:5001/api/analytics/event', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'ajax_test_' + Date.now(),
    eventType: 'play',
    currentTime: 10,
    duration: 120,
    mediaId: 'test_video'
  })
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
```

### Test 3: Verify Data in Database

```sql
-- View recent analytics events
SELECT * FROM analytics ORDER BY created_at DESC LIMIT 10;

-- Count events by type
SELECT event_type, COUNT(*) as count 
FROM analytics 
GROUP BY event_type;

-- View unique sessions
SELECT COUNT(DISTINCT session_id) as unique_sessions 
FROM analytics;

-- View events for a specific session
SELECT * FROM analytics 
WHERE session_id = 'your_session_id' 
ORDER BY created_at;

-- View events by IP address
SELECT user_ip, COUNT(*) as event_count 
FROM analytics 
GROUP BY user_ip 
ORDER BY event_count DESC;
```

### Test 4: Test Live Player with Analytics

1. Start the backend server
2. Start the frontend (`cd frontend && npm start`)
3. Navigate to the Live streaming page
4. Generate a stream key
5. Open browser console
6. Look for analytics logs:
   - `📊 Analytics WebSocket connected` (if WebSocket works)
   - Or AJAX requests to `/api/analytics/event`
7. Interact with the player (play, pause, seek)
8. Check database for recorded events

## Testing Checklist

- [ ] Backend server starts without errors
- [ ] Analytics model is created in database
- [ ] WebSocket endpoint is accessible at `/ws/analytics`
- [ ] HTTP endpoint responds at `/api/analytics/event`
- [ ] Batch endpoint responds at `/api/analytics/batch`
- [ ] Stats endpoint responds at `/api/analytics/stats`
- [ ] WebSocket connection establishes successfully
- [ ] WebSocket receives and acknowledges events
- [ ] AJAX fallback works when WebSocket unavailable
- [ ] Play events are recorded
- [ ] Pause events are recorded
- [ ] Seek events are recorded
- [ ] Ended events are recorded
- [ ] Error events are recorded
- [ ] User IP is captured correctly
- [ ] User agent is captured correctly
- [ ] Session IDs are unique
- [ ] Batch events are processed correctly
- [ ] Invalid events are rejected
- [ ] Missing required fields are rejected
- [ ] Stats endpoint returns correct data
- [ ] Live.js player integrates analytics
- [ ] Frontend analytics connects via WebSocket
- [ ] Frontend falls back to AJAX when needed

## Troubleshooting

### WebSocket Connection Failed

**Symptom:** WebSocket fails to connect

**Solutions:**
1. Check backend server is running
2. Verify port 5001 is accessible
3. Check firewall settings
4. Ensure WebSocket URL is correct
5. Check browser console for CORS errors

### AJAX Requests Blocked by CORS

**Symptom:** AJAX requests fail with CORS error

**Solutions:**
1. Add frontend URL to backend CORS whitelist
2. Check `ALLOWED_ORIGINS` in backend `.env`
3. Verify CORS headers in response
4. Use credentials: true in fetch options

### Events Not Recorded in Database

**Symptom:** No analytics data in database

**Solutions:**
1. Check database connection
2. Verify Analytics model is synced
3. Check for database errors in backend logs
4. Ensure required fields are provided
5. Check event type is valid

### High Latency or Connection Drops

**Symptom:** Slow analytics or frequent disconnections

**Solutions:**
1. Enable event batching in player config
2. Increase batch size (default: 10)
3. Increase batch interval (default: 5000ms)
4. Check network connectivity
5. Monitor server resources

## Performance Considerations

### Recommended Settings

For optimal performance:

```javascript
// Player analytics configuration
{
  analytics: {
    useBatching: true,        // Enable batching
    batchSize: 10,            // Events per batch
    batchInterval: 5000,      // Flush every 5 seconds
    useWebSocket: true,       // Use WebSocket if available
  }
}
```

### Expected Load

- Single event: ~0.5 KB
- Batch (10 events): ~3-5 KB
- WebSocket overhead: Minimal
- Database writes: Batched

### Scaling Recommendations

For high traffic:

1. **Enable batching** to reduce database writes
2. **Use WebSocket** for lower overhead
3. **Implement data retention** policies
4. **Archive old analytics** to separate table
5. **Add database indexes** on frequently queried fields
6. **Consider Redis** for session tracking
7. **Use message queue** for async processing

## Monitoring

### Key Metrics to Track

1. **WebSocket Connections:** Active connections count
2. **Event Rate:** Events per second
3. **Error Rate:** Failed events percentage
4. **Database Performance:** Query times
5. **Storage Growth:** Analytics table size

### Log Messages to Watch

- `📊 Analytics WebSocket server initialized`
- `📊 New analytics WebSocket connection`
- `📊 Analytics WebSocket connection closed`
- `Error recording analytics event:`
- `Error handling analytics event:`

## Next Steps

After successful testing:

1. Configure production URLs in environment variables
2. Set up proper SSL/TLS for WebSocket (wss://)
3. Implement authentication for analytics endpoints
4. Set up data retention and archival policies
5. Create analytics dashboard for visualization
6. Monitor performance and optimize as needed
