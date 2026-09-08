const http = require('http');
const { execSync } = require('child_process');
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

function listen(port) {
  return new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, () => {
      logger.info(`ProjectFlow API listening on http://localhost:${port}`);
      resolve();
    });
  });
}

function killPortOccupant(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8', stdio: 'pipe' });
    const match = output.match(/LISTENING\s+(\d+)/);
    if (!match) return;
    const pid = match[1];
    if (String(process.pid) === pid) return;
    logger.warn(`Killing stale process (PID ${pid}) occupying port ${port}`);
    execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
  } catch {
    // No process found or kill failed — port may already be free.
  }
}

async function main() {
  try {
    await prisma.$connect();
    logger.info('Connected to database');
  } catch (error) {
    logger.error({ err: error }, 'Database connection failed');
    process.exit(1);
  }

  try {
    await listen(env.port);
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    killPortOccupant(env.port);
    try {
      await listen(env.port);
    } catch {
      const nextPort = env.port + 1;
      logger.warn(`Port ${env.port} is still in use — trying ${nextPort}`);
      try {
        await listen(nextPort);
      } catch (retryError) {
        if (retryError.code !== 'EADDRINUSE') throw retryError;
        logger.error(`Ports ${env.port} and ${nextPort} are both in use`);
        process.exit(1);
      }
    }
  }
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
