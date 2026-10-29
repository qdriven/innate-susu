/**
 * MagpieGateway 生命周期契约测试。
 *
 * 用 fake magpie 二进制（fake.js + fake.cmd shim，Windows 经 cmd.exe 执行，
 * 与生产 launcher 的 shell 模式一致）覆盖：
 * 已运行复用不重复启动、未安装、启动超时、健康恢复、异常退出退避、显式停止不重启。
 * 接线操作只写隔离临时 DSH_HOME，绝不触碰真实 ~/.dsh。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MagpieGateway, type MagpieGatewayOptions } from './index.js'
import type { GatewayStatus } from '@dogic/sdk'

const FAKE_JS = `
const fs = require('node:fs')
const path = require('node:path')
const dir = __dirname
const args = process.argv.slice(2)
const mode = process.env.FAKE_MAGPIE_MODE ?? 'ok'
const cmd = args[0]
const write = (name, content) => fs.writeFileSync(path.join(dir, name), String(content))

if (cmd === 'healthcheck') {
  process.exit(fs.existsSync(path.join(dir, 'running.marker')) ? 0 : 1)
}

if (cmd === 'serve' || args.length === 0) {
  const count = (fs.existsSync(path.join(dir, 'serve-count')) ? Number(fs.readFileSync(path.join(dir, 'serve-count'), 'utf8')) : 0) + 1
  write('serve-count', count)
  write('last-argv.json', JSON.stringify(args))
  write('serve.pid', process.pid)
  if ((mode === 'crash-once' && count === 1) || mode === 'crash') process.exit(1)
  if (mode !== 'nohealth') write('running.marker', process.pid)
  console.log('[fake-magpie] serve ready')
  setInterval(() => {}, 60000)
  return
}

if (cmd === 'dsh') {
  const home = process.env.DSH_HOME
  fs.writeFileSync(path.join(home, 'wired.txt'), args[1] ?? 'default')
  console.log('wired ' + (args[1] ?? 'default'))
  process.exit(0)
}

if (cmd === 'usage') {
  console.log('quota-ok')
  process.exit(0)
}

console.error('unknown command: ' + JSON.stringify(args))
process.exit(2)
`

const FAKE_CMD = '@echo off\r\n@node "%~dp0fake.js" %*\r\n'

function makeFakeDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'magpie-fake-'))
  writeFileSync(path.join(dir, 'fake.js'), FAKE_JS)
  writeFileSync(path.join(dir, 'fake.cmd'), FAKE_CMD)
  return dir
}

function makeGateway(dir: string, overrides: Partial<MagpieGatewayOptions> = {}): MagpieGateway {
  return new MagpieGateway({
    binPath: path.join(dir, 'fake.cmd'),
    form: 'serve',
    healthTimeoutMs: 2_000,
    startTimeoutMs: 5_000,
    healthIntervalMs: 100,
    restartDelaysMs: [150, 150, 150],
    log: () => {},
    ...overrides,
  })
}

function cleanup(dir: string): void {
  try {
    const pidFile = path.join(dir, 'serve.pid')
    if (existsSync(pidFile)) {
      execFile('taskkill', ['/pid', String(Number(readFileSync(pidFile, 'utf8'))), '/T', '/F'], () => {})
    }
  } catch {
    /* 清理尽力而为 */
  }
  rmSync(dir, { recursive: true, force: true })
}

describe('MagpieGateway 生命周期契约', () => {
  let dir: string

  beforeEach(() => {
    dir = makeFakeDir()
  })

  afterEach(() => {
    cleanup(dir)
  })

  it('F1-V1a 已运行实例复用：健康直接 running，不重复启动', async () => {
    writeFileSync(path.join(dir, 'running.marker'), 'pre-existing')
    const gw = makeGateway(dir)
    const events: GatewayStatus[] = []
    gw.onStatusChange((s) => events.push(s))

    await gw.ensureRunning()

    expect(gw.status()).toMatchObject({ state: 'running', url: 'http://127.0.0.1:3425' })
    expect(existsSync(path.join(dir, 'serve-count'))).toBe(false)
    expect(events.some((s) => s.state === 'running')).toBe(true)
    await gw.stop()
  })

  it('F1-V1b 未安装：not-installed 并拒绝启动', async () => {
    const gw = makeGateway(path.join(dir, 'missing.cmd'))

    await expect(gw.ensureRunning()).rejects.toThrow(/not found/)

    expect(gw.status().state).toBe('not-installed')
  })

  it('F1-V1c 启动超时：error recoverable，stop 可回收', async () => {
    const gw = makeGateway(dir, { env: { FAKE_MAGPIE_MODE: 'nohealth' }, startTimeoutMs: 800 })

    await expect(gw.ensureRunning()).rejects.toThrow(/did not become healthy/)

    expect(gw.status()).toMatchObject({ state: 'error', recoverable: true })
    gw.stop()
    expect(gw.status().state).toBe('not-running')
  })

  it('F1-V1d 异常退出退避重启后健康恢复：starting → error → running', async () => {
    const gw = makeGateway(dir, { env: { FAKE_MAGPIE_MODE: 'crash-once' } })
    const events: string[] = []
    gw.onStatusChange((s) => events.push(s.state))

    await gw.ensureRunning()

    expect(gw.status().state).toBe('running')
    expect(readFileSync(path.join(dir, 'serve-count'), 'utf8')).toBe('2')
    expect(events).toContain('starting')
    expect(events).toContain('error')
    expect(events).toContain('running')
    await gw.stop()
  })

  it('F1-V1e 显式停止不再重启', async () => {
    const gw = makeGateway(dir)
    await gw.ensureRunning()
    expect(readFileSync(path.join(dir, 'serve-count'), 'utf8')).toBe('1')

    gw.stop()
    expect(gw.status().state).toBe('not-running')

    await new Promise((resolve) => setTimeout(resolve, 500)) // 远超退避序列
    expect(readFileSync(path.join(dir, 'serve-count'), 'utf8')).toBe('1')
  })

  it('F1-V1f form 参数：desktop 无参启动、serve 带 serve 参数', async () => {
    const gwDesktop = makeGateway(dir, { form: 'desktop' })
    await gwDesktop.ensureRunning()
    let argv = JSON.parse(readFileSync(path.join(dir, 'last-argv.json'), 'utf8')) as string[]
    expect(argv).toEqual([])
    gwDesktop.stop()

    rmSync(path.join(dir, 'running.marker'), { force: true })
    rmSync(path.join(dir, 'serve-count'), { force: true })

    const gwServe = makeGateway(dir)
    await gwServe.ensureRunning()
    argv = JSON.parse(readFileSync(path.join(dir, 'last-argv.json'), 'utf8')) as string[]
    expect(argv).toEqual(['serve'])
    gwServe.stop()
  })

  it('F1-V1g wireDsh 只写隔离 DSH_HOME；非法模型参数拒绝执行', async () => {
    const dshHome = mkdtempSync(path.join(tmpdir(), 'dsh-home-'))
    try {
      const gw = makeGateway(dir)
      await gw.wireDsh('zcode/GLM-5.3', dshHome)
      expect(readFileSync(path.join(dshHome, 'wired.txt'), 'utf8')).toBe('zcode/GLM-5.3')

      await expect(gw.wireDsh('bad;rm -rf', dshHome)).rejects.toThrow(/非法/)
    } finally {
      rmSync(dshHome, { recursive: true, force: true })
    }
  })

  it('F1-V1h quota 透传 CLI 输出', async () => {
    const gw = makeGateway(dir)
    const quota = await gw.quota()
    expect(quota).toContain('quota-ok')
  })
})
