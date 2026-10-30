import { describe, expect, it } from 'vitest'
import {
  browserPermissionOrigin,
  denyBrowserPermission,
  UNKNOWN_PERMISSION_ORIGIN,
} from './permission.js'

describe('browserPermissionOrigin（权限事件 origin 脱敏提取）', () => {
  it('http/https 页面只提取 origin（剥除路径/query）', () => {
    expect(browserPermissionOrigin('https://example.com/a/b?token=1')).toBe('https://example.com')
    expect(browserPermissionOrigin('http://127.0.0.1:8080/')).toBe('http://127.0.0.1:8080')
  })

  it('内嵌凭据 URL 的 origin 不含凭据', () => {
    // 防御性净化：即便页面 URL 带凭据，记录的 origin 也绝不含 user:pass
    expect(browserPermissionOrigin('https://user:p**s@example.com/x')).toBe('https://example.com')
  })

  it('非 http(s) 协议记为 unknown', () => {
    expect(browserPermissionOrigin('about:blank')).toBe(UNKNOWN_PERMISSION_ORIGIN)
    expect(browserPermissionOrigin('chrome://settings/')).toBe(UNKNOWN_PERMISSION_ORIGIN)
    expect(browserPermissionOrigin('file:///C:/Windows/')).toBe(UNKNOWN_PERMISSION_ORIGIN)
  })

  it('无法解析的 URL 记为 unknown', () => {
    expect(browserPermissionOrigin('')).toBe(UNKNOWN_PERMISSION_ORIGIN)
    expect(browserPermissionOrigin('not a url')).toBe(UNKNOWN_PERMISSION_ORIGIN)
  })
})

describe('denyBrowserPermission（W5.4 全拒策略）', () => {
  it('一律拒绝并生成脱敏记录：只有 origin/类型/结果', () => {
    const record = denyBrowserPermission({ origin: 'https://example.com', permission: 'geolocation' })
    expect(record).toEqual({ origin: 'https://example.com', permission: 'geolocation', result: 'denied' })
    // 记录键集固定：不携带页面内容字段
    expect(Object.keys(record).sort()).toEqual(['origin', 'permission', 'result'])
  })
})
