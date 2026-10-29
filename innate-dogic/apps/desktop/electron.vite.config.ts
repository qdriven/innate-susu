import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

// 直接从 TS 源码打包内部包：保持 main/preload/renderer 使用同一插件实现。
const coreSrc = resolve(__dirname, '../../packages/core/src/index.ts')
const kernelSrc = resolve(__dirname, '../../packages/kernel/src')
const workspaceSrc = resolve(__dirname, '../../plugins/workspace/src')
const aliases = {
  '@dogic/core/surface': resolve(__dirname, '../../packages/core/src/surface.ts'),
  '@dogic/core': coreSrc,
  '@dogic/kernel/browser': resolve(kernelSrc, 'browser.ts'),
  '@dogic/kernel': resolve(kernelSrc, 'index.ts'),
  '@dogic/syntax-highlighting': resolve(__dirname, '../../packages/syntax-highlighting/src/index.ts'),
  '@dogic/plugin-workspace/main': resolve(workspaceSrc, 'main/index.ts'),
  '@dogic/plugin-workspace/plugin': resolve(workspaceSrc, 'plugin.ts'),
  '@dogic/plugin-workspace/renderer': resolve(workspaceSrc, 'renderer/index.ts'),
  '@dogic/plugin-workspace': resolve(workspaceSrc, 'shared/index.ts'),
}
const bundled = ['@dogic/core', '@dogic/kernel', '@dogic/plugin-workspace', '@dogic/syntax-highlighting']

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: bundled })],
    resolve: { alias: aliases },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: bundled })],
    resolve: { alias: aliases },
  },
  renderer: {
    plugins: [tailwindcss(), react()],
    resolve: { alias: aliases },
  },
})
