#!/usr/bin/env node
/**
 * 一键启动当前 desktop 版本（tools/launch-desktop.ts，tsx 运行）。
 *
 * 用法：
 *   pnpm launch              # 预检 + 修复 → 开发模式（electron-vite dev，热更新）
 *   pnpm launch -- --check   # 只做预检与自修复，不启动（CI/排障用）
 *   pnpm launch -- --packaged# 构建便携包并启动便携版
 *   pnpm launch -- --fresh   # 强制重建 out/ 后以开发模式启动
 *
 * 预检项（含自动修复）来自 2026-10-28 实测坑位清单：
 *   1. 依赖未装 → pnpm install
 *   2. @innate/ui 缺失（私有源）→ 提示 pnpm ui:sync（需要 innate-fe 基础仓，不自动猜测）
 *   3. Electron 二进制缺失 → node …/electron/install.js
 *   4. magpie 孤儿进程（控制台超时根因）→ 自动 taskkill 并报告
 *   5. dsh 入口解析（pnpm shim 反解）→ 仅报告
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appDir = path.join(root, 'innate-dogic', 'apps', 'desktop')
const electronExe = path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe')
const portableExe = path.join(appDir, 'dist-package', 'portable', 'DSH InnateOS', 'DSH InnateOS.exe')
const outMain = path.join(appDir, 'out', 'main', 'index.js')

const CHECK_ONLY = process.argv.includes('--check')
const PACKAGED = process.argv.includes('--packaged')
const FRESH = process.argv.includes('--fresh')

const win = process.platform === 'win32'
function run(cmd: string, args: string[]): number {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: win })
  return r.status ?? 1
}
function ok(msg: string): void { console.log(`✓ ${msg}`) }
function fix(msg: string): void { console.log(`↻ ${msg}`) }
function info(msg: string): void { console.log(`ℹ ${msg}`) }
function fail(msg: string): never { console.error(`✗ ${msg}`); process.exit(1) }

console.log(`[launch] innate-desktop 一键启动（${PACKAGED ? '便携版' : '开发模式'}${CHECK_ONLY ? ' · 仅预检' : ''}）\n`)

// ── 1. 依赖 ─────────────────────────────────────────────────────────────
if (!existsSync(path.join(root, 'node_modules', '.pnpm')) && !existsSync(path.join(root, 'node_modules', 'vite'))) {
  fix('node_modules 缺失 → pnpm install')
  run('pnpm', ['install']) === 0 || fail('pnpm install 失败')
} else ok('依赖已安装')

// ── 2. @innate/ui（私有源）─────────────────────────────────────────────
if (!existsSync(path.join(root, 'node_modules', '@innate', 'ui', 'package.json'))) {
  fail('@innate/ui 缺失：私有源未装。先跑 `pnpm ui:sync`（需 innate-fe 基础仓与本机 Verdaccio；详见 .agents/skills/innate-fe-cli）')
} else ok('@innate/ui 已就位（私有源）')

// ── 3. Electron 二进制 ──────────────────────────────────────────────────
if (!existsSync(electronExe)) {
  fix('Electron 二进制缺失 → install.js')
  run('node', [path.join(appDir, 'node_modules', 'electron', 'install.js')]) === 0 || fail('electron install.js 失败（检查网络/镜像）')
} else ok('Electron 二进制就位')

// ── 4. magpie 孤儿进程（smoke/控制台超时的历史根因）────────────────────
if (win) {
  const list = spawnSync('tasklist', ['/FI', 'IMAGENAME eq magpie.exe'], { encoding: 'utf8' })
  const pids = [...String(list.stdout ?? '').matchAll(/^magpie\.exe\s+(\d+)/gm)].map((m) => m[1]!)
  if (pids.length > 0) {
    fix(`发现 ${pids.length} 个 magpie 孤儿进程（PID ${pids.join(', ')}）→ taskkill /F`)
    for (const pid of pids) spawnSync('taskkill', ['/PID', pid, '/F'], { stdio: 'ignore' })
  } else ok('无 magpie 孤儿进程')
}

// ── 5. dsh 入口（报告）─────────────────────────────────────────────────
{
  let dsh = '未安装（对话页将提示安装；其余功能不受影响）'
  try {
    const where = spawnSync('where', ['dsh'], { encoding: 'utf8' })
    const shim = String(where.stdout ?? '').split(/\r?\n/).find((l) => l.trim() !== '' && !/\.(cmd|ps1)$/i.test(l))?.trim()
    if (shim && existsSync(shim)) {
      const target = /cmd-shim-target=(\S+)/.exec(readFileSync(shim, 'utf8'))?.[1]
      dsh = target && existsSync(target) ? target : `shell shim：${shim}（未反解出 bin.js；可设 INNATE_DSH_ENTRY）`
    }
  } catch { /* 保持默认提示 */ }
  info(`dsh 入口：${dsh}`)
}
run('pnpm', ['magpie:check']) === 0 || info('magpie 未就位或版本漂移——见上方指引（不阻塞启动：网关功能运行时接入）')

// ── 6. 构建 ─────────────────────────────────────────────────────────────
if (PACKAGED || FRESH || !existsSync(outMain)) {
  fix(PACKAGED ? '构建便携包…' : 'out/ 缺失或 --fresh → pnpm build')
  run('pnpm', ['build']) === 0 || fail('构建失败')
} else ok('产物已构建（out/ 存在；--fresh 可强制重建）')

if (CHECK_ONLY) {
  console.log('\n[launch] 预检完成 ✅（--check 模式，未启动）')
  process.exit(0)
}

// ── 7. 启动 ─────────────────────────────────────────────────────────────
if (PACKAGED) {
  if (!existsSync(portableExe)) {
    run('pnpm', ['package:portable']) === 0 || fail('便携打包失败')
  }
  ok(`启动便携版：${portableExe}`)
  const child = spawn(portableExe, [], { detached: true, stdio: 'ignore', cwd: path.dirname(portableExe) })
  child.unref()
  console.log(`[launch] 便携版已启动（PID ${child.pid}）。需本机已装 dsh；magpie 网关运行时自动接入。`)
  process.exit(0)
}

ok('以开发模式启动（electron-vite dev，Ctrl+C 退出）\n')
process.exit(run('pnpm', ['--filter', '@dogic/desktop', 'run', 'dev']))
