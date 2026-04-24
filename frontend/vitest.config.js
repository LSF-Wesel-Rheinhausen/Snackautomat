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
      exclude: ['js/scanner.js'] // Separate handling or accept lower over this hardware API
    },
    clearMocks: true
  }
});
