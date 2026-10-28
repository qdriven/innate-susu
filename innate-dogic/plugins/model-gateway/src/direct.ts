/**
 * DirectModelGateway — 直连模式。
 *
 * magpie 缺失/不可修复时，wireAgent 退化为直接写 agent 配置
 * （base_url + key 直通 provider）。
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import type {
  ModelGateway,
  GatewayStatus,
  Provider,
  AgentWiring,
  ModelRef,
  QuotaInfo,
} from '@dogic/sdk'

/** 直连模式下的 provider 配置 */
export interface DirectProviderConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  models: string[]
}

export class DirectModelGateway implements ModelGateway {
  private providers: Map<string, DirectProviderConfig> = new Map()
  private agents: Map<string, AgentWiring> = new Map()
  private statusListeners: Array<(s: GatewayStatus) => void> = []
  private _status: GatewayStatus = { state: 'running', url: 'direct' }

  constructor(providers: DirectProviderConfig[] = []) {
    for (const p of providers) {
      this.providers.set(p.id, p)
    }
  }

  status(): GatewayStatus {
    return this._status
  }

  async ensureRunning(): Promise<void> {
    // 直连模式无需启动进程
    this.setStatus({ state: 'running', url: 'direct' })
  }

  async listProviders(): Promise<Provider[]> {
    return [...this.providers.values()].map((p) => ({
      id: p.id,
      name: p.name,
      type: 'api-key' as const,
      models: p.models,
      enabled: true,
    }))
  }

  async listAgents(): Promise<AgentWiring[]> {
    return [...this.agents.values()]
  }

  async wireAgent(agentId: string, model: ModelRef): Promise<void> {
    const provider = this.providers.get(model.provider)
    if (!provider) {
      throw new Error(`Provider not found: ${model.provider}`)
    }

    // 直接写 agent 配置文件
    this.writeAgentConfig(agentId, provider, model.model)

    this.agents.set(agentId, {
      agentId,
      wired: true,
      model,
      mode: 'direct',
    })
  }

  async unwireAgent(agentId: string): Promise<void> {
    this.removeAgentConfig(agentId)
    this.agents.set(agentId, {
      agentId,
      wired: false,
      mode: 'direct',
    })
  }

  gatewayUrl(): string {
    // 直连模式下，各 provider 有自己的 URL
    return 'direct'
  }

  async quota(): Promise<QuotaInfo[]> {
    // 直连模式不提供配额信息
    return []
  }

  onStatusChange(listener: (s: GatewayStatus) => void): () => void {
    this.statusListeners.push(listener)
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener)
    }
  }

  /**
   * 添加一个直连 provider。
   */
  addProvider(config: DirectProviderConfig): void {
    this.providers.set(config.id, config)
  }

  private setStatus(status: GatewayStatus): void {
    this._status = status
    for (const l of this.statusListeners) {
      try { l(status) } catch { /* ignore */ }
    }
  }

  /**
   * 写 agent 配置文件（简化版）。
   * 实际实现需根据各 agent 的配置格式调整。
   */
  private writeAgentConfig(agentId: string, provider: DirectProviderConfig, model: string): void {
    const configDir = this.getAgentConfigDir(agentId)
    if (!configDir) return

    const config = {
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model,
    }

    try {
      fs.mkdirSync(configDir, { recursive: true })
      const configPath = path.join(configDir, 'innate-direct.json')
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
    } catch {
      // 忽略写入失败
    }
  }

  private removeAgentConfig(agentId: string): void {
    const configDir = this.getAgentConfigDir(agentId)
    if (!configDir) return
    const configPath = path.join(configDir, 'innate-direct.json')
    try {
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath)
      }
    } catch {
      // 忽略
    }
  }

  private getAgentConfigDir(agentId: string): string | null {
    const home = os.homedir()
    switch (agentId) {
      case 'claude':
        return path.join(home, '.claude')
      case 'codex':
        return path.join(home, '.codex')
      default:
        return path.join(home, '.config', agentId)
    }
  }
}
