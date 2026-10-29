/**
 * Terminal 会话存储（W4.4）：xterm 实例跨挂载保留。
 *
 * 生命周期语义（与主进程 TerminalService 对齐）：
 * - 标签切换（SurfaceSlot 卸载视图）只 detach：进程与 scrollback 保留，重新挂载直接复用；
 * - close 才 dispose：terminalClose 终止 PTY 并销毁 xterm；
 * - exit 只更新终态标记：面板显示退出提示与重开动作，不自动重启。
 *
 * 事件桥（output/exit/error）在存储层订阅一次，事件直接写入 xterm 缓冲——
 * 即使面板未挂载（标签隐藏），输出也进入 scrollback。
 */
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import type { TerminalApi, TerminalEvent } from '../shared/index.js'
import { TERMINAL_PROVIDER_ID } from '../shared/index.js'
import '@xterm/xterm/css/xterm.css'

export const DEFAULT_COLS = 80
export const DEFAULT_ROWS = 24

/** 滚动缓冲上限（行）：超出后 xterm 丢弃最旧行（策略上限，非隐藏截断）。 */
export const SCROLLBACK_LINES = 5_000

export interface TerminalPanelTheme {
  background: string
  foreground: string
  cursor: string
  selectionBackground: string
}

const THEMES = {
  dark: {
    background: '#1c1c1c',
    foreground: '#d8d8d8',
    cursor: '#ffffff',
    selectionBackground: 'rgba(255, 255, 255, 0.22)',
  },
  light: {
    background: '#ffffff',
    foreground: '#262626',
    cursor: '#000000',
    selectionBackground: 'rgba(0, 0, 0, 0.18)',
  },
} as const

/** 主题跟随 ThemeProvider 的 .dark（documentElement）。 */
export function currentTerminalTheme(): TerminalPanelTheme {
  const dark = typeof document !== 'undefined' &&
    typeof document.documentElement !== 'undefined' &&
    document.documentElement.classList.contains('dark')
  return dark ? THEMES.dark : THEMES.light
}

export interface TerminalPanelSession {
  surfaceId: string
  terminalId: string
  xterm: Terminal
  fit: FitAddon
  exitCode: number | null
  disposed: boolean
}

export class TerminalSessionStore {
  private readonly sessions = new Map<string, TerminalPanelSession>()
  private readonly creating = new Map<string, Promise<TerminalPanelSession>>()
  private readonly exitListeners = new Map<string, Set<(exitCode: number) => void>>()
  /** 每次 dispose 递增；in-flight create 完成后比对，发现不一致立即回收新建 PTY。 */
  private readonly disposeTokens = new Map<string, number>()
  private readonly api: TerminalApi
  private unsubscribe: (() => void) | null = null
  private sessionCounter = 0

  constructor(api: TerminalApi) {
    this.api = api
  }

  /** 订阅事件桥（每个 store 一次；重复调用幂等）。 */
  private ensureBridge(): void {
    if (this.unsubscribe) return
    this.unsubscribe = this.api.terminalOnEvent((event) => this.dispatch(event))
  }

  private dispatch(event: TerminalEvent): void {
    const session = this.sessionByTerminalId(event.terminalId)
    if (!session || session.disposed) return
    if ('data' in event) {
      session.xterm.write(event.data)
    } else if ('exitCode' in event) {
      session.exitCode = event.exitCode
        for (const listener of this.exitListeners.get(session.surfaceId) ?? []) {
          listener(event.exitCode)
        }
    } else if ('message' in event) {
      session.xterm.write(`\r\n[terminal] ${event.message}\r\n`)
    }
  }

  private sessionByTerminalId(terminalId: string): TerminalPanelSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.terminalId === terminalId) return session
    }
    return undefined
  }

  get(surfaceId: string): TerminalPanelSession | undefined {
    const session = this.sessions.get(surfaceId)
    return session && !session.disposed ? session : undefined
  }

  isExited(surfaceId: string): boolean {
    const session = this.sessions.get(surfaceId)
    return session !== undefined && session.exitCode !== null
  }

  /** 注册 exit 通知（面板挂载期间监听，卸载后自动摘除）。 */
  onExit(surfaceId: string, listener: (exitCode: number) => void): () => void {
    let listeners = this.exitListeners.get(surfaceId)
    if (!listeners) {
      listeners = new Set()
      this.exitListeners.set(surfaceId, listeners)
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  /**
   * 创建或复用会话。同一 surfaceId 并发调用共享同一 Promise（StrictMode
   * 双挂载与重开竞态都走这里）；已有未 dispose 会话直接复用。
   */
  async create(surfaceId: string, options: { title: string; workspaceId?: string }): Promise<TerminalPanelSession> {
    this.ensureBridge()
    const existing = this.sessions.get(surfaceId)
    if (existing && !existing.disposed) return existing
    const inFlight = this.creating.get(surfaceId)
    if (inFlight) return inFlight
    const promise = this.createNew(surfaceId, options)
    this.creating.set(surfaceId, promise)
    try {
      return await promise
    } finally {
      this.creating.delete(surfaceId)
    }
  }

  private async createNew(surfaceId: string, options: { title: string; workspaceId?: string }): Promise<TerminalPanelSession> {
    const token = this.disposeTokens.get(surfaceId) ?? 0
    this.sessionCounter += 1
    const terminalId = `${surfaceId}-s${this.sessionCounter}`
    const result = await this.api.terminalCreate({
      id: terminalId,
      providerId: TERMINAL_PROVIDER_ID,
      kind: 'terminal',
      title: options.title,
      ...(options.workspaceId ? { workspaceId: options.workspaceId } : {}),
      cols: DEFAULT_COLS,
      rows: DEFAULT_ROWS,
      profile: { id: 'default' },
    })
    if (!result.ok) throw new Error(result.detail ?? '终端创建失败')
    // 创建期间标签被关闭/重开（token 变化）：立即回收新建 PTY，不留孤儿会话。
    if (token !== (this.disposeTokens.get(surfaceId) ?? 0)) {
      await this.api.terminalClose(terminalId).catch(() => undefined)
      throw new Error('终端标签已关闭')
    }
    const xterm = new Terminal({
      cursorBlink: true,
      fontFamily: 'Cascadia Mono, Consolas, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      scrollback: SCROLLBACK_LINES,
      allowProposedApi: true,
      theme: currentTerminalTheme(),
    })
    const fit = new FitAddon()
    xterm.loadAddon(fit)
    const session: TerminalPanelSession = {
      surfaceId,
      terminalId,
      xterm,
      fit,
      exitCode: null,
      disposed: false,
    }
    this.sessions.set(surfaceId, session)
    return session
  }

  /** 挂载：把 xterm DOM 挂到容器（复用已有实例，保留 scrollback）。 */
  attach(surfaceId: string, element: HTMLElement): TerminalPanelSession | undefined {
    const session = this.get(surfaceId)
    if (!session) return undefined
    if (!session.xterm.element) {
      session.xterm.open(element)
    } else {
      element.appendChild(session.xterm.element)
    }
    this.fit(session)
    return session
  }

  /** 卸载：只摘除 DOM，进程与 scrollback 保留。 */
  detach(surfaceId: string): void {
    const session = this.sessions.get(surfaceId)
    if (!session || session.disposed) return
    session.xterm.element?.remove()
  }

  /** 关闭：终止 PTY、销毁 xterm、移除存储条目（close 语义，非 detach）。 */
  async dispose(surfaceId: string): Promise<void> {
    // token 递增：in-flight create 完成后比对发现不一致会立即回收新建 PTY。
    this.disposeTokens.set(surfaceId, (this.disposeTokens.get(surfaceId) ?? 0) + 1)
    const session = this.sessions.get(surfaceId)
    if (!session) return
    session.disposed = true
    this.creating.delete(surfaceId)
    try {
      await this.api.terminalClose(session.terminalId)
    } catch {
      /* 关闭失败不阻塞标签移除 */
    }
    session.xterm.dispose()
    this.sessions.delete(surfaceId)
    // exitListeners 不在这里摘除：面板可能在 dispose 后仍挂载（重开路径），
    // 新会话的 exit 事件仍需通知它；监听器由面板卸载 effect 自行摘除。
  }

  /** 全部回收（应用退出/provider dispose 路径）。 */
  async disposeAll(): Promise<void> {
    await Promise.all([...this.sessions.keys()].map((surfaceId) => this.dispose(surfaceId)))
  }

  /** 主题切换后重新着色（.dark 变化由面板的 MutationObserver 驱动）。 */
  applyTheme(surfaceId: string): void {
    const session = this.get(surfaceId)
    if (!session) return
    session.xterm.options.theme = currentTerminalTheme()
  }

  private fit(session: TerminalPanelSession): void {
    try {
      session.fit.fit()
    } catch {
      /* 容器尚无尺寸（隐藏标签/初始挂载）时跳过，ResizeObserver 会补上 */
    }
  }
}
