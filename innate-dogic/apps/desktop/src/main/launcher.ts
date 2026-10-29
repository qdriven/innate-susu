import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { EventEmitter } from 'node:events'
import path from 'node:path'
import { app } from 'electron'
import { MagpieGateway } from '@dogic/service-model-gateway'
import { dshHome, redactLaunchSecrets } from '@dogic/core'

let gateway: MagpieGateway | undefined

/**
 * 网关唯一实现：桌面经 MagpieGateway 复用/拉起 magpie（healthcheck 复用、
 * 崩溃退避、显式停止），不再私有维护第二套等价 serve 生命周期。
 */
export function getGateway(): MagpieGateway {
  if (!gateway) {
    const form = process.env.INNATE_MAGPIE_FORM === 'serve' ? 'serve' : 'desktop'
    gateway = new MagpieGateway({
      binPath: resolveMagpieBin(),
      form,
      env: { ...process.env, DSH_HOME: dshHome() },
      // 网关日志过脱敏边界：认证 URL/token 不进日志
      log: (line) => console.log(`[innate:gateway] ${redactLaunchSecrets(line)}`),
    })
  }
  return gateway
}

/** 启动 magpie（经统一网关生命周期；已健康实例复用不重复启动） */
export async function startMagpie(): Promise<{ ok: boolean; detail: string }> {
  const gw = getGateway()
  try {
    await gw.ensureRunning()
    const { state } = gw.status()
    const form = process.env.INNATE_MAGPIE_FORM ?? 'desktop'
    return {
      ok: state === 'running',
      detail: state === 'running' ? `magpie（${form} 形态）已就绪` : `启动未就绪（状态 ${state}）`,
    }
  } catch (e) {
    return { ok: false, detail: `启动失败: ${String(e)}（可手动打开 magpie 桌面版）` }
  }
}

export const MAGPIE_WEB_FALLBACK = 'http://127.0.0.1:3430'

/** magpie 可执行文件解析：显式路径 → 打包资源 → 工作区/源码仓库 → PATH */
export function resolveMagpieBin(): string {
  if (process.env.INNATE_MAGPIE_BIN) return process.env.INNATE_MAGPIE_BIN
  const workspaceRoot = process.env.INNATE_WORKSPACE_ROOT
  const candidates = [
    path.join(process.resourcesPath ?? '', 'magpie.exe'),
    ...(workspaceRoot ? [path.join(workspaceRoot, 'innate-dogic', 'bin', 'magpie.exe')] : []),
    path.resolve(app.getAppPath(), '../../bin/magpie.exe'),
  ]
  for (const p of candidates) if (existsSync(p)) return p
  return 'magpie'
}

/** 每安装一次的稳定 web key（magpie web 的 ?k= 认证，见 M1 T1.0 侦察结论）。
 * 仅存 userData/console-key.json；损坏或过短则重新生成。 */
export function consoleKey(userDataDir: string = app.getPath('userData')): string {
  if (process.env.MAGPIE_WEB_KEY) return process.env.MAGPIE_WEB_KEY
  const file = path.join(userDataDir, 'console-key.json')
  try {
    const saved = JSON.parse(readFileSync(file, 'utf-8')) as { key?: string }
    if (saved.key && saved.key.length >= 16) return saved.key
  } catch {
    /* 首次或损坏：重新生成 */
  }
  const key = `innate-${randomBytes(12).toString('hex')}`
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify({ key }))
  return key
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number }
      server.close(() => resolve(port))
    })
  })
}

/** 整树回收：win32 上 shell:true 时 cmd 包裹 magpie，须 /T 杀子树；其他平台 SIGTERM。 */
function killTree(child: ChildProcess): void {
  if (child.pid === undefined) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true })
  } else {
    child.kill('SIGTERM')
  }
}

/** 控制台冷启动上限；慢机器/杀软扫描环境可用环境变量放宽（冒烟用）。 */
const CONSOLE_START_TIMEOUT_MS = Number(process.env.INNATE_MAGPIE_CONSOLE_TIMEOUT_MS ?? 15_000)

export interface ConsoleReady {
  ok: boolean
  url?: string
  detail: string
}

export type ConsolePhase = 'idle' | 'starting' | 'running' | 'failed' | 'stopped'

export interface ConsoleState {
  phase: ConsolePhase
  message: string
}

export interface MagpieConsoleOptions {
  binPath?: string
  userDataDir?: string
  env?: Record<string, string>
  startTimeoutMs?: number
  log?: (line: string) => void
}

/**
 * 受管 magpie web 控制台（W1c 通用生命周期）。
 *
 * 与 HarnessRuntime 同款：phase 状态机 + state/log 事件 + 日志缓冲 + 仅回收自己启动的进程。
 * 认证 URL（含 ?k=）只在 main 内流转：getState/日志都拿不到真实值；URL 只经
 * ensureReady 返回值走授权 IPC 边界（SurfaceHost loadURL / shell.openExternal）。
 * 启动失败只影响控制台自身：返回 ok:false + 原因，不抛出、不触碰网关。
 */
export class MagpieConsole extends EventEmitter {
  private child?: ChildProcess
  private phase: ConsolePhase = 'idle'
  private message = '控制台未运行'
  private url: string | undefined
  private logBuffer: string[] = []
  private starting?: Promise<ConsoleReady>

  private readonly binPath: string
  private readonly userDataDir: string
  private readonly env: Record<string, string>
  private readonly startTimeoutMs: number
  private readonly log: (line: string) => void

  constructor(options: MagpieConsoleOptions = {}) {
    super()
    this.binPath = options.binPath ?? resolveMagpieBin()
    this.userDataDir = options.userDataDir ?? app.getPath('userData')
    this.env = options.env ?? {}
    this.startTimeoutMs = options.startTimeoutMs ?? CONSOLE_START_TIMEOUT_MS
    this.log = options.log ?? (() => {})
  }

  getState(): ConsoleState {
    return { phase: this.phase, message: this.message }
  }

  /** 运行中返回同一 URL（不重复 spawn、URL 不变 → SurfaceHost 不 reload）；未运行则冷启动。 */
  async ensureReady(): Promise<ConsoleReady> {
    if (this.child && this.url) return { ok: true, url: this.url, detail: '控制台运行中' }
    if (this.starting) return this.starting
    this.starting = this.doStart().finally(() => {
      this.starting = undefined
    })
    return this.starting
  }

  private async doStart(): Promise<ConsoleReady> {
    this.setPhase('starting', `启动控制台（超时 ${Math.round(this.startTimeoutMs / 1000)}s）…`)
    const port = await freePort()
    return await new Promise<ConsoleReady>((resolve) => {
      // 使用独立端口与受管 key，绝不猜测已有 magpie desktop/web 实例的认证信息
      const child = spawn(this.binPath, ['web', '--no-open', '--addr', `127.0.0.1:${port}`], {
        env: { ...process.env, ...this.env, MAGPIE_WEB_KEY: consoleKey(this.userDataDir) },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        shell: process.platform === 'win32',
      })
      this.child = child
      let settled = false
      const finish = (result: ConsoleReady): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(result)
      }
      const timer = setTimeout(() => {
        killTree(child)
        this.child = undefined
        this.url = undefined
        const detail = `控制台启动超时（${Math.round(this.startTimeoutMs / 1000)}s）。请检查 magpie 是否可用后重试。`
        this.setPhase('failed', detail)
        finish({ ok: false, detail })
      }, this.startTimeoutMs)

      const onData = (data: unknown): void => {
        const match = String(data).match(/magpie web on (http:\/\/\S+)/)
        if (!match) return
        let parsed: URL
        try {
          parsed = new URL(match[1])
        } catch {
          return
        }
        if (!parsed.searchParams.get('k')) {
          this.child = undefined
          const detail = 'magpie 未返回控制台认证链接，请升级 magpie 后重试。'
          this.setPhase('failed', detail)
          finish({ ok: false, detail })
          return
        }
        this.url = parsed.toString()
        const detail = '受管控制台已启动'
        this.setPhase('running', `控制台运行中（端口 ${port}）`)
        finish({ ok: true, url: this.url, detail })
      }
      child.stdout?.on('data', (chunk: Buffer) => {
        this.emitLines(chunk)
        onData(chunk)
      })
      child.stderr?.on('data', (chunk: Buffer) => {
        this.emitLines(chunk)
        onData(chunk)
      })
      child.on('error', (error) => {
        if (this.child !== child) return
        this.child = undefined
        const detail = `控制台启动失败: ${error.message}（magpie CLI 不在 PATH？）`
        this.setPhase('failed', detail)
        finish({ ok: false, detail })
      })
      child.on('exit', (code) => {
        // 已 stop（child 置空）或已被新进程取代的旧进程退出不再翻转状态
        if (this.child !== child) return
        this.child = undefined
        this.url = undefined
        const wasRunning = this.phase === 'running'
        const detail = wasRunning ? `控制台已退出 (code ${code})` : `控制台进程已退出 (code ${code})，请重新连接。`
        this.setPhase(wasRunning ? 'stopped' : 'failed', detail)
        finish({ ok: false, detail })
      })
    })
  }

  /** 只回收自己启动的进程树；不终止非本应用拥有的已有实例。 */
  async stop(): Promise<void> {
    const child = this.child
    this.child = undefined
    this.url = undefined
    if (!child || child.pid === undefined) {
      this.setPhase('idle', '控制台未运行')
      return
    }
    killTree(child)
    this.setPhase('stopped', '已请求停止控制台')
  }

  private setPhase(phase: ConsolePhase, message: string): void {
    this.phase = phase
    this.message = message
    this.emit('state', this.getState())
  }

  /** 子进程输出逐行过脱敏边界后进日志缓冲/事件/外部 log。 */
  private emitLines(chunk: Buffer): void {
    for (const line of chunk.toString('utf8').split(/\r?\n/)) {
      if (line) this.logLine(line)
    }
  }

  private logLine(line: string): void {
    // 一切日志先过脱敏边界：认证 URL/token 不进日志、快照
    const safe = redactLaunchSecrets(line)
    this.logBuffer.push(safe)
    if (this.logBuffer.length > 2000) this.logBuffer.splice(0, this.logBuffer.length - 2000)
    this.emit('log', safe)
    this.log(safe)
  }
}

let consoleInstance: MagpieConsole | undefined

function getConsole(): MagpieConsole {
  if (!consoleInstance) {
    consoleInstance = new MagpieConsole({
      log: (line) => console.log(`[innate:console] ${line}`),
    })
  }
  return consoleInstance
}

/** 控制台冷/热启动统一入口（W1c 生命周期）；运行中复用同一 URL，不重复 spawn。 */
export async function ensureMagpieConsole(): Promise<ConsoleReady> {
  return getConsole().ensureReady()
}

/** 应用退出时回收托管的控制台进程（仅自己启动的进程树）。 */
export async function stopMagpieConsole(): Promise<void> {
  await getConsole().stop()
}
