// Global setup for tests: create a fresh SQLite test database before running.
import { execSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const testDb = path.join(here, 'test.db');

export default async function setup() {
  // Remove any prior test db.
  if (existsSync(testDb)) rmSync(testDb, { force: true });

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = `file:${testDb.replace(/\\/g, '/')}`;
  // HTTP-level rate limits would trip under the many sequential requests tests
  // make from a single IP. Application-level lockout is asserted separately.
  process.env.RATE_LIMIT_DISABLED = 'true';

  // Push the schema into the fresh db.
  execSync('npx prisma db push --skip-generate', {
    cwd: path.join(here, '..'),
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: `file:${testDb.replace(/\\/g, '/')}` },
  });
}

export function teardown() {
  if (existsSync(testDb)) rmSync(testDb, { force: true });
}
