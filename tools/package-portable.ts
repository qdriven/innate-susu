#!/usr/bin/env node
import { cpSync, mkdirSync, rmSync, existsSync, renameSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const appDir = join(root, 'innate-dogic', 'apps', 'desktop')
const electronDist = join(appDir, 'node_modules', 'electron', 'dist')
const outDir = join(appDir, 'dist-package', 'portable', 'DSH InnateOS')

if (!existsSync(join(electronDist, 'electron.exe'))) {
  console.error('未找到 desktop/node_modules/electron/dist/electron.exe，请先 pnpm install')
  process.exit(1)
}
if (!existsSync(join(appDir, 'out', 'main', 'index.js'))) {
  console.error('未找到 innate-dogic/apps/desktop/out/main/index.js，请先 pnpm build')
  process.exit(1)
}
// 保留 portable 下的用户数据。Windows 可能长期占用未变化的 default_app.asar，
// 因此只刷新应用资源和 Electron 文件，不再强删整个运行目录。
mkdirSync(outDir, { recursive: true })
const defaultAppAsar = join(outDir, 'resources', 'default_app.asar')
cpSync(electronDist, outDir, {
  recursive: true,
  filter: (source) => source !== join(electronDist, 'resources', 'default_app.asar') || !existsSync(defaultAppAsar),
})

const appResources = join(outDir, 'resources', 'app')
rmSync(appResources, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
mkdirSync(appResources, { recursive: true })
cpSync(join(appDir, 'out'), join(appResources, 'out'), { recursive: true })
cpSync(
  join(appDir, 'resources', 'innate-simple.patch.yml'),
  join(outDir, 'resources', 'innate-simple.patch.yml'),
)
writeFileSync(
  join(appResources, 'package.json'),
  JSON.stringify({ name: '@dogic/desktop', version: '0.1.0', main: './out/main/index.js' }, null, 2),
)
rmSync(join(outDir, 'DSH InnateOS.exe'), { force: true })
renameSync(join(outDir, 'electron.exe'), join(outDir, 'DSH InnateOS.exe'))
console.log(`✓ portable 组装完成: ${outDir}`)
console.log('  运行: "DSH InnateOS.exe"（需本机已装 dsh；magpie 网关在运行时自动接入）')
