/**
 * ModelGateway — 插件 SDK 的核心接口。
 *
 * 所有 agent 插件只依赖此接口，不直接依赖 magpie。
 * magpie 是它的第一个实现，未来可替换/可双活。
 */

/** 网关运行状态 */
export type GatewayStatus =
  | { state: 'not-installed'; message?: string }
  | { state: 'not-running' }
  | { state: 'starting'; progress?: number }
  | { state: 'running'; url: string }
  | { state: 'error'; message: string; recoverable: boolean }

/** 模型 provider（API key / 订阅 / 本地模型） */
export interface Provider {
  id: string
  name: string
  type: 'api-key' | 'subscription' | 'local'
  models: string[]
  enabled: boolean
}

/** Agent 接线状态 */
export interface AgentWiring {
  agentId: string
  wired: boolean
  model?: ModelRef
  /** 接线来源：gateway（magpie）或 direct（直连） */
  mode: 'gateway' | 'direct'
}

/** 模型引用 */
export interface ModelRef {
  provider: string
  model: string
}

/** 配额/用量信息 */
export interface QuotaInfo {
  provider: string
  agent?: string
  used: number
  limit?: number
  unit: string
  /** 数据是否陈旧（网关不可达时返回缓存） */
  stale?: boolean
  /** 最近更新时间戳 */
  updatedAt?: number
}

/**
 * 模型网关接口。
 *
 * 实现方负责：探测、进程托管、CLI 封装、接线、配额。
 * 调用方（agent 插件）只关心：确保运行、接线、用量。
 */
export interface ModelGateway {
  /** 当前网关状态 */
  status(): GatewayStatus

  /** 确保网关运行（已运行则跳过，未运行则拉起 + healthcheck） */
  ensureRunning(): Promise<void>

  /** 列出已配置的 provider */
  listProviders(): Promise<Provider[]>

  /** 列出各 Agent 当前接线状态 */
  listAgents(): Promise<AgentWiring[]>

  /** 为指定 Agent 接线到模型 */
  wireAgent(agentId: string, model: ModelRef): Promise<void>

  /** 还原指定 Agent 的接线 */
  unwireAgent(agentId: string): Promise<void>

  /** 网关 URL（自研 agent 直连用） */
  gatewayUrl(): string

  /** 读取配额/用量 */
  quota(): Promise<QuotaInfo[]>
}

/** 网关状态变更事件 */
export interface GatewayStatusEvent {
  previous: GatewayStatus
  current: GatewayStatus
}
