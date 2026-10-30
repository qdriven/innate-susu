import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { SurfaceDescriptor, SurfaceShowResult } from '@dogic/core/surface'
import type { ViewBounds } from '@dogic/core'
import type {
  BrowserApi,
  BrowserSessionState,
  BrowserSurfaceEvent,
  DownloadState,
  DownloadStatus,
} from '../shared/index.js'

/** 面板需要的宿主视图生命周期窄接口（desktop preload 的 surfaceShow/Hide/Bounds/Close）。 */
export interface BrowserSurfaceLifecycle {
  surfaceShow(descriptor: SurfaceDescriptor, bounds: ViewBounds): Promise<SurfaceShowResult>
  surfaceHide(id: string): Promise<boolean>
  surfaceBounds(id: string, bounds: ViewBounds): Promise<boolean>
  surfaceClose(id: string): Promise<boolean>
}

export type BrowserPanelApi = BrowserApi & BrowserSurfaceLifecycle

export interface BrowserPanelProps {
  api: BrowserPanelApi
  descriptor: SurfaceDescriptor
  active: boolean
  onRequestClose(): void
}

function readBounds(element: HTMLElement | null): ViewBounds {
  const rect = element?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0, width: 0, height: 0 }
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

/** 下载状态行上限（保留最近若干行，终态行在上限内保留）。 */
const MAX_DOWNLOAD_LINES = 5

/**
 * W5.5：下载事件并入状态行。同文件名（同来源）按最新事件更新，
 * 新文件追加；超过上限丢弃最旧行。
 */
function upsertDownload(
  current: DownloadStatus[],
  event: BrowserSurfaceEvent & { type: 'download' },
): DownloadStatus[] {
  const status: DownloadStatus = {
    filename: event.filename,
    origin: event.origin,
    percent: event.percent,
    state: event.state,
  }
  const index = current.findIndex(
    (entry) => entry.filename === status.filename && entry.origin === status.origin,
  )
  const next = index >= 0
    ? current.map((entry, i) => (i === index ? status : entry))
    : [...current, status]
  return next.length > MAX_DOWNLOAD_LINES ? next.slice(next.length - MAX_DOWNLOAD_LINES) : next
}

/** 下载终态/中间态文案。 */
function downloadStateText(state: DownloadState, percent: number): string {
  if (state === 'started') return '等待保存位置…'
  if (state === 'progress') return `${percent}%`
  if (state === 'completed') return '已完成'
  if (state === 'cancelled') return '已取消'
  return '下载失败'
}

/**
 * browser Surface 面板（W5.3 地址栏，W5.4 权限提示，W5.5 受控下载行）：
 * 地址栏 + 前进/后退/刷新/停止 + 加载进度。
 *
 * - 视图本体在主进程 WebContentsView（kind=webcontents），面板只占位并
 *   同步 bounds（复用 W1c surfaceShow/Hide/Bounds 语义）；
 * - 地址栏提交一律经 main 策略层解析校验（非法 URL 显式拒并回显安全文案）；
 * - 页面事件（loading/failed/navigated/crashed/unresponsive/permission-denied/
 *   download）驱动状态刷新，错误提示不暴露凭据或内部堆栈；权限拒绝以
 *   脱敏文案呈现；下载以受控状态行呈现（文件名、来源 origin、进度、终态，
 *   不自动执行下载内容）；
 * - 崩溃/加载失败/无响应只影响本标签，提供重试/关闭。
 */
export function BrowserPanel({
  api, descriptor, active, onRequestClose,
}: BrowserPanelProps): JSX.Element {
  const areaRef = useRef<HTMLDivElement>(null)
  const descriptorRef = useRef<SurfaceDescriptor>(descriptor)
  descriptorRef.current = descriptor
  const [state, setState] = useState<BrowserSessionState | null>(null)
  const [input, setInput] = useState('')
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  /** W5.5：受控下载状态行（按文件名去重更新，最多保留 5 行）。 */
  const [downloads, setDownloads] = useState<DownloadStatus[]>([])
  const focusedRef = useRef(false)

  const bounds = useCallback(() => readBounds(areaRef.current), [])

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const next = await api.browserState(descriptorRef.current.id)
      setState(next)
      if (!focusedRef.current && next?.currentUrl != null) setInput(next.currentUrl)
    } catch {
      /* 瞬时失败忽略：事件流会再次驱动刷新 */
    }
  }, [api])

  // 页面事件流：驱动状态刷新并呈现安全提示
  useEffect(() => {
    const unsubscribe = api.browserOnEvent((event: BrowserSurfaceEvent) => {
      if (event.id !== descriptorRef.current.id) return
      if (event.type === 'failed') setNotice(event.message)
      else if (event.type === 'crashed') setNotice('页面已崩溃')
      else if (event.type === 'unresponsive') setNotice(event.responsive ? '' : '页面无响应')
      else if (event.type === 'navigated') setNotice('')
      else if (event.type === 'permission-denied') setNotice(`已拒绝 ${event.origin} 的 ${event.permission} 权限请求`)
      else if (event.type === 'download') {
        // W5.5：受控下载状态行（脱敏文件名/origin/进度/终态，不自动执行内容）
        setDownloads((prev) => upsertDownload(prev, event))
      }
      void refresh()
    })
    return unsubscribe
  }, [api, refresh])

  // 宿主视图生命周期：激活时显示、失活/卸载时摘除（标签切换不销毁会话）
  useEffect(() => {
    if (!active) {
      void api.surfaceHide(descriptorRef.current.id)
      return
    }
    let cancelled = false
    const show = async (): Promise<void> => {
      try {
        const result = await api.surfaceShow(descriptorRef.current, bounds())
        if (cancelled) return
        if (!result.ok) setNotice((prev) => prev || (result.detail ?? '浏览器视图打开失败'))
      } catch (reason) {
        if (!cancelled) setNotice(reason instanceof Error ? reason.message : String(reason))
      }
    }
    void show()
    const element = areaRef.current
    const observer = typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(() => void api.surfaceBounds(descriptorRef.current.id, bounds()))
    if (element) observer?.observe(element)
    return () => {
      cancelled = true
      observer?.disconnect()
      void api.surfaceHide(descriptorRef.current.id)
    }
  }, [active, attempt, bounds, api])

  useEffect(() => { void refresh() }, [refresh, attempt])

  const navigate = useCallback(async (raw: string): Promise<void> => {
    const result = await api.browserNavigate(descriptorRef.current.id, { url: raw })
    if (result.ok) {
      setNotice('')
      await refresh()
    } else {
      setNotice(result.detail ?? '导航失败')
    }
  }, [api, refresh])

  const back = useCallback(async (): Promise<void> => {
    const result = await api.browserBack(descriptorRef.current.id)
    if (result.ok) {
      setNotice('')
      await refresh()
    }
  }, [api, refresh])

  const forward = useCallback(async (): Promise<void> => {
    const result = await api.browserForward(descriptorRef.current.id)
    if (result.ok) {
      setNotice('')
      await refresh()
    }
  }, [api, refresh])

  const reload = useCallback(async (): Promise<void> => {
    const result = await api.browserReload(descriptorRef.current.id)
    if (result.ok) {
      setNotice('')
      await refresh()
    }
  }, [api, refresh])

  const stop = useCallback(async (): Promise<void> => {
    await api.browserStop(descriptorRef.current.id)
    await refresh()
  }, [api, refresh])

  const submit = (event: FormEvent): void => {
    event.preventDefault()
    void navigate(input.trim())
  }

  const canReload = state?.currentUrl != null
  return (
    <div className="surface-view browser-surface">
      <form className="browser-toolbar" onSubmit={submit}>
        <button type="button" className="browser-nav-btn" onClick={() => void back()} disabled={!state?.canBack} title="后退">←</button>
        <button type="button" className="browser-nav-btn" onClick={() => void forward()} disabled={!state?.canForward} title="前进">→</button>
        <button type="button" className="browser-nav-btn" onClick={() => void reload()} disabled={!canReload} title="刷新">⟳</button>
        <button type="button" className="browser-nav-btn" onClick={() => void stop()} disabled={!state?.loading} title="停止">⏹</button>
        <input
          className="browser-address"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onFocus={() => { focusedRef.current = true }}
          onBlur={() => { focusedRef.current = false; setInput(state?.currentUrl ?? input) }}
          placeholder="输入 http/https 地址"
          spellCheck={false}
        />
        <button type="submit" className="browser-go" disabled={input.trim().length === 0}>前往</button>
      </form>
      {state?.loading && <div className="browser-progress" />}
      {notice && (
        <div className="browser-notice">
          <span>{notice}</span>
          {(state?.crashed || state?.failed) && (
            <span className="browser-notice-actions">
              <button type="button" onClick={() => void reload()} disabled={!canReload}>重试</button>
              <button type="button" onClick={onRequestClose}>关闭标签</button>
            </span>
          )}
        </div>
      )}
      {downloads.length > 0 && (
        <div className="browser-downloads">
          {downloads.map((download) => (
            <div key={`${download.filename}:${download.origin}`} className="browser-download">
              <span className="browser-download-name">{download.filename}</span>
              <span className="browser-download-origin">{download.origin}</span>
              <span className="browser-download-state">{downloadStateText(download.state, download.percent)}</span>
            </div>
          ))}
        </div>
      )}
      <div ref={areaRef} className="surface-view-area" data-surface-id={descriptor.id} />
    </div>
  )
}
