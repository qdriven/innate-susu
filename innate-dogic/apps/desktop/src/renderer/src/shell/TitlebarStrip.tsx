import { useEffect, useRef, useState } from 'react'
import type { JSX, MouseEvent } from 'react'
import { Button } from '@innate/ui'
import type { AppMode } from '@dogic/core'
import { api } from '../api'

interface TitlebarStripProps {
  mode: AppMode
  pageLabel: string
  onSwitchMode: () => void
}

/** W1a 窗口铬面：品牌、空标签槽、右栏/状态占位与既有窗口控制。 */
export default function TitlebarStrip({ mode, pageLabel, onSwitchMode }: TitlebarStripProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void api.winIsMaximized().then(setMaximized)
    return api.onWinMaximized(setMaximized)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: globalThis.MouseEvent): void => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  const runMenuAction = (action: () => void): void => {
    setMenuOpen(false)
    action()
  }
  const toggleMaximized = (event: MouseEvent<HTMLElement>): void => {
    if (!(event.target as HTMLElement).closest('button,[role="menu"]')) void api.winToggleMax()
  }

  return (
    <header className="titlebar titlebar-strip" data-testid="titlebar-strip" onDoubleClick={toggleMaximized}>
      <div className="titlebar-left titlebar-left-floating" data-testid="titlebar-brand">
        <span className="logo" aria-hidden>◈</span>
        <div className="app-menu" ref={menuRef}>
          <Button
            variant="outline"
            size="icon-xs"
            aria-label="应用菜单"
            aria-expanded={menuOpen}
            title="应用菜单"
            onClick={() => setMenuOpen((open) => !open)}
          >
            ···
          </Button>
          {menuOpen && (
            <div className="app-menu-popover" role="menu">
              <div className="app-menu-heading">Innate · {mode === 'simple' ? '简易使用' : '开发工作台'}</div>
              <button role="menuitem" onClick={() => runMenuAction(onSwitchMode)}>
                {mode === 'simple' ? '切换到开发工作台' : '切换到简易使用'}
              </button>
              <button role="menuitem" onClick={() => runMenuAction(() => void api.openMagpieWeb())}>
                在浏览器打开控制台
              </button>
              <button role="menuitem" onClick={() => runMenuAction(() => void api.openLogs())}>
                打开日志目录
              </button>
            </div>
          )}
        </div>
        <span className="titlebar-divider" />
        <span className="titlebar-app-name titlebar-app-name-main">Innate</span>
        <span className="titlebar-page">{pageLabel}</span>
      </div>

      <div id="titlebar-tabs" className="titlebar-tabs" aria-label="标签槽" />

      <div className="titlebar-right">
        <div id="titlebar-status-slot" className="titlebar-status-slot" data-empty="true" />
        <div id="titlebar-right-panel-slot" className="titlebar-right-panel-slot" aria-label="右栏开关位" />
        <div className="window-controls-titlebar-spacer" />
        <div className="window-controls">
          <Button variant="ghost" size="icon" className="window-controls-btn" aria-label="最小化" onClick={() => void api.winMin()}>
            <svg viewBox="0 0 10 10" aria-hidden><path d="M0 5h10v1H0z" fill="currentColor" /></svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="window-controls-btn"
            aria-label={maximized ? '还原' : '最大化'}
            onClick={() => void api.winToggleMax()}
          >
            {maximized ? (
              <svg viewBox="0 0 10 10" aria-hidden><path d="M2 0v2H0v8h8V8h2V0H2zm6 9H1V3h7v6zM9 7H8V2H3V1h6v6z" fill="currentColor" /></svg>
            ) : (
              <svg viewBox="0 0 10 10" aria-hidden><path d="M0 0v10h10V0H0zm9 9H1V1h8v8z" fill="currentColor" /></svg>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="window-controls-btn window-controls-close" aria-label="关闭" onClick={() => void api.winClose()}>
            <svg viewBox="0 0 10 10" aria-hidden><path d="M1 0L0 1l4 4-4 4 1 1 4-4 4 4 1-1-4-4 4-4-1-1-4 4-4-4z" fill="currentColor" /></svg>
          </Button>
        </div>
      </div>
    </header>
  )
}
