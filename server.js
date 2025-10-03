const path = require('path');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const MAX_HISTORY = 50;
const messageHistory = [];

app.use(express.static(path.join(__dirname, 'public')));

wss.on('connection', (socket) => {
  console.log('Client connected');

  socket.send(JSON.stringify({ type: 'history', payload: messageHistory }));

  socket.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch (err) {
      console.error('Invalid message received', err);
      return;
    }

    if (data.type !== 'chat' || typeof data.payload?.text !== 'string') {
      return;
    }

    const message = {
      id: Date.now(),
      text: data.payload.text.slice(0, 500),
      author: data.payload.author?.slice(0, 32) || 'Anonyme',
      timestamp: new Date().toISOString()
    };

    messageHistory.push(message);
    if (messageHistory.length > MAX_HISTORY) {
      messageHistory.shift();
    }

    const serialized = JSON.stringify({ type: 'chat', payload: message });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    });
  });

  socket.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur de chat WebSocket prêt sur http://localhost:${PORT}`);
});