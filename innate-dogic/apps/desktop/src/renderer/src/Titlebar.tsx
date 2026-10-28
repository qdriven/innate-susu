import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { AppMode, StatusSnapshot } from '@dogic/core'
import { api } from './api'

interface TitlebarProps {
  mode: AppMode
  pageLabel: string
  status: StatusSnapshot | null
  onSwitchMode: () => void
}

/** Orca 风格应用铬面：左簇应用菜单，右簇状态与 Windows 窗口控制。 */
export default function Titlebar({ mode, pageLabel, status, onSwitchMode }: TitlebarProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const gwOk = status?.gateway.running === true

  useEffect(() => {
    void api.winIsMaximized().then(setMaximized)
    return api.onWinMaximized(setMaximized)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: MouseEvent): void => {
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

  return (
    <header className="titlebar">
      <div className="titlebar-left">
        <span className="logo" aria-hidden>◈</span>
        <div className="app-menu" ref={menuRef}>
          <button
            className="titlebar-icon-button"
            aria-label="应用菜单"
            aria-expanded={menuOpen}
            title="应用菜单"
            onClick={() => setMenuOpen((open) => !open)}
          >
            ···
          </button>
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
        <span className="titlebar-app-name">Innate</span>
        <span className="titlebar-page">{pageLabel}</span>
      </div>

      <div className="titlebar-right">
        <div className="titlebar-status">
          <span className={`pill ${gwOk ? 'ok' : 'bad'}`}>
            magpie {gwOk ? `· ${status?.gateway.version ?? ''}` : '离线'}
          </span>
          {status?.gateway.modelsCount !== undefined && gwOk && (
            <span className="pill dim">{status.gateway.modelsCount} 模型</span>
          )}
        </div>
        <div className="window-controls">
          <button className="window-controls-btn" aria-label="最小化" onClick={() => void api.winMin()}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <path d="M0 5h10v1H0z" fill="currentColor" />
            </svg>
          </button>
          <button
            className="window-controls-btn"
            aria-label={maximized ? '还原' : '最大化'}
            onClick={() => void api.winToggleMax()}
          >
            {maximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                <path d="M2 0v2H0v8h8V8h2V0H2zm6 9H1V3h7v6zM9 7H8V2H3V1h6v6z" fill="currentColor" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                <path d="M0 0v10h10V0H0zm9 9H1V1h8v8z" fill="currentColor" />
              </svg>
            )}
          </button>
          <button className="window-controls-btn window-controls-close" aria-label="关闭" onClick={() => void api.winClose()}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <path d="M1 0L0 1l4 4-4 4 1 1 4-4 4 4 1-1-4-4 4-4-1-1-4 4-4-4z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
