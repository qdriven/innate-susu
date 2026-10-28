/**
 * MagpieModelGateway — ModelGateway 接口的 magpie 实现。
 *
 * 内部调用 magpie CLI，实现接线、配额等功能。
 */
import type {
  ModelGateway,
  GatewayStatus,
  Provider,
  AgentWiring,
  ModelRef,
  QuotaInfo,
} from '@dogic/sdk'
import { MagpieProcess, type ProcessStatus } from './process.js'
import { MagpieCli } from './magpie-cli.js'
import { detectMagpie, MIN_MAGPIE_VERSION } from './detect.js'

export class MagpieModelGateway implements ModelGateway {
  private process: MagpieProcess | null = null
  private cli: MagpieCli | null = null
  private binaryPath: string | null = null
  private quotaCache: QuotaInfo[] = []
  private statusListeners: Array<(s: GatewayStatus) => void> = []
  private _status: GatewayStatus = { state: 'not-installed' }

  constructor(
    private options: {
      binaryPath?: string
      env?: Record<string, string>
    } = {},
  ) {}

  status(): GatewayStatus {
    return this._status
  }

  /**
   * 确保网关运行。
   */
  async ensureRunning(): Promise<void> {
    // 1. 探测 magpie
    if (!this.binaryPath) {
      if (this.options.binaryPath) {
        this.binaryPath = this.options.binaryPath
      } else {
        const detection = await detectMagpie(MIN_MAGPIE_VERSION)
        if (!detection.found || !detection.path) {
          this.setStatus({ state: 'not-installed', message: 'magpie binary not found' })
          throw new Error('magpie is not installed')
        }
        if (!detection.satisfiesMinimum) {
          this.setStatus({
            state: 'error',
            message: `magpie version ${detection.version} is below minimum ${MIN_MAGPIE_VERSION}`,
            recoverable: false,
          })
          throw new Error(`magpie version too old: ${detection.version}`)
        }
        this.binaryPath = detection.path
      }
    }

    // 2. 启动进程（如果需要）
    if (!this.process) {
      this.cli = new MagpieCli({ binaryPath: this.binaryPath, env: this.options.env })
      this.process = new MagpieProcess(this.binaryPath, { env: this.options.env })
      this.process.on('status', ({ status, error }) => {
        this.handleProcessStatus(status, error)
      })
    }

    this.setStatus({ state: 'starting' })
    await this.process.start()

    this.setStatus({ state: 'running', url: 'http://127.0.0.1:3425' })
  }

  async listProviders(): Promise<Provider[]> {
    if (!this.cli) return []
    const result = await this.cli.providers()
    // 解析 providers 输出（简化版，实际需要根据 CLI 输出格式解析）
    return this.parseProviders(result.stdout)
  }

  async listAgents(): Promise<AgentWiring[]> {
    if (!this.cli) return []
    const result = await this.cli.ls()
    return this.parseAgents(result.stdout)
  }

  async wireAgent(agentId: string, model: ModelRef): Promise<void> {
    if (!this.cli) {
      throw new Error('magpie CLI not initialized')
    }
    const modelStr = `${model.provider}/${model.model}`
    const result = await this.cli.wireAgent(agentId, modelStr)
    if (result.exitCode !== 0) {
      throw new Error(`wireAgent failed: ${result.stderr || result.stdout}`)
    }
  }

  async unwireAgent(agentId: string): Promise<void> {
    if (!this.cli) {
      throw new Error('magpie CLI not initialized')
    }
    const result = await this.cli.unwireAgent(agentId)
    if (result.exitCode !== 0) {
      throw new Error(`unwireAgent failed: ${result.stderr || result.stdout}`)
    }
  }

  gatewayUrl(): string {
    if (this._status.state === 'running') {
      return this._status.url
    }
    return ''
  }

  async quota(): Promise<QuotaInfo[]> {
    if (!this.cli) return this.quotaCache
    try {
      const result = await this.cli.quota()
      if (result.exitCode === 0) {
        this.quotaCache = this.parseQuota(result.stdout)
        return this.quotaCache
      }
      // 返回缓存 + 陈旧标记
      return this.quotaCache.map((q) => ({ ...q, stale: true }))
    } catch {
      return this.quotaCache.map((q) => ({ ...q, stale: true }))
    }
  }

  onStatusChange(listener: (s: GatewayStatus) => void): () => void {
    this.statusListeners.push(listener)
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener)
    }
  }

  /**
   * 停止网关进程。
   */
  async stop(): Promise<void> {
    if (this.process) {
      await this.process.stop()
      this.process = null
    }
    this.setStatus({ state: 'not-running' })
  }

  private setStatus(status: GatewayStatus): void {
    const prev = this._status
    this._status = status
    if (prev.state !== status.state) {
      for (const l of this.statusListeners) {
        try { l(status) } catch { /* ignore */ }
      }
    }
  }

  private handleProcessStatus(status: ProcessStatus, error?: Error): void {
    switch (status) {
      case 'running':
        this.setStatus({ state: 'running', url: 'http://127.0.0.1:3425' })
        break
      case 'starting':
        this.setStatus({ state: 'starting' })
        break
      case 'crashed':
        this.setStatus({ state: 'starting' }) // 正在重启
        break
      case 'stopped':
        this.setStatus({ state: 'not-running' })
        break
      case 'error':
        this.setStatus({
          state: 'error',
          message: error?.message ?? 'magpie process error',
          recoverable: true,
        })
        break
    }
  }

  // —— 输出解析 ——

  private parseProviders(stdout: string): Provider[] {
    // 简化解析：实际需根据 magpie providers 输出格式调整
    const providers: Provider[] = []
    const lines = stdout.split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      // 尝试匹配 "id  name  type" 格式
      const parts = trimmed.split(/\s{2,}/)
      if (parts.length >= 2) {
        providers.push({
          id: parts[0],
          name: parts[1] ?? parts[0],
          type: 'api-key',
          models: [],
          enabled: true,
        })
      }
    }
    return providers
  }

  private parseAgents(stdout: string): AgentWiring[] {
    // 简化解析
    const agents: AgentWiring[] = []
    const lines = stdout.split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const parts = trimmed.split(/\s{2,}/)
      if (parts.length >= 1) {
        agents.push({
          agentId: parts[0],
          wired: parts.length > 1,
          mode: 'gateway',
        })
      }
    }
    return agents
  }

  private parseQuota(stdout: string): QuotaInfo[] {
    // 简化解析
    const quotas: QuotaInfo[] = []
    const lines = stdout.split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const parts = trimmed.split(/\s{2,}/)
      if (parts.length >= 2) {
        const match = parts[1]?.match(/(\d+(?:\.\d+)?)/)
        quotas.push({
          provider: parts[0],
          used: match ? parseFloat(match[1]) : 0,
          unit: 'tokens',
          stale: false,
          updatedAt: Date.now(),
        })
      }
    }
    return quotas
  }
}
