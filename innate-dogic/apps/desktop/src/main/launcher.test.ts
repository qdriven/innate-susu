/**
 * W2.4 控制台生命周期契约测试（launcher console 段）。
 *
 * 覆盖验收点：重复 show 不重复 spawn / URL 不变不 reload / 缺 key 报错 /
 * 进程退出可见 / 关闭无孤儿 / key 存储（仅 userData + 损坏重生成）/
 * 日志快照只含脱敏地址 / 启动失败只影响控制台。
 *
 * fake 二进制：fake-web.js + fake-web.cmd shim（win32 shell:true spawn 需要 .cmd），
 * 模式经 FAKE_WEB_MODE 环境变量注入（ok/nokey/exit）。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import { redactLaunchSecrets } from '@dogic/core'

const electronState = vi.hoisted(() => {
  const views: Array<{
    webContents: {
      loadURL: ReturnType<typeof vi.fn>
      close: ReturnType<typeof vi.fn>
      setWindowOpenHandler: ReturnType<typeof vi.fn>
    }
  }> = []
  return {
    views,
    userData: '',
    openExternal: vi.fn(),
  }
})

vi.mock('electron', () => ({
  app: {
    getPath: (name: string): string => (name === 'userData' ? electronState.userData : ''),
    getAppPath: (): string => '',
  },
  WebContentsView: class {
    webContents = {
      loadURL: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
      setWindowOpenHandler: vi.fn(),
    }
    setBounds = vi.fn()
    constructor() {
      electronState.views.push(this)
    }
  },
  shell: { openExternal: electronState.openExternal },
}))

import { MagpieConsole, consoleKey, getGateway, startMagpie } from './launcher'
import { SurfaceHost } from './surface-host'

const FAKE_WEB_JS = `
const fs = require('node:fs')
const path = require('node:path')
const marker = process.env.FAKE_WEB_MARKER_DIR
if (!marker) { process.exit(42) }
const args = process.argv.slice(2)
const addrIdx = args.indexOf('--addr')
const addr = addrIdx >= 0 ? args[addrIdx + 1] : ''
const port = addr.indexOf(':') >= 0 ? addr.split(':').pop() : ''
const countFile = path.join(marker, 'web-spawn-count.txt')
const count = (fs.existsSync(countFile) ? (parseInt(fs.readFileSync(countFile, 'utf8'), 10) || 0) : 0) + 1
fs.writeFileSync(countFile, String(count))
fs.writeFileSync(path.join(marker, 'web-argv.txt'), JSON.stringify(args))
fs.writeFileSync(path.join(marker, 'web-pid.txt'), String(process.pid))
fs.writeFileSync(path.join(marker, 'web-key.txt'), process.env.MAGPIE_WEB_KEY || 'unset')
if (process.env.FAKE_WEB_MODE === 'exit') { process.exit(3) }
if (process.env.FAKE_WEB_MODE === 'nokey') {
  console.log('magpie web on http://127.0.0.1:' + port + '/')
} else {
  console.log('magpie web on http://127.0.0.1:' + port + '/?k=fake-key-' + count)
}
setInterval(function () {}, 100000)
`

const FAKE_GATEWAY_JS = `
const args = process.argv.slice(2)
if (args[0] === 'healthcheck') { process.exit(0) }
if (args[0] === 'serve') { setInterval(function () {}, 100000) }
process.exit(0)
`

const CMD_SHIM = '@echo off\r\n@node "%~dp0%1" %*\r\n'

describe('MagpieConsole 控制台生命周期契约（W2.4）', () => {
  let root: string
  let markerDir: string
  let userDataDir: string
  let fakeWebBin: string
  let consoleLogs: string[]

  beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), 'innate-console-test-'))
    markerDir = path.join(root, 'marker')
    userDataDir = path.join(root, 'userdata')
    mkdirSync(markerDir, { recursive: true })
    mkdirSync(userDataDir, { recursive: true })
    electronState.userData = userDataDir

    writeFileSync(path.join(root, 'fake-web.js'), FAKE_WEB_JS)
    writeFileSync(path.join(root, 'fake-web.cmd'), CMD_SHIM.replace('%1', 'fake-web.js'))
    writeFileSync(path.join(root, 'fake-gateway.js'), FAKE_GATEWAY_JS)
    writeFileSync(path.join(root, 'fake-gateway.cmd'), CMD_SHIM.replace('%1', 'fake-gateway.js'))
    fakeWebBin = path.join(root, 'fake-web.cmd')
    process.env.INNATE_MAGPIE_BIN = path.join(root, 'fake-gateway.cmd')
  })

  beforeEach(() => {
    for (const f of readdirSync(markerDir)) rmSync(path.join(markerDir, f), { force: true })
    consoleLogs = []
  })

  afterAll(() => {
    // 防测试失败泄漏：清理任何残留 fake 进程（fake-web.cmd 树）
    const pidFile = path.join(markerDir, 'web-pid.txt')
    if (existsSync(pidFile)) {
      const pid = Number(readFileSync(pidFile, 'utf8'))
      if (pid > 0 && process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true })
      }
    }
    delete process.env.INNATE_MAGPIE_BIN
    rmSync(root, { recursive: true, force: true })
  })

  function newConsole(env: Record<string, string> = {}): MagpieConsole {
    return new MagpieConsole({
      binPath: fakeWebBin,
      userDataDir,
      env: { FAKE_WEB_MARKER_DIR: markerDir, ...env },
      startTimeoutMs: 8_000,
      log: (line) => consoleLogs.push(line),
    })
  }

  function readCount(): number {
    const f = path.join(markerDir, 'web-spawn-count.txt')
    return existsSync(f) ? parseInt(readFileSync(f, 'utf8'), 10) || 0 : 0
  }

  async function expectProcessGone(pid: number): Promise<void> {
    for (let i = 0; i < 50; i++) {
      try {
        process.kill(pid, 0)
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ESRCH') return
      }
      await new Promise((r) => setTimeout(r, 100))
    }
    throw new Error(`进程 ${pid} 仍存活（孤儿进程）`)
  }

  it('F1: 重复 show 不重复 spawn', async () => {
    const con = newConsole()
    const r1 = await con.ensureReady()
    const r2 = await con.ensureReady()
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    expect(r2.url).toBe(r1.url)
    expect(readCount()).toBe(1)
    await con.stop()
  })

  it('F1: 运行中重复 ensureReady URL 不变、不触发新状态事件', async () => {
    const con = newConsole()
    const phases: string[] = []
    con.on('state', (s) => phases.push(s.phase))
    const r1 = await con.ensureReady()
    const r2 = await con.ensureReady()
    expect(r2.url).toBe(r1.url)
    expect(readCount()).toBe(1)
    expect(phases).toEqual(['starting', 'running'])
    await con.stop()
  })

  it('F1: 缺 key 报错且可重试', async () => {
    const bad = newConsole({ FAKE_WEB_MODE: 'nokey' })
    const r1 = await bad.ensureReady()
    expect(r1.ok).toBe(false)
    expect(r1.detail).toContain('认证链接')
    expect(bad.getState().phase).toBe('failed')
    // 失败只影响控制台自身：新实例独立恢复成功
    const con = newConsole()
    const r2 = await con.ensureReady()
    expect(r2.ok).toBe(true)
    expect(readCount()).toBe(2)
    await con.stop()
  })

  it('F1: 进程退出可见（exit code 透出）', async () => {
    const con = newConsole({ FAKE_WEB_MODE: 'exit' })
    const r = await con.ensureReady()
    expect(r.ok).toBe(false)
    expect(r.detail).toContain('code 3')
    expect(con.getState().phase).toBe('failed')
  })

  it('F1: stop 只回收自己启动的进程，关闭无孤儿', async () => {
    const con = newConsole()
    const r = await con.ensureReady()
    expect(r.ok).toBe(true)
    const pid = Number(readFileSync(path.join(markerDir, 'web-pid.txt'), 'utf8'))
    expect(pid).toBeGreaterThan(0)
    await con.stop()
    expect(con.getState().phase).toBe('stopped')
    await expectProcessGone(pid)
    // 可再次启动（新端口、新进程，无残留）
    const r2 = await con.ensureReady()
    expect(r2.ok).toBe(true)
    expect(r2.url).not.toBe(r.url)
    await con.stop()
  })

  it('F1: URL 不变不 reload（SurfaceHost 集成：重复 show 只 loadURL 一次）', async () => {
    const con = newConsole()
    await con.ensureReady()
    const contentView = { addChildView: vi.fn(), removeChildView: vi.fn() }
    const host = new SurfaceHost({ contentView } as unknown as BrowserWindow)
    host.registerProvider({
      id: 'magpie-console',
      kind: 'webcontents',
      resolve: async () => {
        const r = await con.ensureReady()
        return r.ok && r.url ? { ok: true as const, url: r.url } : { ok: false as const, detail: r.detail }
      },
    })
    const descriptor = { id: 'magpie-console', providerId: 'magpie-console', kind: 'webcontents', title: '控制台' }
    const bounds = { x: 0, y: 0, width: 800, height: 600 }
    const show1 = await host.show(descriptor, bounds)
    const show2 = await host.show(descriptor, bounds)
    expect(show1.ok).toBe(true)
    expect(show2.ok).toBe(true)
    expect(electronState.views[0].webContents.loadURL).toHaveBeenCalledTimes(1)
    await con.stop()
  })

  it('key 存储：每安装稳定、仅存 userData、损坏/过短重生成', () => {
    const keyFile = path.join(userDataDir, 'console-key.json')
    const k1 = consoleKey(userDataDir)
    expect(k1).toMatch(/^innate-[0-9a-f]{24}$/)
    expect(consoleKey(userDataDir)).toBe(k1)
    expect(readdirSync(userDataDir)).toContain('console-key.json')
    // 损坏 JSON → 重新生成合法 key
    writeFileSync(keyFile, '{not-json')
    const k2 = consoleKey(userDataDir)
    expect(k2).toMatch(/^innate-[0-9a-f]{24}$/)
    expect(k2).not.toBe(k1)
    expect(JSON.parse(readFileSync(keyFile, 'utf-8')).key).toBe(k2)
    // 过短 key → 重新生成
    writeFileSync(keyFile, JSON.stringify({ key: 'short' }))
    const k3 = consoleKey(userDataDir)
    expect(k3).toMatch(/^innate-[0-9a-f]{24}$/)
    expect(k3).not.toBe(k2)
  })

  it('key 存储：MAGPIE_WEB_KEY 环境变量优先且不写文件', () => {
    const keyFile = path.join(userDataDir, 'console-key.json')
    rmSync(keyFile, { force: true })
    process.env.MAGPIE_WEB_KEY = 'env-override-key-1234567890'
    try {
      expect(consoleKey(userDataDir)).toBe('env-override-key-1234567890')
      expect(existsSync(keyFile)).toBe(false)
    } finally {
      delete process.env.MAGPIE_WEB_KEY
    }
  })

  it('F1-V2: 日志与状态消息只含脱敏地址，getState 不暴露 URL', async () => {
    const con = newConsole()
    const emittedLogs: string[] = []
    con.on('log', (line) => emittedLogs.push(line))
    const r = await con.ensureReady()
    expect(r.ok).toBe(true)
    const key = JSON.parse(readFileSync(path.join(userDataDir, 'console-key.json'), 'utf-8')).key as string
    expect(key).toMatch(/^innate-[0-9a-f]{24}$/)
    const allLines = [...consoleLogs, ...emittedLogs, con.getState().message]
    for (const line of allLines) {
      expect(line).not.toContain(key)
      // ?k= 后必须已被替换为 [redacted]，不得出现明文值
      expect(line).not.toMatch(/\?k=[^[]/)
    }
    // 子进程 URL 行过脱敏边界：?k= 值替换为 [redacted]
    expect(emittedLogs.some((l) => l.includes('?k=[redacted]'))).toBe(true)
    // 脱敏边界本身：真实 key 进入 URL 也被替换
    expect(redactLaunchSecrets(`http://127.0.0.1:4200/?k=${key}`)).toContain('?k=[redacted]')
    // getState 不暴露 URL（认证 URL 只走 ensureReady 授权返回值）
    expect(con.getState()).not.toHaveProperty('url')
    await con.stop()
  })

  it('启动失败只影响控制台：console 失败后 gateway 仍独立可用', async () => {
    const bad = newConsole({ FAKE_WEB_MODE: 'nokey' })
    expect((await bad.ensureReady()).ok).toBe(false)
    // gateway 不受 console 失败影响：healthcheck 复用 → running
    const gw = getGateway()
    await gw.ensureRunning()
    expect(gw.status().state).toBe('running')
    expect((await startMagpie()).ok).toBe(true)
  })
})
