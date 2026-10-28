#!/usr/bin/env node
import { readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const roots = ['innate-dogic', 'tools', 'apps', 'packages', 'innate-project-canvas']
const ignoredDirectories = new Set(['node_modules', 'dist', 'out', 'dist-package', 'release', '.git'])
const forbiddenExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs'])
// W0.5 迁移豁免：desktop 原生工具（81df732 引入）暂为 .mjs，待转 TS 后移除
const tsOnlyAllowlist = new Set(['tools/ui-sync.mjs', 'tools/compare-palette.mjs'])
const violations: string[] = []

function scan(directory: string): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) scan(path.join(directory, entry.name))
    } else if (forbiddenExtensions.has(path.extname(entry.name))) {
      const rel = path.relative(root, path.join(directory, entry.name)).split(path.sep).join('/')
      if (!tsOnlyAllowlist.has(rel)) violations.push(rel)
    }
  }
}
for (const directory of roots) {
  const absolute = path.join(root, directory)
  if (!existsSync(absolute)) continue // 容忍尚未存在的扫描根（如分阶段迁入）
  scan(absolute)
}
if (violations.length > 0) {
  console.error('产品源码必须统一使用 TypeScript，发现 JavaScript 文件：')
  for (const file of violations) console.error('  ' + file)
  process.exit(1)
}
console.log('✓ 产品源码与工具均为 TypeScript（references 只读参考不纳入约束）')
