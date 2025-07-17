const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const rooms = {}; // { roomCode: [ { uid, nickname, ws } ] }

wss.on('connection', function connection(ws, req) {
  let currentRoom = null;
  let currentUid = null;

  ws.on('message', function incoming(message) {
    const data = JSON.parse(message);

    // --- CREAR SALA ---
    if (data.type === 'create_room') {
      const { room } = data;

      if (!rooms[room]) {
        rooms[room] = [];
        ws.send(JSON.stringify({
          type: 'create_room_response',
          success: true
        }));
        console.log(`✅ Sala creada: ${room}`);
      } else {
        ws.send(JSON.stringify({
          type: 'create_room_response',
          success: false,
          message: 'La sala ya existe'
        }));
        console.log(`⚠️ La sala ya existía: ${room}`);
      }
      return;
    }

    // --- UNIRSE A SALA ---
    if (data.type === 'join') {
      const { uid, nickname, room } = data;
      currentUid = uid;
      currentRoom = room;

      if (!rooms[room]) {
        ws.send(JSON.stringify({
          type: 'join_response',
          success: false,
          message: 'Código de sala inválido'
        }));
        return;
      }

      const alreadyExists = rooms[room].some(p => p.uid === uid);
      if (!alreadyExists) {
        rooms[room].push({ uid, nickname, ws });
      }

      ws.send(JSON.stringify({
        type: 'join_response',
        success: true
      }));
      console.log(`📨 Usuario ${uid} se unió a sala ${room}`);
      broadcastPeers(room);
      return;
    }

    // --- OFERTA DE ARCHIVO ---
    if (data.type === 'file-offer') {
      const { to } = data;

      const roomPeers = rooms[currentRoom] || [];
      const recipient = roomPeers.find(p => p.uid === to);

      if (recipient) {
        try {
          recipient.ws.send(JSON.stringify(data));
          console.log(`📤 Oferta enviada a ${to}`);
        } catch (e) {
          console.error(`❌ Error al reenviar archivo a ${to}:`, e);
        }
      } else {
        console.log(`⚠️ No se encontró peer con UID ${to}`);
      }
    }
  });

  ws.on('close', () => {
    if (currentRoom && currentUid && rooms[currentRoom]) {
      rooms[currentRoom] = rooms[currentRoom].filter(p => p.uid !== currentUid);
      broadcastPeers(currentRoom);
    }
  });
});

// --- BROADCAST PEERS ---
function broadcastPeers(room) {
  const peers = rooms[room] || [];

  const peerList = peers.map(p => ({
    uid: p.uid,
    nickname: p.nickname
  }));

  const message = JSON.stringify({
    type: 'peers',
    peers: peerList
  });

  peers.forEach(p => {
    try {
      p.ws.send(message);
    } catch (e) {
      console.error(`❌ Error al enviar a ${p.uid}:`, e);
    }
  });

  console.log(`📡 Enviando peers en ${room}:`, peerList);
}
