const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const rooms = {}; // { roomCode: [ { uid, nickname, ws } ] }

wss.on('connection', function connection(ws, req) {
  let currentRoom = null;
  let currentUid = null;

  ws.on('message', function incoming(message) {
    const data = JSON.parse(message);

    if (data.type === 'create') {
      const { uid, nickname, room } = data;
      currentUid = uid;
      currentRoom = room;

      if (!rooms[room]) {
        rooms[room] = [];
        rooms[room].push({ uid, nickname, ws });
        console.log(`✅ Sala ${room} creada por ${nickname}`);
        broadcastPeers(room);
      } else {
        // Si alguien intenta crear una sala que ya existe, enviamos error
        ws.send(JSON.stringify({
          type: 'error',
          message: `La sala ${room} ya existe`
        }));
        console.log(`⛔ Sala ${room} ya existe. No se puede crear de nuevo.`);
      }
    }

    if (data.type === 'join') {
      const { uid, nickname, room } = data;
      currentUid = uid;
      currentRoom = room;

      if (!rooms[room]) {
        // Error: sala no existe
        console.log(`⛔ Sala ${room} no existe. No se puede unir.`);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'La sala no existe'
        }));
        return;
      }

      const alreadyExists = rooms[room].some(p => p.uid === uid);
      if (!alreadyExists) {
        rooms[room].push({ uid, nickname, ws });
        console.log(`✅ ${nickname} se unió a la sala ${room}`);
      }

      broadcastPeers(room);
    }

    if (data.type === 'file-offer') {
      const { to } = data;

      console.log(`📦 Oferta de archivo recibida para ${to}`);

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
    if (currentRoom && currentUid) {
      rooms[currentRoom] = rooms[currentRoom].filter(p => p.uid !== currentUid);
      broadcastPeers(currentRoom);
    }
  });
});

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
