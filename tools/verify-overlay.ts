#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const overlay = path.join(root, 'innate-dogic/apps/desktop/resources/innate-simple.patch.yml')
/** PATH 上的 dsh shim 反解真实 bin.js（pnpm/cmd shim 内含 cmd-shim-target= 或 exec 目标行）。 */
function resolveDshEntryFromPath(): string | undefined {
  try {
    const shim = execSync(process.platform === 'win32' ? 'where dsh' : 'which dsh', { encoding: 'utf8' })
      .split(/\r?\n/)
      .find((line) => line.trim() !== '' && !/\.(cmd|ps1)$/i.test(line))?.trim()
    if (!shim || !existsSync(shim)) return undefined
    const text = readFileSync(shim, 'utf8')
    const target = /cmd-shim-target=(\S+)/.exec(text)?.[1]
      ?? /exec\s+(?:"[^"]*"|\S+)\s+"?(\S*dsh\S*bin\.js)"?/.exec(text)?.[1]
    return target && existsSync(target) ? target : undefined
  } catch {
    return undefined
  }
}

const entry = process.argv.slice(2).find((arg) => arg !== '--') ?? resolveDshEntryFromPath()
if (!entry || !existsSync(entry)) {
  console.error('[verify-overlay] 需要 dsh 入口 bin.js：显式传参，或确保 PATH 上的 dsh shim 可反解（npm i -g @deepseek-ai/dsh）。退出码 2。')
  process.exit(2)
}

const ids = [...readFileSync(overlay, 'utf8').matchAll(/^- id:\s*(\S+)$/gm)].map((match) => match[1])
if (ids.length === 0) {
  console.error('[verify-overlay] overlay 中未找到任何条目')
  process.exit(1)
}
const dump = execFileSync(process.execPath, [entry, '--profile', 'web', '--patch', overlay, '--dump-config'], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
})
let failed = 0
for (const id of ids) {
  const block = dump.match(new RegExp(`["']?${id}["']?[\\s\\S]{0,600}`))
  const ok = block !== null && /disabled["']?\s*[:=]\s*true/.test(block[0])
  console.log(`${ok ? '✓' : '✗'} ${id}`)
  if (!ok) failed++
}
console.log(failed === 0 ? `[verify-overlay] ${ids.length} 个条目全部 disabled=true` : `[verify-overlay] ${failed} 个条目未生效`)
process.exit(failed === 0 ? 0 : 1)
