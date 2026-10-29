/**
 * electron WebContentsView 工厂（W5.2）：
 * - 独立持久分区 persist:innate-browser（与 Harness/console 默认 session 隔离）；
 * - contextIsolation: true、nodeIntegration: false、sandbox: true；
 * - 新窗口请求：http/https 交系统浏览器，其余一律拒绝（W5.3 细化外链规则）；
 * - 事件经 subscribe 中性通道上报服务层，服务层不感知 electron。
 *
 * 禁止 executeJavaScript：本工厂与视图抽象都不提供任何页面脚本执行通道。
 */
import { session, shell, WebContentsView } from 'electron'
import { BROWSER_PARTITION } from '../shared/index.js'
import type { BrowserDescriptor } from '../shared/index.js'
import type { BrowserSurfaceView, BrowserViewBounds, BrowserViewEvent } from './index.js'

export function createElectronBrowserView(descriptor: BrowserDescriptor): BrowserSurfaceView {
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
    if (/^https?:\/\//i.test(target)) void shell.openExternal(target)
    return { action: 'deny' }
  })
  const listeners = new Set<(event: BrowserViewEvent) => void>()
  const emit = (event: BrowserViewEvent): void => {
    for (const listener of [...listeners]) listener(event)
  }
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
    close: () => webContents.close(),
    setBounds: (bounds) => view.setBounds(bounds),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
