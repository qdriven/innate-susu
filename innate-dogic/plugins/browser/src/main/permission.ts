/**
 * browser 权限策略（W5.4）：默认拒绝全部权限请求，拒绝结果可诊断。
 *
 * - 摄像头/麦克风/通知/地理位置/剪贴板/MIDI/USB 等一律拒绝；权限事件只记录
 *   origin、类型与结果，不记录页面敏感内容；
 * - 不预留任何自动允许路径：未来开放某权限必须另立任务，按 origin+类型
 *   独立审批（W5-browser.md §W5.4.3）；
 * - 本模块是纯策略（不依赖 electron）：接线在 electron-view 只挂到
 *   persist:innate-browser 分区 session——Harness/console 的默认 session
 *   不继承 browser handler，反之亦然（§W5.4.4）。
 */

/** 无法解析或非 http(s) 页面的 origin 记法。 */
export const UNKNOWN_PERMISSION_ORIGIN = 'unknown'

/** 权限拒绝记录（脱敏）：origin（不含凭据）、权限类型、结果。 */
export interface BrowserPermissionDeniedRecord {
  origin: string
  permission: string
  result: 'denied'
}

/**
 * 从页面 URL 提取可记录 origin：仅 http/https，剥除路径、query 与内嵌凭据。
 * origin 按 URL 规范本不含凭据，此处仍统一走 URL 解析器做防御性净化。
 */
export function browserPermissionOrigin(pageUrl: string): string {
  try {
    const url = new URL(pageUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return UNKNOWN_PERMISSION_ORIGIN
    return url.origin
  } catch {
    return UNKNOWN_PERMISSION_ORIGIN
  }
}

/**
 * 权限决策（W5.4）：一律拒绝，并生成可诊断记录（origin+类型+结果）。
 * 记录不包含页面内容（标题/DOM/表单/凭据）。
 */
export function denyBrowserPermission(input: { origin: string; permission: string }): BrowserPermissionDeniedRecord {
  return { origin: input.origin, permission: input.permission, result: 'denied' }
}
