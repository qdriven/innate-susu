/**
 * 主进程 BrowserProvider（W5.1 契约层）：导航安全策略 + 会话/历史状态机。
 *
 * W5.1 固定安全默认值并定义最小接口；实际页面加载由宿主注入的 loader
 * 承担（W5.2 用 WebContentsView 接线），本类只做策略裁决：
 * - 每次导航（navigate/back/forward/reload 的历史目标）一律经协议白名单
 *   与凭据检查（重定向/伪造历史不绕过协议约束）；
 * - 会话按 id 隔离：close 只回收本 Surface，不影响其他会话；
 * - activate/deactivate 只切换可见态，不销毁会话（标签切换保留）；
 * - 并发会话上限受控；dispose 统一回收（应用退出路径）。
 */
import {
  parseBrowserDescriptor,
  parseBrowserUrl,
} from '../shared/index.js'
import type {
  BrowserDescriptor,
  BrowserNavigateResult,
  BrowserOpenResult,
  BrowserProvider as IBrowserProvider,
  BrowserSessionState,
} from '../shared/index.js'

/** 宿主注入的实际页面加载器（W5.2 用 WebContentsView.loadURL 实现）。 */
export interface BrowserPageLoader {
  /** 加载 URL；返回 false 表示未受理（导航失败由调用方呈现）。 */
  load(sessionId: string, url: string): Promise<boolean>
  /** 关闭会话时宿主侧的资源回收（W5.2 销毁 view/监听器）。 */
  dispose?(sessionId: string): void
}

export interface BrowserProviderOptions {
  loader?: BrowserPageLoader
  /** 并发会话上限（资源受控）。 */
  maxSessions?: number
}

/** 默认并发会话上限。 */
export const DEFAULT_MAX_BROWSER_SESSIONS = 8

interface Session {
  id: string
  descriptor: BrowserDescriptor
  history: string[]
  index: number
  active: boolean
}

export class BrowserProvider implements IBrowserProvider {
  private readonly sessions = new Map<string, Session>()
  private readonly loader: BrowserPageLoader
  private readonly maxSessions: number

  constructor(options: BrowserProviderOptions = {}) {
    this.loader = options.loader ?? { load: async () => true }
    this.maxSessions = options.maxSessions ?? DEFAULT_MAX_BROWSER_SESSIONS
  }

  async open(input: unknown): Promise<BrowserOpenResult> {
    let descriptor: BrowserDescriptor
    try {
      descriptor = parseBrowserDescriptor(input)
    } catch (reason) {
      return { ok: false, detail: messageOf(reason) }
    }
    if (this.sessions.has(descriptor.id)) {
      return { ok: false, detail: `browser 会话已存在: ${descriptor.id}` }
    }
    if (this.sessions.size >= this.maxSessions) {
      return { ok: false, detail: `browser 会话超过上限 ${this.maxSessions}` }
    }
    this.sessions.set(descriptor.id, {
      id: descriptor.id,
      descriptor,
      history: [],
      index: -1,
      active: true,
    })
    return { ok: true }
  }

  async navigate(id: unknown, input: unknown): Promise<BrowserNavigateResult> {
    const session = this.requireSession(id)
    if (!session) return { ok: false, detail: sessionError(id) }
    let url: string
    try {
      url = parseBrowserUrl(extractUrl(input))
    } catch (reason) {
      return { ok: false, detail: messageOf(reason) }
    }
    return this.goto(session, url)
  }

  async back(id: unknown): Promise<BrowserNavigateResult> {
    return this.historyNav(id, -1)
  }

  async forward(id: unknown): Promise<BrowserNavigateResult> {
    return this.historyNav(id, 1)
  }

  async reload(id: unknown): Promise<BrowserNavigateResult> {
    const session = this.requireSession(id)
    if (!session) return { ok: false, detail: sessionError(id) }
    const current = session.index >= 0 ? session.history[session.index] : undefined
    if (current === undefined) return { ok: false, detail: '当前无页面可重载' }
    return this.goto(session, current)
  }

  async activate(id: unknown): Promise<BrowserOpenResult> {
    const session = this.requireSession(id)
    if (!session) return { ok: false, detail: sessionError(id) }
    session.active = true
    return { ok: true }
  }

  async deactivate(id: unknown): Promise<BrowserOpenResult> {
    const session = this.requireSession(id)
    if (!session) return { ok: false, detail: sessionError(id) }
    session.active = false
    return { ok: true }
  }

  async close(id: unknown): Promise<BrowserOpenResult> {
    const session = this.requireSession(id)
    if (!session) return { ok: false, detail: sessionError(id) }
    this.loader.dispose?.(session.id)
    this.sessions.delete(session.id)
    return { ok: true }
  }

  state(id: unknown): BrowserSessionState | undefined {
    const session = this.requireSession(id)
    if (!session) return undefined
    const currentUrl = session.index >= 0 ? (session.history[session.index] ?? null) : null
    return {
      id: session.id,
      title: session.descriptor.title,
      active: session.active,
      currentUrl,
      canBack: session.index > 0,
      canForward: session.index < session.history.length - 1,
    }
  }

  /** 统一回收：应用退出/窗口关闭路径。 */
  dispose(): void {
    for (const session of [...this.sessions.values()]) this.loader.dispose?.(session.id)
    this.sessions.clear()
  }

  private async historyNav(id: unknown, delta: number): Promise<BrowserNavigateResult> {
    const session = this.requireSession(id)
    if (!session) return { ok: false, detail: sessionError(id) }
    const next = session.index + delta
    const target = session.history[next]
    if (next < 0 || next >= session.history.length || target === undefined) {
      return { ok: false, detail: delta < 0 ? '没有可后退的历史' : '没有可前进的历史' }
    }
    // 历史目标同样过白名单（伪造/污染的历史不绕过协议约束）
    return this.goto(session, target, next)
  }

  private async goto(session: Session, url: string, index?: number): Promise<BrowserNavigateResult> {
    let safe: string
    try {
      safe = parseBrowserUrl(url)
    } catch (reason) {
      return { ok: false, detail: messageOf(reason) }
    }
    const loaded = await this.loader.load(session.id, safe)
    if (!loaded) return { ok: false, url: safe, detail: '页面加载未受理' }
    if (index === undefined) {
      // 新导航截断 forward 分支
      session.history = session.history.slice(0, session.index + 1)
      session.history.push(safe)
      session.index = session.history.length - 1
    } else {
      session.index = index
    }
    return { ok: true, url: safe }
  }

  private requireSession(id: unknown): Session | undefined {
    return typeof id === 'string' ? this.sessions.get(id) : undefined
  }
}

function extractUrl(input: unknown): unknown {
  if (!input || typeof input !== 'object') throw new Error('导航请求必须是对象')
  const value = input as Partial<{ url: unknown }>
  if (typeof value.url !== 'string') throw new Error('导航请求 url 必须是字符串')
  return value.url
}

function sessionError(id: unknown): string {
  return `browser 会话不存在: ${String(id)}`
}

function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}
