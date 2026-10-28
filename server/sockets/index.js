const { Server } = require('socket.io');
const { verify } = require('../middleware/auth');

const roomOf = (malId) => `anime:${malId}`;

/*
 Socket events
  client -> server:  anime:join(malId)  anime:leave(malId)  typing(malId)
  server -> client:  online(count)  viewers({malId,count})  typing({malId,username})
                     comment:new  comment:deleted  releases:update  trending:update  watchlist:update
*/
function initSockets(httpServer) {
  const io = new Server(httpServer, { cors: { origin: '*' } });

  // Guests can connect; a valid token attaches the user (needed for private rooms)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        socket.user = verify(token);
      } catch {}
    }
    next();
  });

  const viewers = (malId) => io.sockets.adapter.rooms.get(roomOf(malId))?.size || 0;
  const sendViewers = (malId) => io.to(roomOf(malId)).emit('viewers', { malId, count: viewers(malId) });

  io.on('connection', (socket) => {
    if (socket.user) socket.join(`user:${socket.user.id}`);
    io.emit('online', io.engine.clientsCount);

    socket.on('anime:join', (malId) => {
      malId = Number(malId);
      if (!malId) return;
      socket.join(roomOf(malId));
      sendViewers(malId);
    });

    socket.on('anime:leave', (malId) => {
      malId = Number(malId);
      if (!malId) return;
      socket.leave(roomOf(malId));
      sendViewers(malId);
    });

    socket.on('typing', (malId) => {
      malId = Number(malId);
      if (!malId) return;
      socket.to(roomOf(malId)).emit('typing', { malId, username: socket.user?.username || 'Someone' });
    });

    socket.on('disconnecting', () => {
      socket.data.rooms = [...socket.rooms].filter((r) => r.startsWith('anime:'));
    });

    socket.on('disconnect', () => {
      io.emit('online', io.engine.clientsCount);
      (socket.data.rooms || []).forEach((r) => sendViewers(Number(r.split(':')[1])));
    });
  });

  return io;
}

module.exports = { initSockets };
