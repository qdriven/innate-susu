/**
 * browser 布局快照策略（W5.6）：安全浏览布局持久化。
 *
 * - 快照只保存普通 http/https URL、标签 id 与 activeId；
 * - 敏感 URL（内嵌凭据、token/key 等敏感 query 参数）默认拒绝持久化，
 *   并明确提示不能恢复认证状态——浏览器不得变成凭据快照；
 * - 不保存 cookie、session、页面 DOM、表单、下载内容或 WebContents 对象
 *   （快照只有 URL 字符串与 id，天然不含这些运行时对象）；
 * - 重载恢复需用户可见地重新导航；版本不兼容安全回退（丢弃旧快照）。
 *
 * 纯逻辑（不依赖 electron），renderer 与 main 均可消费；持久化后端由
 * 调用方注入（产品用 localStorage，测试用内存实现）。
 */

/** 布局快照版本；与不兼容旧版本区分，用于安全回退。 */
export const BROWSER_LAYOUT_VERSION = 1

/** 持久化后端（renderer 用 localStorage，测试注入内存实现）。 */
export interface BrowserLayoutStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** 单个标签的可恢复信息：只有 id 与普通 URL。 */
export interface BrowserLayoutEntry {
  id: string
  url: string
}

export interface BrowserLayoutSnapshot {
  version: number
  activeId?: string
  tabs: BrowserLayoutEntry[]
}

/** 敏感 query 参数名（不区分大小写）：含 token/key 等凭据的 URL 不持久化。 */
const SENSITIVE_QUERY_KEYS = new Set([
  'token', 'access_token', 'apikey', 'api_key', 'secret', 'password',
  'passwd', 'auth', 'authorization', 'session', 'cookie', 'credential',
])

/**
 * 判定 URL 是否敏感（内嵌凭据、敏感 query 参数、含敏感片段）。
 * 敏感 URL 一律拒绝持久化——恢复需重新认证，绝不静默复用凭据。
 */
export function isSensitiveBrowserUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return true
  }
  // 内嵌凭据（//user:pass@host）与非 http/https 协议一律敏感
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true
  if (url.username !== '' || url.password !== '') return true
  for (const [key] of url.searchParams) {
    if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) return true
  }
  return false
}

/** 过滤敏感 URL：仅保留可安全持久化的普通 http/https URL。 */
export function filterSafeBrowserUrls(entries: BrowserLayoutEntry[]): BrowserLayoutEntry[] {
  return entries.filter((entry) => entry.id.length > 0 && !isSensitiveBrowserUrl(entry.url))
}

/** 构建布局快照：只含安全 URL 与 activeId（activeId 指向保留标签）。 */
export function buildBrowserLayoutSnapshot(
  entries: BrowserLayoutEntry[],
  activeId?: string,
): BrowserLayoutSnapshot {
  const tabs = filterSafeBrowserUrls(entries)
  const validIds = new Set(tabs.map((tab) => tab.id))
  return {
    version: BROWSER_LAYOUT_VERSION,
    ...(activeId && validIds.has(activeId) ? { activeId } : {}),
    tabs,
  }
}

/**
 * 解析不可信布局快照：版本不兼容或结构非法 → 抛错（调用方据此安全回退）。
 * 字段一律经白名单解析，不复制未知字段。
 */
export function parseBrowserLayoutSnapshot(input: unknown): BrowserLayoutSnapshot {
  if (!input || typeof input !== 'object') throw new Error('browser 布局快照无效')
  const value = input as Partial<BrowserLayoutSnapshot>
  if (value.version !== BROWSER_LAYOUT_VERSION) throw new Error('browser 布局快照版本不兼容')
  if (!Array.isArray(value.tabs)) throw new Error('browser 布局快照 tabs 必须是数组')
  const seen = new Set<string>()
  const tabs: BrowserLayoutEntry[] = []
  for (const raw of value.tabs) {
    if (!raw || typeof raw !== 'object') throw new Error('browser 布局条目无效')
    const entry = raw as Partial<BrowserLayoutEntry>
    if (typeof entry.id !== 'string' || entry.id.length === 0) throw new Error('browser 布局条目 id 无效')
    if (typeof entry.url !== 'string') throw new Error('browser 布局条目 url 必须是字符串')
    if (seen.has(entry.id)) throw new Error('browser 布局快照包含重复 id')
    seen.add(entry.id)
    // 解析时再次过滤敏感 URL（快照来源不可信；构建时已过滤，此处兜底）。
    if (isSensitiveBrowserUrl(entry.url)) continue
    tabs.push({ id: entry.id, url: entry.url })
  }
  if (value.activeId !== undefined && typeof value.activeId !== 'string') {
    throw new Error('browser 布局快照 activeId 无效')
  }
  const activeId = value.activeId && seen.has(value.activeId) ? value.activeId : undefined
  return { version: BROWSER_LAYOUT_VERSION, ...(activeId ? { activeId } : {}), tabs }
}

/** 浏览器布局持久化默认键（产品用 localStorage）。 */
export const DEFAULT_BROWSER_LAYOUT_KEY = 'innate.browser-layout:center'

/**
 * 浏览器布局持久化（W5.6）。保存/恢复普通浏览布局，敏感 URL 一律拒绝。
 * 与核心 SurfaceSnapshot 分离：核心快照不含 URL，本层只服务 browser 布局。
 */
export class BrowserLayoutStore {
  private readonly storage: BrowserLayoutStorage | null
  private readonly key: string
  private tabs = new Map<string, string>()
  private activeId?: string

  constructor(options?: { storage?: BrowserLayoutStorage | null; key?: string } | BrowserLayoutStorage | null) {
    let storage: BrowserLayoutStorage | null
    let key: string
    const isOptionsObject = (value: unknown): value is { storage?: BrowserLayoutStorage | null; key?: string } =>
      typeof value === 'object' && value !== null && ('storage' in value || 'key' in value)
    if (options !== null && options !== undefined && isOptionsObject(options)) {
      const opt = options
      storage = opt.storage === undefined ? null : opt.storage
      key = opt.key ?? DEFAULT_BROWSER_LAYOUT_KEY
    } else {
      storage = options ?? null
      key = DEFAULT_BROWSER_LAYOUT_KEY
    }
    this.storage = storage
    this.key = key
    this.load()
  }

  /** 保存（或更新）标签的可恢复 URL；敏感 URL 拒绝持久化并删除已有记录。 */
  saveUrl(id: string, url: string): void {
    if (!isSensitiveBrowserUrl(url)) {
      this.tabs.set(id, url)
      this.persist()
    } else {
      this.tabs.delete(id)
      this.persist()
    }
  }

  /** 消费（取出并移除）标签的恢复 URL——恢复后不再重复重导航。 */
  consume(id: string): string | undefined {
    const url = this.tabs.get(id)
    if (url === undefined) return undefined
    this.tabs.delete(id)
    this.persist()
    return url
  }

  /** 删除标签的布局记录（标签关闭时调用）。 */
  clear(id: string): void {
    if (!this.tabs.delete(id)) return
    if (this.activeId === id) this.activeId = undefined
    this.persist()
  }

  setActive(id: string | undefined): void {
    this.activeId = id && this.tabs.has(id) ? id : undefined
    this.persist()
  }

  /** 当前布局快照（内存态，已过滤敏感 URL）。 */
  snapshot(): BrowserLayoutSnapshot {
    return buildBrowserLayoutSnapshot(
      [...this.tabs.entries()].map(([id, url]) => ({ id, url })),
      this.activeId,
    )
  }

  /** 恢复布局快照（版本不兼容/结构非法 → 抛错，调用方安全回退）。 */
  restore(input: unknown): void {
    const snapshot = parseBrowserLayoutSnapshot(input)
    this.tabs = new Map(snapshot.tabs.map((tab) => [tab.id, tab.url]))
    this.activeId = snapshot.activeId
  }

  private load(): void {
    const saved = this.storage?.getItem(this.key)
    if (!saved) return
    try {
      this.restore(JSON.parse(saved) as unknown)
    } catch {
      // 版本不兼容或结构非法：丢弃旧快照，安全回退（不抛到渲染链路）。
      this.storage?.removeItem(this.key)
    }
  }

  private persist(): void {
    if (!this.storage) return
    try {
      this.storage.setItem(this.key, JSON.stringify(this.snapshot()))
    } catch {
      /* 存储不可用时布局仍可恢复，只是不持久化 */
    }
  }
}
