import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    testTimeout: 20_000,
    passWithNoTests: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
