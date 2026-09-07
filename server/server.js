const http = require('http');
const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/lib/logger');
const { createSocketServer } = require('./src/socket');
const { runDeadlineReminders } = require('./src/services/scheduler');
const prisma = require('./src/lib/prisma');

const httpServer = http.createServer(app);
createSocketServer(httpServer);

// Schedule deadline-reminder checks (guarded to not double-run in tests).
if (process.env.NODE_ENV !== 'test') {
  setInterval(runDeadlineReminders, 60 * 60 * 1000).unref();
}

async function main() {
  try {
    await prisma.$connect();
    logger.info('Connected to database');
  } catch (error) {
    logger.error({ err: error }, 'Database connection failed');
    process.exit(1);
  }

  httpServer.listen(env.port, () => {
    logger.info(`ProjectFlow API listening on http://localhost:${env.port}`);
  });
}

main();

// Graceful shutdown.
async function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  httpServer.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
