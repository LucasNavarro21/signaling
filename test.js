Future<void> connectSignal(String roomCode) async {
  print('🔌 Conectando al WebSocket con código de sala: $roomCode');

  try {
    final selfUid = FFAppState().selfUid;
    final nickname = FFAppState().apodoPrimero;

    signalChannel = HtmlWebSocketChannel.connect(
      'wss://signaling-production.up.railway.app/room/$roomCode',
    );

    // Enviar mensaje de unión
    signalChannel!.sink.add(jsonEncode({
      'type': 'join',
      'uid': selfUid,
      'nickname': nickname,
      'room': roomCode,
    }));

    // Escuchar mensajes del servidor
    signalChannel!.stream.listen(
      (raw) {
        try {
          print('📥 Mensaje recibido: $raw');
          final msg = jsonDecode(raw);

          // 🟢 Peers actualizados
          if (msg['type'] == 'peers') {
            final oldPeers = FFAppState().peers.map((p) => p['uid']).toSet();
            final newPeers = List<Map<String, dynamic>>.from(msg['peers']);
            final newUids = newPeers.map((p) => p['uid']).toSet();

            FFAppState().update(() {
              FFAppState().peers = newPeers;
            });

            final joined = newUids.difference(oldPeers);
            for (final uid in joined) {
              if (uid == selfUid) continue;
              final peer =
                  newPeers.firstWhere((p) => p['uid'] == uid, orElse: () => {});
              if (peer.isNotEmpty) {
                FFAppState().update(() {
                  FFAppState().ultimoEventoPeer =
                      '🔵 ${peer['nickname']} se unió a la sala';
                });
                Future.delayed(Duration(seconds: 5), () {
                  FFAppState().update(() {
                    FFAppState().ultimoEventoPeer = '';
                  });
                });
              }
            }
          }

          // 📨 Oferta de archivo recibida
          if (msg['type'] == 'file-offer') {
            print('📨 Oferta de archivo recibida: $msg');

            final from = msg['from'];
            final nickname = msg['nickname'];
            final filename = msg['filename'];
            final filesize = msg['filesize'];
            final filedata = msg['filedata']; // ⚠️ base64

            FFAppState().update(() {
              FFAppState().archivoEntrante = {
                'from': from,
                'nickname': nickname,
                'filename': filename,
                'filesize': filesize,
                'filedata': filedata,
              };
              FFAppState().mostrarModalArchivo = true;
            });

            print('📥 Oferta recibida de $nickname');
          }
        } catch (e) {
          print('❌ Error procesando mensaje: $e');
        }
      },
      onError: (error) {
        print('❌ Error en el WebSocket stream: $error');
      },
      cancelOnError: false,
    );
  } catch (e) {
    print('❌ Error al conectar el WebSocket: $e');
  }
}