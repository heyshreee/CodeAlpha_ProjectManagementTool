// Central event bus bridging HTTP handlers and Socket.IO.
let io = null;

function setIo(socketServer) {
  io = socketServer;
}

function emitToProject(projectId, event, payload) {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, payload);
}

function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

module.exports = { setIo, emitToProject, emitToUser };
