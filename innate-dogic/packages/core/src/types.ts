/** magpie 网关状态 */
export interface GatewayInfo {
  running: boolean
  port?: number
  baseUrl?: string
  version?: string
  modelsCount?: number
  error?: string
}

/** 网关模型目录条目（/v1/models） */
export interface ModelInfo {
  id: string
  displayName?: string
  ownedBy?: string
  contextWindow?: number
  maxOutputTokens?: number
  reasoning?: boolean
  reasoningLevels?: string[]
  nativeEndpoints?: string[]
  inputModalities?: string[]
}

/** magpie web 管理界面状态 */
export interface WebUiInfo {
  running: boolean
  url?: string
}

/** dsh 侧集成状态 */
export interface DshState {
  installed: boolean
  dshHome: string
  /** 含 magpie llm-pi-ai 路由的 patch 文件 */
  wiredFiles: string[]
  hasGatewayKey: boolean
  defaultModel?: string
  profiles: string[]
}

/** magpie CLI 可用性（桌面版在跑但 CLI 可能不在 PATH） */
export interface MagpieCliInfo {
  available: boolean
  path?: string
}

/** 总览快照（渲染层状态页数据源） */
export interface StatusSnapshot {
  gateway: GatewayInfo
  webUi: WebUiInfo
  dsh: DshState
  magpieCli: MagpieCliInfo
  timestamp: string
}

/** 向导/验证单步结果 */
export interface CheckResult {
  id: string
  title: string
  passed: boolean
  detail: string
  hint?: string
}

/** 冒烟测试结果 */
export interface SmokeResult {
  ok: boolean
  model?: string
  detail: string
}

/** Harness 启动结果 */
export interface HarnessLaunchResult {
  ok: boolean
  url?: string
  port?: number
  detail: string
}

/** Harness 运行态 */
export type HarnessPhase = 'idle' | 'starting' | 'running' | 'failed' | 'stopped'

/** 内嵌控制台就绪结果（M1） */
export interface ConsoleReadyResult {
  ok: boolean
  url?: string
  detail: string
}

/** 内嵌视图矩形（CSS 像素 / DIP） */
export interface ViewBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface HarnessState {
  phase: HarnessPhase
  message: string
  url?: string
  port?: number
}
