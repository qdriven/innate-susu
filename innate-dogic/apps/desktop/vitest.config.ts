import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  // 与 electron.vite.config.ts 同源：测试直接吃 TS 源码，免去先 build 内部包。
  resolve: {
    alias: {
      '@dogic/core/surface': path.resolve(here, '../../packages/core/src/surface.ts'),
    },
  },
  test: {
    testTimeout: 20_000,
    passWithNoTests: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
