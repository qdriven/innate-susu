/**
 * magpie 进程托管。
 *
 * spawn magpie serve；随宿主退出回收；崩溃指数退避重启（10s 内拉起）。
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { MagpieCli } from './magpie-cli.js'

export type ProcessStatus = 'stopped' | 'starting' | 'running' | 'crashed' | 'error'

export interface ProcessStatusEvent {
  status: ProcessStatus
  error?: Error
}

export class MagpieProcess extends EventEmitter {
  private process: ChildProcess | null = null
  private _status: ProcessStatus = 'stopped'
  private restartTimer: NodeJS.Timeout | null = null
  private restartAttempts = 0
  private stopping = false
  private cli: MagpieCli

  constructor(
    private binaryPath: string,
    private options: {
      env?: Record<string, string>
      /** 最大重启次数 */
      maxRestarts?: number
      /** 基础退避时间（毫秒） */
      baseBackoff?: number
      /** 最大退避时间（毫秒） */
      maxBackoff?: number
    } = {},
  ) {
    super()
    this.cli = new MagpieCli({ binaryPath, env: options.env })
  }

  get status(): ProcessStatus {
    return this._status
  }

  /**
   * 启动 magpie serve。
   */
  async start(): Promise<void> {
    if (this._status === 'running' || this._status === 'starting') return

    this.stopping = false
    this.setStatus('starting')

    this.process = this.cli.serve()
    this.process.on('exit', (code, signal) => this.onExit(code, signal))
    this.process.on('error', (err) => {
      this.setStatus('error', err)
    })

    // 等待 healthcheck 通过
    const healthy = await this.waitForHealth(30_000)
    if (!healthy) {
      this.setStatus('error', new Error('magpie healthcheck timed out'))
      return
    }

    this.restartAttempts = 0
    this.setStatus('running')
  }

  /**
   * 停止 magpie serve。
   */
  async stop(): Promise<void> {
    this.stopping = true
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
    if (this.process) {
      const proc = this.process
      this.process = null
      proc.removeAllListeners('exit')
      proc.kill('SIGTERM')
      // 强制 kill 兜底
      setTimeout(() => {
        try { proc.kill('SIGKILL') } catch { /* ignore */ }
      }, 3000)
    }
    this.setStatus('stopped')
  }

  /**
   * 重启。
   */
  async restart(): Promise<void> {
    await this.stop()
    await this.start()
  }

  private setStatus(status: ProcessStatus, error?: Error): void {
    this._status = status
    this.emit('status', { status, error })
  }

  private onExit(code: number | null, signal: string | null): void {
    if (this.stopping) return

    const maxRestarts = this.options.maxRestarts ?? 10
    if (this.restartAttempts >= maxRestarts) {
      this.setStatus('error', new Error(`magpie exited ${signal ?? code} after ${maxRestarts} restarts`))
      return
    }

    this.setStatus('crashed', new Error(`magpie exited ${signal ?? code}`))

    // 指数退避重启
    const baseBackoff = this.options.baseBackoff ?? 1000
    const maxBackoff = this.options.maxBackoff ?? 10_000
    const delay = Math.min(baseBackoff * Math.pow(2, this.restartAttempts), maxBackoff)
    this.restartAttempts++

    this.restartTimer = setTimeout(() => {
      this.restartTimer = null
      this.start().catch((err) => this.setStatus('error', err))
    }, delay)
  }

  /**
   * 轮询 healthcheck 直到健康或超时。
   */
  private async waitForHealth(timeout: number): Promise<boolean> {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      const healthy = await this.cli.healthcheck()
      if (healthy) return true
      await new Promise((r) => setTimeout(r, 500))
    }
    return false
  }
}
