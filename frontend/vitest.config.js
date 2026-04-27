import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    exclude: ['tests-e2e/**'],
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['js/**/*.js'],
      thresholds: {
        statements: 90,
        branches: 70,
        functions: 85,
        lines: 90
      }
    },
    clearMocks: true
  }
});
