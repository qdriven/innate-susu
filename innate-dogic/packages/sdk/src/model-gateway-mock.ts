/**
 * MockModelGateway — ModelGateway 的 mock 实现。
 *
 * 可注入任意状态序列，供所有下游插件单测使用。
 * 用 mock 替换 magpie 适配器，全部插件单测通过（DoD#6）。
 */
import type {
  ModelGateway,
  GatewayStatus,
  Provider,
  AgentWiring,
  ModelRef,
  QuotaInfo,
} from './model-gateway.js'

export interface MockState {
  status: GatewayStatus
  providers: Provider[]
  agents: AgentWiring[]
  quota: QuotaInfo[]
  /** wireAgent 调用记录 */
  wireCalls: Array<{ agentId: string; model: ModelRef }>
  /** unwireAgent 调用记录 */
  unwireCalls: string[]
}

export class MockModelGateway implements ModelGateway {
  private state: MockState
  private statusListeners: Array<(s: GatewayStatus) => void> = []

  constructor(initial?: Partial<MockState>) {
    this.state = {
      status: { state: 'not-installed' },
      providers: [],
      agents: [],
      quota: [],
      wireCalls: [],
      unwireCalls: [],
      ...initial,
    }
  }

  status(): GatewayStatus {
    return this.state.status
  }

  async ensureRunning(): Promise<void> {
    if (this.state.status.state === 'running') return
    // 模拟启动过程
    this.setState({ status: { state: 'starting' } })
    await new Promise((r) => setTimeout(r, 10))
    this.setState({
      status: { state: 'running', url: 'http://127.0.0.1:3425' },
    })
  }

  async listProviders(): Promise<Provider[]> {
    return [...this.state.providers]
  }

  async listAgents(): Promise<AgentWiring[]> {
    return [...this.state.agents]
  }

  async wireAgent(agentId: string, model: ModelRef): Promise<void> {
    this.state.wireCalls.push({ agentId, model })
    const existing = this.state.agents.find((a) => a.agentId === agentId)
    if (existing) {
      existing.wired = true
      existing.model = model
      existing.mode = 'gateway'
    } else {
      this.state.agents.push({
        agentId,
        wired: true,
        model,
        mode: 'gateway',
      })
    }
  }

  async unwireAgent(agentId: string): Promise<void> {
    this.state.unwireCalls.push(agentId)
    const existing = this.state.agents.find((a) => a.agentId === agentId)
    if (existing) {
      existing.wired = false
      existing.model = undefined
    }
  }

  gatewayUrl(): string {
    if (this.state.status.state === 'running') {
      return this.state.status.url
    }
    return ''
  }

  async quota(): Promise<QuotaInfo[]> {
    return [...this.state.quota]
  }

  // —— 测试辅助方法 ——

  setState(partial: Partial<MockState>): void {
    const prevStatus = this.state.status
    this.state = { ...this.state, ...partial }
    if (partial.status && partial.status.state !== prevStatus.state) {
      for (const l of this.statusListeners) l(partial.status)
    }
  }

  getWireCalls(): Array<{ agentId: string; model: ModelRef }> {
    return [...this.state.wireCalls]
  }

  getUnwireCalls(): string[] {
    return [...this.state.unwireCalls]
  }

  onStatusChange(listener: (s: GatewayStatus) => void): () => void {
    this.statusListeners.push(listener)
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener)
    }
  }
}

// 常用 fixtures
export const fixtures = {
  providers: [
    {
      id: 'deepseek',
      name: 'DeepSeek',
      type: 'api-key' as const,
      models: ['deepseek-chat', 'deepseek-coder'],
      enabled: true,
    },
    {
      id: 'claude-subs',
      name: 'Claude Pro (Subscription)',
      type: 'subscription' as const,
      models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'],
      enabled: true,
    },
  ],
  quota: [
    {
      provider: 'deepseek',
      used: 120000,
      limit: 1000000,
      unit: 'tokens',
      stale: false,
    },
  ],
}
