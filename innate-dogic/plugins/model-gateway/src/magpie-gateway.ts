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
import { MagpieCli, parseProviders, parseAgents, parseQuota } from './magpie-cli.js'
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
      /** 注入 CLI（测试/定制用；缺省按 binaryPath 构造） */
      cli?: MagpieCli
    } = {},
  ) {}

  status(): GatewayStatus {
    return this._status
  }

  /** 惰性取得 CLI：支持注入（测试/定制），缺省按 binaryPath 构造。 */
  private ensureCli(): MagpieCli | null {
    if (this.cli) return this.cli
    if (!this.options.cli && !this.binaryPath && !this.options.binaryPath) return null
    this.cli = this.options.cli ?? new MagpieCli({
      binaryPath: this.binaryPath ?? this.options.binaryPath ?? 'magpie',
      env: this.options.env,
    })
    return this.cli
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
      this.cli = this.options.cli ?? new MagpieCli({ binaryPath: this.binaryPath, env: this.options.env })
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
    const cli = this.ensureCli()
    if (!cli) return []
    const result = await cli.providers()
    return parseProviders(result.stdout)
  }

  async listAgents(): Promise<AgentWiring[]> {
    const cli = this.ensureCli()
    if (!cli) return []
    const result = await cli.ls()
    return parseAgents(result.stdout)
  }

  async wireAgent(agentId: string, model: ModelRef): Promise<void> {
    const cli = this.ensureCli()
    if (!cli) {
      throw new Error('magpie CLI not initialized')
    }
    const modelStr = `${model.provider}/${model.model}`
    const result = await cli.wireAgent(agentId, modelStr)
    if (result.exitCode !== 0) {
      throw new Error(`wireAgent failed: ${result.stderr || result.stdout}`)
    }
  }

  async unwireAgent(agentId: string): Promise<void> {
    const cli = this.ensureCli()
    if (!cli) {
      throw new Error('magpie CLI not initialized')
    }
    const result = await cli.unwireAgent(agentId)
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
    const cli = this.ensureCli()
    if (!cli) return this.quotaCache
    try {
      const result = await cli.quota()
      if (result.exitCode === 0) {
        this.quotaCache = parseQuota(result.stdout)
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
}
