const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const rooms = {}; // { roomCode: [ { uid, nickname, ws } ] }

wss.on('connection', function connection(ws, req) {
  let currentRoom = null;
  let currentUid = null;

  ws.on('message', function incoming(message) {
    const data = JSON.parse(message);

    if (data.type === 'join') {
      const { uid, nickname, room } = data;
      currentUid = uid;
      currentRoom = room;

      // Crear la sala si no existe
      if (!rooms[room]) {
        rooms[room] = [];
      }

      // Agregar peer a la sala (evitar duplicados)
      const alreadyExists = rooms[room].some(p => p.uid === uid);
      if (!alreadyExists) {
        rooms[room].push({ uid, nickname, ws });
      }

      console.log(`📨  Mensaje recibido en ${room}:`, data);

      // Enviar lista de peers actualizada a todos en la sala
      broadcastPeers(room);
    }

    // (Acá podrías manejar más tipos de mensaje si querés)
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
