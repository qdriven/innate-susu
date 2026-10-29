import { spawn, execFile, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import type { GatewayStatus } from '@dogic/sdk'

const HEALTH_TIMEOUT_MS = 15_000
const HEALTH_INTERVAL_MS = 500
const RESTART_DELAYS_MS = [500, 1_000, 2_000, 5_000, 10_000]

export type GatewayLog = (line: string) => void

export interface MagpieGatewayOptions {
  binPath: string
  /** magpie 形态：desktop（桌面版，无参启动）或 serve（纯网关） */
  form?: 'desktop' | 'serve'
  env?: Record<string, string>
  log?: GatewayLog
  /** 单次健康检查超时 */
  healthTimeoutMs?: number
  /** ensureRunning 健康等待总超时 */
  startTimeoutMs?: number
  /** 健康检查轮询间隔 */
  healthIntervalMs?: number
  /** 崩溃重启退避序列（毫秒），按序循环取值 */
  restartDelaysMs?: number[]
}

/** magpie sidecar：进程托管、健康检查、崩溃重启与 dsh 接线；状态映射 GatewayStatus 契约。 */
export class MagpieGateway {
  private readonly binPath: string
  private readonly form: 'desktop' | 'serve'
  private readonly env: Record<string, string>
  private readonly log: GatewayLog
  private readonly healthTimeoutMs: number
  private readonly startTimeoutMs: number
  private readonly healthIntervalMs: number
  private readonly restartDelaysMs: number[]
  private child: ChildProcess | null = null
  private restartCount = 0
  private stopping = false
  private statusListeners: Array<(status: GatewayStatus) => void> = []
  private currentStatus: GatewayStatus = { state: 'not-running' }

  constructor({
    binPath,
    form = 'serve',
    env = {},
    log = () => {},
    healthTimeoutMs = HEALTH_TIMEOUT_MS,
    startTimeoutMs = HEALTH_TIMEOUT_MS,
    healthIntervalMs = HEALTH_INTERVAL_MS,
    restartDelaysMs = RESTART_DELAYS_MS,
  }: MagpieGatewayOptions) {
    if (!binPath) throw new Error('MagpieGateway: binPath is required')
    this.binPath = binPath
    this.form = form
    this.env = env
    this.log = log
    this.healthTimeoutMs = healthTimeoutMs
    this.startTimeoutMs = startTimeoutMs
    this.healthIntervalMs = healthIntervalMs
    this.restartDelaysMs = restartDelaysMs
  }

  status(): GatewayStatus {
    return this.currentStatus
  }

  onStatusChange(listener: (status: GatewayStatus) => void): () => void {
    this.statusListeners.push(listener)
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener)
    }
  }

  private setStatus(status: GatewayStatus): void {
    this.currentStatus = status
    for (const listener of this.statusListeners) {
      try {
        listener(status)
      } catch {
        /* 监听器异常不阻断网关生命周期 */
      }
    }
  }

  installed(): boolean {
    return existsSync(this.binPath)
  }

  async healthy(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile(
        this.binPath,
        ['healthcheck'],
        { timeout: this.healthTimeoutMs, shell: process.platform === 'win32' },
        (error) => resolve(!error),
      )
    })
  }

  gatewayUrl(): string {
    return 'http://127.0.0.1:3425'
  }

  async ensureRunning(): Promise<void> {
    if (await this.healthy()) {
      this.log('[gateway] already healthy, reusing existing instance')
      this.setStatus({ state: 'running', url: this.gatewayUrl() })
      return
    }
    if (!this.installed()) {
      this.setStatus({ state: 'not-installed', message: `magpie not found at ${this.binPath}` })
      throw new Error(`magpie not found at ${this.binPath}`)
    }
    if (!this.child) {
      this.stopping = false
      this.spawnSidecar()
    }
    this.setStatus({ state: 'starting' })
    const deadline = Date.now() + this.startTimeoutMs
    while (Date.now() < deadline) {
      if (await this.healthy()) {
        this.setStatus({ state: 'running', url: this.gatewayUrl() })
        this.log('[gateway] healthy')
        return
      }
      await new Promise((resolve) => setTimeout(resolve, this.healthIntervalMs))
    }
    const message = `magpie gateway did not become healthy within ${this.startTimeoutMs}ms`
    this.setStatus({ state: 'error', message, recoverable: true })
    throw new Error(message)
  }

  private serveArgs(): string[] {
    return this.form === 'serve' ? ['serve'] : []
  }

  private spawnSidecar(): void {
    this.log('[gateway] starting magpie …')
    const child = spawn(this.binPath, this.serveArgs(), {
      env: { ...process.env, ...this.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      shell: process.platform === 'win32',
    })
    this.child = child
    child.stdout?.on('data', (data: Buffer) => this.log(`[magpie] ${String(data).trimEnd()}`))
    child.stderr?.on('data', (data: Buffer) => this.log(`[magpie!] ${String(data).trimEnd()}`))
    child.on('error', (error) => {
      this.child = null
      this.setStatus({ state: 'error', message: error.message, recoverable: true })
    })
    child.on('exit', (code) => {
      this.child = null
      if (this.stopping) return
      const delay = this.restartDelaysMs[Math.min(this.restartCount++, this.restartDelaysMs.length - 1)]
      this.log(`[gateway] exited (${code}); restarting in ${delay}ms`)
      this.setStatus({ state: 'error', message: `magpie exited unexpectedly (${code}), restarting`, recoverable: true })
      setTimeout(() => {
        if (!this.stopping) this.spawnSidecar()
      }, delay)
    })
  }

  wireDsh(model: string, dshHome: string): Promise<string> {
    // Windows shell:true 会把参数拼接进命令行，模型名必须为白名单字符，杜绝注入面。
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(model)) {
      return Promise.reject(new Error(`magpie dsh model 参数非法: ${model}`))
    }
    return new Promise((resolve, reject) => {
      execFile(
        this.binPath,
        ['dsh', model],
        { env: { ...process.env, ...this.env, DSH_HOME: dshHome }, timeout: 30_000, shell: process.platform === 'win32' },
        (error, stdout, stderr) => {
          if (error) return reject(new Error(`magpie dsh failed: ${stderr || error.message}`))
          this.log(`[gateway] wired dsh → ${model}`)
          resolve(String(stdout))
        },
      )
    })
  }

  unwireDsh(dshHome: string): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile(
        this.binPath,
        ['dsh', 'default'],
        { env: { ...process.env, ...this.env, DSH_HOME: dshHome }, timeout: 30_000, shell: process.platform === 'win32' },
        (error, _stdout, stderr) => {
          if (error) return reject(new Error(`magpie dsh default failed: ${stderr || error.message}`))
          resolve()
        },
      )
    })
  }

  async quota(): Promise<string | null> {
    return new Promise((resolve) => {
      execFile(
        this.binPath,
        ['usage', 'today'],
        { env: { ...process.env, ...this.env }, timeout: 10_000, shell: process.platform === 'win32' },
        (error, stdout) => {
          resolve(error ? null : String(stdout))
        },
      )
    })
  }

  async stop(): Promise<void> {
    this.stopping = true
    this.child?.kill()
    this.child = null
    this.setStatus({ state: 'not-running' })
  }
}
