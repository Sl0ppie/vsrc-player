const WebSocket = require('ws');

// Configuration
const PORT = process.env.PORT || 8080;

// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT });

console.log(`VSRCPlayer Chat Server started on port ${PORT}`);

// Store connected clients
const clients = new Set();

// Broadcast message to all connected clients
function broadcast(message, sender) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Handle new connections
wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'system',
    message: 'Connected to chat server',
    timestamp: Date.now()
  }));

  // Send current user count
  broadcast({
    type: 'system',
    message: `User joined. ${clients.size} user(s) online`,
    timestamp: Date.now()
  }, ws);

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Received message:', message);

      // Add server timestamp
      message.timestamp = Date.now();

      // Broadcast to all other clients
      broadcast(message, ws);

      // Echo back to sender with confirmation
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message',
        timestamp: Date.now()
      }));
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);

    // Notify remaining clients
    broadcast({
      type: 'system',
      message: `User left. ${clients.size} user(s) online`,
      timestamp: Date.now()
    }, null);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle server errors
wss.on('error', (error) => {
  console.error('Server error:', error);
});

console.log('Chat server is ready to accept connections');
