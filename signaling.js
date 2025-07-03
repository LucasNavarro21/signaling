const express = require('express');
const { WebSocketServer, WebSocket } = require('ws'); // ← import agregado
const app = express();
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () =>
  console.log(`Servidor corriendo en puerto ${PORT}`)
);

const wss = new WebSocketServer({ server });
const rooms = new Map(); // { code: Set<WebSocket> }

wss.on('connection', (ws, req) => {
  const roomCode = req.url?.split('/').pop();
  if (!roomCode) return ws.close();

  rooms.has(roomCode) || rooms.set(roomCode, new Set());
  rooms.get(roomCode).add(ws);
  console.log(`Conectado a sala ${roomCode} (${rooms.get(roomCode).size})`);

  ws.on('message', (msg) => {
    console.log(`📨  Mensaje recibido en sala ${roomCode}:`, msg.toString());

    rooms.get(roomCode)?.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msg);                // ← se reenvía ahora sí
      }
    });
  });

  ws.on('close', () => {
    rooms.get(roomCode)?.delete(ws);
    if (rooms.get(roomCode)?.size === 0) rooms.delete(roomCode);
  });
});
