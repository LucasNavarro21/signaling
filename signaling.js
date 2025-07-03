const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const app = express();
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () =>
  console.log(`Servidor corriendo en puerto ${PORT}`)
);

const wss = new WebSocketServer({ server });
const rooms = new Map();           // { code: Set<WebSocket> }

wss.on('connection', (ws, req) => {
  const roomCode = req.url.split('/').pop();
  if (!roomCode) return ws.close();

  rooms.has(roomCode) || rooms.set(roomCode, new Set());
  rooms.get(roomCode).add(ws);
  console.log(`Conectado a sala ${roomCode} (${rooms.get(roomCode).size})`);

  // ----- CAMBIO AQUÍ -----
  ws.on('message', (data, isBinary) => {
    const text = isBinary ? data : data.toString();      // fuerza a string
    console.log(`📨  Mensaje recibido en ${roomCode}:`, text);

    rooms.get(roomCode).forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(text);                               // reenvía como texto
      }
    });
  });
  // -----------------------

  ws.on('close', () => {
    rooms.get(roomCode).delete(ws);
    if (rooms.get(roomCode).size === 0) rooms.delete(roomCode);
  });
});
