import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/specs/**/*.spec.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
