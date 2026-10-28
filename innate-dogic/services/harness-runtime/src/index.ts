import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:net'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { MagpieGateway, type GatewayLog } from '@dogic/service-model-gateway'
import { redactLaunchSecrets } from '@dogic/core'

export const DEFAULT_HARNESS_PORT = 43129
const READY_TIMEOUT_MS = 120_000
const READY_INTERVAL_MS = 500

export async function pickPort(preferred = DEFAULT_HARNESS_PORT): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => {
      const fallback = createServer()
      fallback.listen(0, '127.0.0.1', () => {
        const { port } = fallback.address() as AddressInfo
        fallback.close(() => resolve(port))
      })
    })
    server.listen(preferred, '127.0.0.1', () => server.close(() => resolve(preferred)))
  })
}

export interface HarnessRuntimeOptions {
  nodePath: string
  dshEntry: string
  dshHome: string
  port: number
  patchPaths?: string[]
  log?: GatewayLog
}

/** dsh Harness 托管：使用真实 Node，初始化 profile、捕获认证 URL 并检查就绪。 */
export class HarnessRuntime {
  private readonly nodePath: string
  private readonly dshEntry: string
  private readonly dshHome: string
  private readonly port: number
  private readonly patchPaths: string[]
  private readonly log: GatewayLog
  private child: ChildProcess | null = null
  private stopping = false
  authedUrl: string | null = null

  constructor({ nodePath, dshEntry, dshHome, port, patchPaths = [], log = () => {} }: HarnessRuntimeOptions) {
    this.nodePath = nodePath
    this.dshEntry = dshEntry
    this.dshHome = dshHome
    this.port = port
    this.patchPaths = patchPaths
    this.log = log
  }

  profileInitialized(): boolean {
    return existsSync(join(this.dshHome, 'profiles', 'web'))
  }

  url(): string {
    return `http://127.0.0.1:${this.port}`
  }

  async start(): Promise<void> {
    mkdirSync(this.dshHome, { recursive: true })
    this.stopping = false
    this.authedUrl = null
    this.log(`[harness] starting on 127.0.0.1:${this.port} (DSH_HOME=${this.dshHome})`)
    const args = [this.dshEntry, '--profile', 'web']
    for (const patch of this.patchPaths) args.push('--patch', patch)
    args.push('--no-open', '--port', String(this.port))
    const env: NodeJS.ProcessEnv = { ...process.env, DSH_HOME: this.dshHome }
    delete env.ELECTRON_RUN_AS_NODE
    const child = spawn(this.nodePath, args, { env, stdio: ['ignore', 'pipe', 'pipe'] })
    this.child = child
    child.stdout?.on('data', (data: Buffer) => {
      const text = String(data)
      const match = text.match(/dsh web:\s*(http:\/\/\S+)/)
      if (match) {
        this.authedUrl = match[1]
        this.log('[harness] captured authenticated URL')
      }
      // authedUrl 运行态持真实值；日志输出统一过脱敏边界
      this.log(`[dsh] ${redactLaunchSecrets(text.trimEnd())}`)
    })
    child.stderr?.on('data', (data: Buffer) => this.log(`[dsh!] ${redactLaunchSecrets(String(data).trimEnd())}`))
    child.on('error', (error) => this.log(`[harness] spawn failed: ${String(error)}`))
    child.on('exit', (code) => {
      this.child = null
      if (!this.stopping) this.log(`[harness] exited unexpectedly (${code})`)
    })
    await this.waitUntilReady()
  }

  async waitUntilReady(): Promise<void> {
    const deadline = Date.now() + READY_TIMEOUT_MS
    while (Date.now() < deadline) {
      if (this.authedUrl) {
        const url = this.authedUrl
        const ok = await fetch(url, { signal: AbortSignal.timeout(3_000), redirect: 'manual' })
          .then((response) => response.status < 500)
          .catch(() => false)
        if (ok) {
          this.log('[harness] ready')
          return
        }
      }
      await new Promise((resolve) => setTimeout(resolve, READY_INTERVAL_MS))
    }
    throw new Error(`Harness did not become ready within ${READY_TIMEOUT_MS}ms`)
  }

  async stop(): Promise<void> {
    this.stopping = true
    if (!this.child) return
    this.child.kill()
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    this.child = null
  }

  async restart(): Promise<void> {
    await this.stop()
    await this.start()
  }
}

export interface BootBackendOptions {
  nodePath: string
  magpieBin: string
  dshEntry: string
  dshHome: string
  patchPaths?: string[]
  desiredModel?: string
  log?: GatewayLog
  onPhase?: (phase: string, detail?: string) => void
}

export interface BackendHandle {
  url: string
  authedUrl: string
  port: number
  gateway: MagpieGateway
  harness: HarnessRuntime
  stop: () => Promise<void>
}

/** 壳层无关的后端编排：gateway → 首次初始化 → wire → harness → authedUrl。 */
export async function bootBackend(options: BootBackendOptions): Promise<BackendHandle> {
  const log = options.log ?? (() => {})
  const phase = options.onPhase ?? (() => {})
  const desiredModel = options.desiredModel ?? 'zcode/GLM-5.3'

  phase('gateway', '启动模型网关（magpie sidecar）…')
  const gateway = new MagpieGateway({ binPath: options.magpieBin, log })
  await gateway.ensureRunning()

  const port = await pickPort()
  const harness = new HarnessRuntime({
    nodePath: options.nodePath,
    dshEntry: options.dshEntry,
    dshHome: options.dshHome,
    port,
    patchPaths: options.patchPaths ?? [],
    log,
  })

  if (!harness.profileInitialized()) {
    phase('harness-init', '首次运行：初始化 Harness profile …')
    await harness.start()
    await harness.stop()
  }

  phase('wire', `统一配置模型 → ${desiredModel}`)
  await gateway.wireDsh(desiredModel, options.dshHome)
  phase('harness', '启动 Harness Web UI …')
  await harness.start()
  phase('ready', harness.url())

  return {
    url: harness.url(),
    authedUrl: harness.authedUrl ?? harness.url(),
    port,
    gateway,
    harness,
    async stop() {
      await harness.stop()
      gateway.stop()
    },
  }
}
