# VSRCPlayer Chat Backend

A simple WebSocket-based chat server for live streaming with VSRCPlayer.

## Installation

```bash
npm install
```

## Usage

Start the server:

```bash
npm start
```

Or with a custom port:

```bash
PORT=3000 npm start
```

Default port is 8080.

## Features

- WebSocket-based real-time messaging
- Broadcast messages to all connected clients
- User join/leave notifications
- System messages support
- Error handling

## Message Format

### Client to Server

```json
{
  "type": "message",
  "username": "User123",
  "message": "Hello everyone!"
}
```

### Server to Client

```json
{
  "type": "message",
  "username": "User123",
  "message": "Hello everyone!",
  "timestamp": 1234567890
}
```

### System Messages

```json
{
  "type": "system",
  "message": "User joined. 5 user(s) online",
  "timestamp": 1234567890
}
```

## Configuration

The server accepts the following environment variables:

- `PORT` - Port to run the WebSocket server (default: 8080)

## Example Connection

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};

ws.send(JSON.stringify({
  type: 'message',
  username: 'MyUsername',
  message: 'Hello!'
}));
```
