// Vercel serverless entry — the full Express app (REST API under /api/v1).
// Deployment uses `server/vercel.json` (Root Directory: server).
//
// NOTE — what does NOT run on Vercel serverless:
//  - Socket.IO realtime (no persistent WebSocket transport; HTTP long-polling
//    may work for the handshake, but live notifications are not guaranteed).
//  - The in-process deadline-reminder scheduler (server.js setInterval).
//  - Local-disk uploads/avatars (serverless filesystem is ephemeral) — use an
//    S3-compatible STORAGE_* backend.
const app = require('../src/app');

module.exports = app;