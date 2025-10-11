# Analytics System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            VSRC Analytics System                         │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐         ┌──────────────────────────┐
│   Frontend (Browser)     │         │   Backend (Node.js)      │
│                          │         │                          │
│  ┌────────────────────┐  │         │  ┌────────────────────┐  │
│  │  Live.js Component │  │         │  │   Express Server   │  │
│  │   (React + Video.js) │◄─────────┤  │   (Port 5001)      │  │
│  └────────┬───────────┘  │         │  └────────┬───────────┘  │
│           │              │         │           │              │
│  ┌────────▼───────────┐  │         │  ┌────────▼───────────┐  │
│  │ Analytics Reporter │  │         │  │  WebSocket Server  │  │
│  │   (Player Package) │  │         │  │ /ws/analytics      │  │
│  └────────┬───────────┘  │         │  └────────┬───────────┘  │
│           │              │         │           │              │
│           │ WebSocket    │         │           │              │
│           ├──────────────┼─────────┤           │              │
│           │              │         │           │              │
│           │ AJAX Fallback│         │  ┌────────▼───────────┐  │
│           └──────────────┼─────────┤  │  Analytics Routes  │  │
│                          │         │  │  /api/analytics/*  │  │
│                          │         │  └────────┬───────────┘  │
└──────────────────────────┘         │           │              │
                                     │  ┌────────▼───────────┐  │
                                     │  │  Analytics Model   │  │
                                     │  │    (Sequelize)     │  │
                                     │  └────────┬───────────┘  │
                                     └───────────┼──────────────┘
                                                 │
                                     ┌───────────▼──────────────┐
                                     │   MySQL Database         │
                                     │   (analytics table)      │
                                     └──────────────────────────┘
```

## Component Interactions

### 1. Player Event Flow

```
User Action (Play/Pause/Seek)
         │
         ▼
Video.js Player Event
         │
         ▼
Analytics Reporter.trackEvent()
         │
         ├─── Batch Enabled? ───► Add to Queue
         │                              │
         │                              ▼
         │                        Batch Timer / Critical Event
         │                              │
         └──────────────────────────────┤
                                        ▼
                           Try WebSocket Connection
                                        │
                         ┌──────────────┴──────────────┐
                         │                             │
                    Connected?                    Not Connected?
                         │                             │
                         ▼                             ▼
              Send via WebSocket              Send via AJAX POST
                         │                             │
                         └──────────────┬──────────────┘
                                        ▼
                              Backend Receives Event
```

### 2. Backend Processing Flow

```
Event Received (WebSocket or AJAX)
         │
         ▼
Validate Event Data
  ├─ sessionId present?
  ├─ eventType valid?
  └─ Required fields?
         │
         ├─── Invalid ───► Return Error Response
         │
         ▼
Extract Client Information
  ├─ IP Address (from headers)
  ├─ User Agent
  └─ User ID (if authenticated)
         │
         ▼
Create Analytics Record
  └─ Analytics.create()
         │
         ▼
Write to Database (MySQL)
         │
         ▼
Send Acknowledgment
  ├─ WebSocket: { type: 'ack', eventId }
  └─ AJAX: { success: true, data: { id } }
```

## Data Model

```
┌─────────────────────────────────────────────────┐
│            Analytics Table (MySQL)              │
├─────────────────────────────────────────────────┤
│ id              INT (PK, Auto Increment)        │
│ session_id      VARCHAR(255) [Indexed]          │
│ user_id         INT [Indexed, FK → users]       │
│ media_id        VARCHAR(255) [Indexed]          │
│ event_type      ENUM(...) [Indexed]             │
│ user_ip         VARCHAR(255)                    │
│ user_agent      TEXT                            │
│ current_time    FLOAT                           │
│ duration        FLOAT                           │
│ quality         VARCHAR(255)                    │
│ buffer_duration FLOAT                           │
│ error_message   TEXT                            │
│ metadata        JSON                            │
│ created_at      TIMESTAMP                       │
│ updated_at      TIMESTAMP                       │
└─────────────────────────────────────────────────┘

Indexes:
├─ (session_id, created_at)
├─ (user_id, created_at)
└─ (media_id, event_type)
```

## WebSocket Protocol

### Client → Server Messages

#### Single Event
```json
{
  "type": "event",
  "payload": {
    "sessionId": "session_123...",
    "userId": 42,
    "mediaId": "video_456",
    "eventType": "play",
    "currentTime": 10.5,
    "duration": 120.0,
    "quality": "720p",
    "metadata": { "customField": "value" }
  }
}
```

#### Batch Events
```json
{
  "type": "batch",
  "payload": {
    "events": [
      {
        "sessionId": "session_123...",
        "eventType": "play",
        "currentTime": 0,
        "duration": 120
      },
      {
        "sessionId": "session_123...",
        "eventType": "pause",
        "currentTime": 15,
        "duration": 120
      }
    ]
  }
}
```

#### Ping
```json
{
  "type": "ping"
}
```

### Server → Client Messages

#### Connection Established
```json
{
  "type": "connected",
  "message": "Analytics WebSocket connected",
  "timestamp": 1234567890
}
```

#### Event Acknowledged
```json
{
  "type": "ack",
  "eventId": 123,
  "eventType": "play",
  "timestamp": 1234567890
}
```

#### Batch Acknowledged
```json
{
  "type": "batch_ack",
  "count": 10,
  "timestamp": 1234567890
}
```

#### Pong Response
```json
{
  "type": "pong",
  "timestamp": 1234567890
}
```

#### Error
```json
{
  "type": "error",
  "message": "sessionId and eventType are required"
}
```

## HTTP API Endpoints

### POST /api/analytics/event

**Request:**
```json
{
  "sessionId": "session_123...",
  "mediaId": "video_456",
  "eventType": "play",
  "currentTime": 10.5,
  "duration": 120.0
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Analytics event recorded",
  "data": {
    "id": 123,
    "sessionId": "session_123...",
    "eventType": "play"
  }
}
```

### POST /api/analytics/batch

**Request:**
```json
{
  "events": [
    {
      "sessionId": "session_123",
      "eventType": "play",
      "currentTime": 0,
      "duration": 120
    },
    {
      "sessionId": "session_123",
      "eventType": "pause",
      "currentTime": 30,
      "duration": 120
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "10 analytics events recorded",
  "data": {
    "count": 10
  }
}
```

### GET /api/analytics/stats

**Query Parameters:**
- `sessionId` - Filter by session
- `mediaId` - Filter by media
- `userId` - Filter by user (requires auth)
- `startDate` - Filter by start date (ISO 8601)
- `endDate` - Filter by end date (ISO 8601)

**Response (200):**
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
      "buffer": 30,
      "quality_change": 12
    }
  }
}
```

## Event Types

| Event Type      | Description                              | Key Data                          |
|----------------|------------------------------------------|-----------------------------------|
| `play`         | Video starts playing                     | currentTime, duration             |
| `pause`        | Video is paused                          | currentTime, duration             |
| `stop`         | Video playback stopped (manual tracking) | currentTime, duration             |
| `seek`         | User seeks to different position         | currentTime, duration             |
| `ended`        | Video completes naturally                | currentTime, duration             |
| `error`        | Playback error occurs                    | currentTime, errorMessage         |
| `buffer`       | Video buffering event                    | currentTime, bufferDuration       |
| `quality_change` | Quality level changes                  | currentTime, quality              |

## Session Management

### Session ID Generation

```javascript
// Format: session_{timestamp}_{random}
const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Example: session_1704067200000_k3m9x2p1q
```

### Session Lifecycle

```
1. Player Initializes
   └─► Generate Session ID
        │
2. User Watches Video
   └─► Track Events with Session ID
        │
3. Player Disposed / Tab Closed
   └─► Final Events Sent
        └─► Session Ends
```

## Batching Strategy

### Without Batching (Immediate Send)
```
Event 1 ──► WebSocket Send ──► DB Write
Event 2 ──► WebSocket Send ──► DB Write
Event 3 ──► WebSocket Send ──► DB Write

Network Overhead: HIGH
Database Writes: HIGH
```

### With Batching (Optimized)
```
Event 1 ──► Queue
Event 2 ──► Queue
Event 3 ──► Queue
  ...
Timer Fires ──► Batch Send ──► Bulk DB Write

Network Overhead: LOW
Database Writes: LOW (10x reduction)
```

### Batching Configuration

```javascript
{
  useBatching: true,       // Enable batching
  batchSize: 10,          // Max events per batch
  batchInterval: 5000,    // Flush every 5 seconds
}

// Critical events (error, ended) are sent immediately
```

## Connection Management

### WebSocket Heartbeat

```
Client                    Server
  │                         │
  ├────── Connected ────────┤
  │                         │
  │     (every 30s)         │
  ├◄──────── Ping ─────────┤│
  │                         ││
  ├────── Pong ────────────►││
  │                         ││
  │     (no response)       ││
  ├◄──────── Ping ─────────┤│
  │          ...            ││
  │     (still no pong)     ││
  │                         │X
  └──── Connection Dead ────┘
```

### Automatic Fallback

```
┌─────────────────────────────────┐
│   Try WebSocket Connection      │
└────────────┬────────────────────┘
             │
    ┌────────▼────────┐
    │   Connected?    │
    └────┬───────┬────┘
         │       │
     YES │       │ NO
         │       │
         ▼       ▼
    ┌────────┐  ┌────────────┐
    │  Use   │  │  Use AJAX  │
    │   WS   │  │  Fallback  │
    └────────┘  └────────────┘
         │             │
         │    ┌────────┘
         │    │
         ▼    ▼
    Analytics Backend
```

## Performance Characteristics

### Throughput

| Metric                    | Value              | Notes                        |
|---------------------------|--------------------|------------------------------|
| WebSocket Connections     | 1000+ concurrent   | Per server instance          |
| Events per Second         | 10,000+            | With batching enabled        |
| Database Writes per Sec   | 1,000+             | Bulk inserts                 |
| Average Event Latency     | <10ms              | WebSocket                    |
| AJAX Fallback Latency     | 50-100ms           | HTTP round-trip              |

### Resource Usage

| Resource                  | Usage              | Optimization                 |
|---------------------------|--------------------|------------------------------|
| Memory per Connection     | <100 KB            | Minimal overhead             |
| CPU per Event             | <0.1ms             | Simple validation            |
| Database Storage          | ~500 bytes/event   | Depends on metadata          |
| Network Bandwidth         | 0.5-1 KB/event     | JSON compression available   |

## Scalability Considerations

### Horizontal Scaling

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Backend   │     │   Backend   │     │   Backend   │
│  Instance 1 │     │  Instance 2 │     │  Instance 3 │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                  ┌────────▼────────┐
                  │  Load Balancer  │
                  │  (nginx/HAProxy)│
                  └────────┬────────┘
                           │
                  ┌────────▼────────┐
                  │     Database    │
                  │  (with replication)│
                  └─────────────────┘
```

### Recommended Architecture for Production

```
┌───────────────────────────────────────────────────────┐
│                     Load Balancer                      │
│              (WebSocket Sticky Sessions)               │
└─────────────────────┬─────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼───────┐ ┌───▼───────┐ ┌───▼───────┐
│   Backend 1   │ │ Backend 2 │ │ Backend 3 │
└───────┬───────┘ └─────┬─────┘ └─────┬─────┘
        │               │             │
        └───────────────┼─────────────┘
                        │
                ┌───────▼────────┐
                │  Message Queue │
                │  (RabbitMQ)    │
                └───────┬────────┘
                        │
                ┌───────▼────────┐
                │  Worker Pool   │
                │  (Processing)  │
                └───────┬────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
    ┌───────▼────────┐      ┌──────▼──────┐
    │  Primary DB    │      │   Redis     │
    │  (MySQL)       │      │  (Cache)    │
    └───────┬────────┘      └─────────────┘
            │
    ┌───────▼────────┐
    │  Replica DB    │
    │  (Read-only)   │
    └────────────────┘
```

## Security Architecture

### Request Flow with Security

```
Client Request
     │
     ▼
┌──────────────┐
│ Rate Limiter │ ◄─── 1000 req/15min per IP
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ CORS Check   │ ◄─── Allowed origins only
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Auth (Opt.)  │ ◄─── JWT validation if present
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Input Valid. │ ◄─── Validate all fields
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Analytics   │
│  Processing  │
└──────────────┘
```

## Monitoring & Observability

### Key Metrics to Track

```
┌──────────────────────────────────────┐
│         Monitoring Dashboard         │
├──────────────────────────────────────┤
│ ● WebSocket Connections: 145         │
│ ● Events/sec: 234                    │
│ ● Error Rate: 0.02%                  │
│ ● Avg Latency: 8ms                   │
│ ● DB Write Queue: 23                 │
│ ● AJAX Fallback Rate: 5%             │
│ ● Storage: 2.3 GB                    │
│ ● Sessions (24h): 1,234              │
└──────────────────────────────────────┘
```

### Health Checks

```javascript
// Backend health check includes analytics status
GET /health

Response:
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "analytics": {
    "websocket": "running",
    "connections": 145,
    "eventsProcessed": 12345
  }
}
```

## Disaster Recovery

### Data Backup Strategy

```
┌────────────────────────────────────────┐
│    Daily Automated Backups             │
├────────────────────────────────────────┤
│ ● Full backup at 2 AM UTC              │
│ ● Incremental every 4 hours            │
│ ● 30 days retention                    │
│ ● Off-site storage (S3/GCS)            │
│ ● Automated restore testing            │
└────────────────────────────────────────┘
```

### Failover Scenario

```
Primary Backend Fails
        │
        ▼
Load Balancer Detects
        │
        ▼
Routes Traffic to Healthy Instances
        │
        ▼
WebSocket Clients Reconnect Automatically
        │
        ▼
AJAX Fallback if All WebSocket Down
        │
        ▼
No Data Loss (Queue + Retry Logic)
```
