export { BrowserPanel } from './BrowserPanel.js'
export type {
  BrowserPanelProps,
  BrowserPanelApi,
  BrowserSurfaceLifecycle,
} from './BrowserPanel.js'
// W5.6：浏览器布局持久化（安全浏览布局快照）——纯逻辑模块，
// renderer 与 main 均可消费；持久化后端由调用方注入（产品用 localStorage）。
export {
  BrowserLayoutStore,
  BROWSER_LAYOUT_VERSION,
  DEFAULT_BROWSER_LAYOUT_KEY,
  isSensitiveBrowserUrl,
  buildBrowserLayoutSnapshot,
  parseBrowserLayoutSnapshot,
  filterSafeBrowserUrls,
} from '../main/layout.js'
export type {
  BrowserLayoutEntry,
  BrowserLayoutSnapshot,
  BrowserLayoutStorage,
} from '../main/layout.js'
