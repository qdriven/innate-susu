import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  // 与 apps/desktop/vitest.config.ts 同源：测试直接吃 TS 源码，免去先 build 内部包。
  resolve: {
    alias: {
      '@dogic/core/surface': path.resolve(here, '../../packages/core/src/surface.ts'),
      '@dogic/core': path.resolve(here, '../../packages/core/src/index.ts'),
    },
  },
  test: {
    testTimeout: 20_000,
    passWithNoTests: true,
    // 主进程测试保持 node 环境；renderer 组件测试用 jsdom。
    environment: 'node',
    environmentMatchGlobs: [
      ['src/renderer/**/*.test.{ts,tsx}', 'jsdom'],
    ],
    setupFiles: ['./src/test-setup.ts'],
  },
})
