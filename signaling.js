const express = require('express');
const { WebSocketServer } = require('ws');
const app = express();
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

const wss = new WebSocketServer({ server });

const rooms = new Map(); // { code: Set<WebSocket> }

wss.on('connection', (ws, req) => {
  const pathParts = req.url?.split('/') || [];
  const roomCode = pathParts[pathParts.length - 1];
  if (!roomCode) return ws.close();

  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, new Set());
  }
  rooms.get(roomCode).add(ws);

  console.log(`Conectado a sala: ${roomCode} (${rooms.get(roomCode).size} usuarios)`);

  ws.on('message', (message) => {
    // Reenviar a todos menos al emisor
    rooms.get(roomCode)?.forEach((client) => {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    rooms.get(roomCode)?.delete(ws);
    if (rooms.get(roomCode)?.size === 0) {
      rooms.delete(roomCode);
    }
    console.log(`Usuario salió de sala: ${roomCode}`);
  });
});
