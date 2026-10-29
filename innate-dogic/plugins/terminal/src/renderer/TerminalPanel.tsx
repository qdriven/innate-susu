import { useCallback, useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { TerminalApi } from '../shared/index.js'
import { MIN_COLS, MIN_ROWS } from '../shared/index.js'
import { TerminalSessionStore } from './session-store.js'
import type { TerminalPanelSession } from './session-store.js'

export interface TerminalPanelProps {
  store: TerminalSessionStore
  api: TerminalApi
  /** Surface 标签 id（会话生命周期键；终端 id 由存储派生）。 */
  surfaceId: string
  title: string
  workspaceId?: string
  onRequestClose(): void
}

type Phase = 'starting' | 'ready' | 'exited' | 'failed'

/**
 * 交互终端面板（W4.4）：xterm + fit。
 *
 * - 挂载即创建/复用会话；卸载只 detach（scrollback 保留），close 才终止；
 * - 键盘输入经 terminalInput、resize 经 ResizeObserver + fit；
 * - exit 显示退出提示与重开动作，不自动重启；
 * - 复制/清屏为本地动作（清屏同时向 PTY 发 Ctrl-L 等价的换页符）。
 */
export function TerminalPanel({
  store, api, surfaceId, title, workspaceId, onRequestClose,
}: TerminalPanelProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('starting')
  const [exitCode, setExitCode] = useState<number | null>(null)
  const [errorText, setErrorText] = useState('')
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const reopeningRef = useRef(false)

  const start = useCallback(async (): Promise<void> => {
    const session = await store.create(surfaceId, { title, workspaceId })
    const element = containerRef.current
    if (element) store.attach(surfaceId, element)
    setExitCode(session.exitCode)
    setPhase(session.exitCode !== null ? 'exited' : 'ready')
  }, [store, surfaceId, title, workspaceId])

  const boot = useCallback(async (): Promise<void> => {
    // 重开进行中时挂载路径不再重复建会话（create 本身也会去重）。
    if (reopeningRef.current) return
    await start()
  }, [start])

  useEffect(() => {
    let cancelled = false
    const run = async (): Promise<void> => {
      try {
        if (cancelled) return
        await boot()
      } catch (reason) {
        if (cancelled) return
        setErrorText(reason instanceof Error ? reason.message : String(reason))
        setPhase('failed')
      }
    }
    void run()
    return () => {
      cancelled = true
      store.detach(surfaceId)
    }
  }, [boot, store, surfaceId])

  // exit 事件（可能发生在面板未挂载期间）：更新终态并通知 UI。
  useEffect(() => store.onExit(surfaceId, (code) => {
    setExitCode(code)
    setPhase('exited')
  }), [store, surfaceId])

  // 键盘输入：xterm onData → terminalInput。
  useEffect(() => {
    if (phase !== 'ready') return
    const session = store.get(surfaceId)
    if (!session) return
    const disposable = session.xterm.onData((data) => {
      void api.terminalInput(session.terminalId, data)
    })
    return () => { disposable.dispose() }
  }, [phase, surfaceId, store, api])

  // 尺寸同步：容器变化 → fit → terminalResize（rAF 合并）。
  useEffect(() => {
    if (phase !== 'ready') return
    const element = containerRef.current
    if (!element) return
    let raf = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const session = store.get(surfaceId)
        if (!session) return
        try {
          session.fit.fit()
        } catch {
          return
        }
        const dimensions = session.fit.proposeDimensions()
        if (dimensions && dimensions.cols >= MIN_COLS && dimensions.rows >= MIN_ROWS) {
          void api.terminalResize(session.terminalId, dimensions)
        }
      })
    })
    observer.observe(element)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [phase, surfaceId, store, api])

  // 主题跟随 ThemeProvider 的 .dark。
  useEffect(() => {
    const element = document.documentElement
    const observer = new MutationObserver(() => store.applyTheme(surfaceId))
    observer.observe(element, { attributes: true, attributeFilter: ['class'] })
    store.applyTheme(surfaceId)
    return () => observer.disconnect()
  }, [store, surfaceId])

  const copy = useCallback(async (): Promise<void> => {
    const session = store.get(surfaceId)
    const text = session?.xterm.getSelection() ?? ''
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* 剪贴板不可用时静默（选择仍在终端内可见） */
    }
  }, [store, surfaceId])

  const clear = useCallback((): void => {
    const session = store.get(surfaceId)
    if (!session) return
    session.xterm.clear()
    if (phaseRef.current === 'ready') {
      // 换页符：多数 shell 解释为清屏，PTY 侧滚动缓冲同步清空。
      void api.terminalInput(session.terminalId, '\x0c')
    }
  }, [store, surfaceId, api])

  const reopen = useCallback(async (): Promise<void> => {
    if (reopeningRef.current) return
    reopeningRef.current = true
    setPhase('starting')
    try {
      await store.dispose(surfaceId)
      await start()
    } catch (reason) {
      setErrorText(reason instanceof Error ? reason.message : String(reason))
      setPhase('failed')
    } finally {
      reopeningRef.current = false
    }
  }, [store, surfaceId, start])

  return (
    <div className="terminal-panel">
      <div className="terminal-toolbar">
        <span className="terminal-title" title={title}>{title}</span>
        <div className="terminal-actions">
          <button type="button" onClick={() => void copy()}>复制</button>
          <button type="button" onClick={clear}>清屏</button>
          {phase === 'exited' && (
            <button type="button" className="primary" onClick={() => void reopen()}>重开</button>
          )}
          <button type="button" onClick={onRequestClose}>关闭</button>
        </div>
      </div>
      <div ref={containerRef} className="terminal-area" />
      {phase === 'exited' && (
        <div className="terminal-exited" role="status">
          会话已退出（code {exitCode ?? 0}）
        </div>
      )}
      {phase === 'failed' && (
        <div className="terminal-failed" role="alert">
          <p>终端创建失败</p>
          <p className="terminal-error-detail">{errorText}</p>
          <button type="button" onClick={onRequestClose}>关闭标签</button>
        </div>
      )}
    </div>
  )
}

/** 供 plugin 风格宿主使用的便捷工厂（内部持有独立 store）。 */
export function createTerminalPanel(api: TerminalApi) {
  const store = new TerminalSessionStore(api)
  return function TerminalPanelWrapper(props: {
    surfaceId: string
    title: string
    workspaceId?: string
    onRequestClose(): void
  }): JSX.Element {
    return (
      <TerminalPanel
        store={store}
        api={api}
        surfaceId={props.surfaceId}
        title={props.title}
        workspaceId={props.workspaceId}
        onRequestClose={props.onRequestClose}
      />
    )
  }
}

export type { TerminalPanelSession }
