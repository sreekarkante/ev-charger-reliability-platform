let ioInstance = null;

/**
 * Initializes the Socket.IO instance on the server.
 * @param {object} io - Socket.IO server instance
 */
const initSockets = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[SOCKET CONNECTED] Client ID: ${socket.id}`);

    // Join room for specific station updates if wanted, or just standard broadcasts
    socket.on('join_station', (stationId) => {
      socket.join(stationId);
      console.log(`[SOCKET ROOM] Client ${socket.id} joined station room: ${stationId}`);
    });

    socket.on('leave_station', (stationId) => {
      socket.leave(stationId);
      console.log(`[SOCKET ROOM] Client ${socket.id} left station room: ${stationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET DISCONNECTED] Client ID: ${socket.id}`);
    });
  });
};

/**
 * Broadcasts an event to all connected clients.
 * @param {string} event - Event name
 * @param {any} data - Message payload
 */
const broadcast = (event, data) => {
  if (ioInstance) {
    ioInstance.emit(event, data);
  } else {
    console.warn('[SOCKET WARNING] Broadcast attempted before initialization.');
  }
};

/**
 * Broadcasts an event to a specific room.
 * @param {string} room - Room name (e.g. stationId)
 * @param {string} event - Event name
 * @param {any} data - Message payload
 */
const broadcastToRoom = (room, event, data) => {
  if (ioInstance) {
    ioInstance.to(room).emit(event, data);
  }
};

module.exports = {
  initSockets,
  broadcast,
  broadcastToRoom
};
