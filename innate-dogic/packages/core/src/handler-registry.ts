/**
 * 统一「打开方式注册表」（handler registry，04 §4bis）。
 *
 * 四个键空间共用同一机制：
 * - content：文件类型/URI → 打开方式（open-with，Q 系列首案例）
 * - capability：capability → 执行器（W4.2 首案例：process:execute → terminal）
 * - purpose：purpose → 轻应用（P4 预留）
 * - surface：呈现端 provider（W1c 的 Surface provider registry 是另一层）
 *
 * 共享机制：注册、同键多 handler 并列/默认选择、审批挂钩、热插（随插件装卸）。
 * 本模块只实现机制，不预置任何具体 handler——注册表按通用机制设计，非 terminal 专属。
 */

export type HandlerKey = 'content' | 'capability' | 'purpose' | 'surface'

export interface HandlerDescriptor {
  key: HandlerKey
  /** 键空间内的分组（如 capability:'process' / content:'markdown'）。 */
  namespace: string
  id: string
  title: string
  /** 该 handler 需要的 Surface capability；审批挂钩据此触发。 */
  capabilities?: string[]
}

export interface HandlerRequest {
  [key: string]: unknown
}

export interface HandlerResult {
  ok: boolean
  detail?: string
}

/** 审批挂钩：高影响执行必须经显式审批；默认拒绝（无 approve 即拒）。 */
export type ApprovalHook = (request: HandlerRequest) => Promise<boolean>

export interface Handler {
  descriptor: HandlerDescriptor
  /** 缺省 approve 为拒绝——未声明审批的 handler 一律不自动放行。 */
  approve?: ApprovalHook
  execute(request: HandlerRequest): Promise<HandlerResult>
  /** 热插摘除时的资源清理。 */
  dispose?(): void
}

function validateDescriptor(descriptor: HandlerDescriptor): HandlerDescriptor {
  if (!descriptor || typeof descriptor !== 'object') throw new Error('handler descriptor 必须是对象')
  const kinds: HandlerKey[] = ['content', 'capability', 'purpose', 'surface']
  if (!kinds.includes(descriptor.key)) throw new Error('handler key 不受支持')
  if (typeof descriptor.namespace !== 'string' || descriptor.namespace.length === 0) {
    throw new Error('handler namespace 必须是非空字符串')
  }
  if (typeof descriptor.id !== 'string' || descriptor.id.length === 0) {
    throw new Error('handler id 必须是非空字符串')
  }
  if (typeof descriptor.title !== 'string' || descriptor.title.length === 0) {
    throw new Error('handler title 必须是非空字符串')
  }
  if (descriptor.capabilities !== undefined) {
    if (!Array.isArray(descriptor.capabilities) || descriptor.capabilities.some((item) => typeof item !== 'string')) {
      throw new Error('handler capability 必须是字符串数组')
    }
  }
  return {
    key: descriptor.key,
    namespace: descriptor.namespace,
    id: descriptor.id,
    title: descriptor.title,
    ...(descriptor.capabilities ? { capabilities: [...descriptor.capabilities] } : {}),
  }
}

/**
 * 通用 handler 注册表。
 *
 * - 注册：descriptor.id 全局唯一（重复注册显式失败）；
 * - 并列：同一 (key, namespace) 允许多个 handler，默认选择第一个注册者，可显式切换；
 * - 审批：execute 前必须经 approve；无 approve 或 approve 拒绝 → 拒绝执行；
 * - 热插：unregister 摘除并调用 dispose，不影响其它 handler。
 */
export class HandlerRegistry {
  private readonly handlers = new Map<string, Handler>()
  private readonly defaults = new Map<string, string>()
  private readonly listeners = new Set<() => void>()
  private revision = 0

  register(handler: Handler): void {
    const descriptor = validateDescriptor(handler.descriptor)
    if (this.handlers.has(descriptor.id)) throw new Error(`handler 重复注册: ${descriptor.id}`)
    this.handlers.set(descriptor.id, handler)
    const slot = `${descriptor.key}:${descriptor.namespace}`
    if (!this.defaults.has(slot)) this.defaults.set(slot, descriptor.id)
    this.notify()
  }

  unregister(id: string): boolean {
    const handler = this.handlers.get(id)
    if (!handler) return false
    this.handlers.delete(id)
    for (const [slot, defaultId] of this.defaults) {
      if (defaultId === id) {
        const next = [...this.handlers.values()].find((item) => item.descriptor.id !== id &&
          `${item.descriptor.key}:${item.descriptor.namespace}` === slot)
        this.defaults.set(slot, next?.descriptor.id ?? '')
      }
    }
    try {
      handler.dispose?.()
    } catch {
      /* 摘除清理失败不得影响其它 handler */
    }
    this.notify()
    return true
  }

  /** 键空间内全部 handler；同键并列时按注册顺序返回。 */
  list(key: HandlerKey, namespace?: string): Handler[] {
    const matched = [...this.handlers.values()].filter(
      (handler) => handler.descriptor.key === key && (namespace === undefined || handler.descriptor.namespace === namespace),
    )
    return matched
  }

  get(id: string): Handler | undefined {
    return this.handlers.get(id)
  }

  /** 默认 handler：同键并列时返回第一个注册者。 */
  resolve(key: HandlerKey, namespace: string): Handler | undefined {
    const id = this.defaults.get(`${key}:${namespace}`)
    return id ? this.handlers.get(id) : undefined
  }

  /**
   * 审批挂钩执行：无 approve 或 approve 拒绝 → 拒绝；
   * 通过后调用 execute。终态后忽略后续事件由调用方保证。
   */
  async run(handler: Handler, request: HandlerRequest): Promise<HandlerResult> {
    if (handler.approve) {
      let approved = false
      try {
        approved = await handler.approve(request)
      } catch (reason) {
        return { ok: false, detail: `审批失败: ${reason instanceof Error ? reason.message : String(reason)}` }
      }
      if (!approved) return { ok: false, detail: 'handler 审批未通过' }
    }
    return handler.execute(request)
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  readonly getRevision = (): number => this.revision

  dispose(): void {
    for (const handler of this.handlers.values()) {
      try {
        handler.dispose?.()
      } catch {
        /* ignore */
      }
    }
    this.handlers.clear()
    this.defaults.clear()
    this.notify()
  }

  private notify(): void {
    this.revision += 1
    for (const listener of [...this.listeners]) listener()
  }
}
