import { spawn, execFile, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'

const HEALTH_TIMEOUT_MS = 15_000
const HEALTH_INTERVAL_MS = 500
const RESTART_DELAYS_MS = [500, 1_000, 2_000, 5_000, 10_000]

export type GatewayLog = (line: string) => void

export interface MagpieGatewayOptions {
  binPath: string
  log?: GatewayLog
}

/** magpie sidecar：进程托管、健康检查、崩溃重启与 dsh 接线。 */
export class MagpieGateway {
  private readonly binPath: string
  private readonly log: GatewayLog
  private child: ChildProcess | null = null
  private restartCount = 0
  private stopping = false

  constructor({ binPath, log = () => {} }: MagpieGatewayOptions) {
    if (!binPath) throw new Error('MagpieGateway: binPath is required')
    this.binPath = binPath
    this.log = log
  }

  installed(): boolean {
    return existsSync(this.binPath)
  }

  async healthy(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile(this.binPath, ['healthcheck'], { timeout: 5_000 }, (error) => resolve(!error))
    })
  }

  async ensureRunning(): Promise<void> {
    if (await this.healthy()) {
      this.log('[gateway] already healthy, reusing existing instance')
      return
    }
    if (!this.installed()) throw new Error(`magpie not found at ${this.binPath}`)
    this.stopping = false
    this.spawnSidecar()
    const deadline = Date.now() + HEALTH_TIMEOUT_MS
    while (Date.now() < deadline) {
      if (await this.healthy()) {
        this.log('[gateway] healthy')
        return
      }
      await new Promise((resolve) => setTimeout(resolve, HEALTH_INTERVAL_MS))
    }
    throw new Error(`magpie gateway did not become healthy within ${HEALTH_TIMEOUT_MS}ms`)
  }

  private spawnSidecar(): void {
    this.log('[gateway] starting magpie serve …')
    this.child = spawn(this.binPath, ['serve'], { stdio: ['ignore', 'pipe', 'pipe'] })
    this.child.stdout?.on('data', (data: Buffer) => this.log(`[magpie] ${String(data).trimEnd()}`))
    this.child.stderr?.on('data', (data: Buffer) => this.log(`[magpie!] ${String(data).trimEnd()}`))
    this.child.on('exit', (code) => {
      this.child = null
      if (this.stopping) return
      const delay = RESTART_DELAYS_MS[Math.min(this.restartCount++, RESTART_DELAYS_MS.length - 1)]
      this.log(`[gateway] exited (${code}); restarting in ${delay}ms`)
      setTimeout(() => {
        if (!this.stopping) this.spawnSidecar()
      }, delay)
    })
  }

  wireDsh(model: string, dshHome: string): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(
        this.binPath,
        ['dsh', model],
        { env: { ...process.env, DSH_HOME: dshHome }, timeout: 30_000 },
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
        { env: { ...process.env, DSH_HOME: dshHome }, timeout: 30_000 },
        (error, _stdout, stderr) => {
          if (error) return reject(new Error(`magpie dsh default failed: ${stderr || error.message}`))
          resolve()
        },
      )
    })
  }

  async quota(): Promise<string | null> {
    return new Promise((resolve) => {
      execFile(this.binPath, ['usage', 'today'], { timeout: 10_000 }, (error, stdout) => {
        resolve(error ? null : String(stdout))
      })
    })
  }

  stop(): void {
    this.stopping = true
    this.child?.kill()
    this.child = null
  }
}
