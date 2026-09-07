import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/global-setup.js'],
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
