/**
 * electron WebContentsView 工厂（W5.2 创建，W5.3 起挂导航守卫）：
 * - 独立持久分区 persist:innate-browser（与 Harness/console 默认 session 隔离）；
 * - contextIsolation: true、nodeIntegration: false、sandbox: true；
 * - 新窗口请求：http/https 交系统浏览器（用户明确选择的外链），其余一律拒绝；
 * - 导航守卫（W5.3）：页面内导航（will-frame-navigate）与重定向
 *   （will-redirect）的目标 URL 经守卫校验，不合法则 preventDefault
 *   并上报安全失败事件——不只检查地址栏初始输入；
 * - 事件经 subscribe 中性通道上报服务层，服务层不感知 electron。
 *
 * 禁止 executeJavaScript：本工厂与视图抽象都不提供任何页面脚本执行通道。
 */
import { session, shell, WebContentsView } from 'electron'
import { BROWSER_PARTITION } from '../shared/index.js'
import type { BrowserDescriptor } from '../shared/index.js'
import type {
  BrowserNavigationGuard,
  BrowserSurfaceView,
  BrowserViewBounds,
  BrowserViewEvent,
} from './index.js'

/** 守卫拦截时的固定安全失败消息（不携带被拒 URL 或内部细节）。 */
const GUARD_REJECTED_MESSAGE = '导航被安全策略拒绝'

export function createElectronBrowserView(
  descriptor: BrowserDescriptor,
  guard: BrowserNavigationGuard,
): BrowserSurfaceView {
  const view = new WebContentsView({
    webPreferences: {
      session: session.fromPartition(BROWSER_PARTITION),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  const webContents = view.webContents
  webContents.setWindowOpenHandler(({ url: target }) => {
    // 用户明确选择的外链交系统浏览器；仅 http/https，其余协议一律拒绝。
    if (/^https?:\/\//i.test(target)) void shell.openExternal(target)
    return { action: 'deny' }
  })
  const listeners = new Set<(event: BrowserViewEvent) => void>()
  const emit = (event: BrowserViewEvent): void => {
    for (const listener of [...listeners]) listener(event)
  }
  const rejectGuarded = (event: { preventDefault(): void }): void => {
    event.preventDefault()
    emit({ type: 'failed', errorCode: -3, message: GUARD_REJECTED_MESSAGE })
  }
  // Electron 43：will-navigate 已废弃，主框架导航用 will-frame-navigate；
  // will-redirect 覆盖 HTTP/JS 重定向的每次跳转（逐跳校验，最终地址再由
  // 服务层 navigated 事件兜底复验）。两类事件均为单参数 Event<Params>。
  webContents.on('will-frame-navigate', (event) => {
    if (!event.isMainFrame) return
    if (!guard(event.url)) rejectGuarded(event)
  })
  webContents.on('will-redirect', (event) => {
    if (!event.isMainFrame) return
    if (!guard(event.url)) rejectGuarded(event)
  })
  webContents.on('did-start-loading', () => emit({ type: 'loading', loading: true }))
  webContents.on('did-stop-loading', () => emit({ type: 'loading', loading: false }))
  webContents.on('did-fail-load', (_event, errorCode, errorDescription, _validatedURL, isMainFrame) => {
    if (!isMainFrame) return
    emit({ type: 'failed', errorCode, message: errorDescription })
  })
  webContents.on('did-navigate', (_event, url) => emit({ type: 'navigated', url }))
  // electron 43：页面崩溃事件为 render-process-gone（reason: crashed/oom 等）
  webContents.on('render-process-gone', (_event, details) => {
    if (details.reason === 'crashed') emit({ type: 'crashed' })
  })
  webContents.on('unresponsive', () => emit({ type: 'unresponsive', responsive: false }))
  webContents.on('responsive', () => emit({ type: 'unresponsive', responsive: true }))
  return {
    underlying: view,
    loadURL: (url) => webContents.loadURL(url),
    stop: () => webContents.stop(),
    close: () => webContents.close(),
    setBounds: (bounds) => view.setBounds(bounds),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
