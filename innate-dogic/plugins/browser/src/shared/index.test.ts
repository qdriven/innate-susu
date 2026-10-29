import { describe, expect, it } from 'vitest'
import {
  ALLOWED_BROWSER_PROTOCOLS,
  BROWSER_CAPABILITY,
  BROWSER_PARTITION,
  BROWSER_PROVIDER_ID,
  MAX_URL_LENGTH,
  parseBrowserDescriptor,
  parseBrowserUrl,
} from './index.js'

function descriptorInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'browser-1',
    providerId: 'browser',
    kind: 'webcontents',
    title: '浏览器',
    capabilities: ['network:navigate'],
    ...overrides,
  }
}

describe('parseBrowserUrl（协议白名单 W5.1）', () => {
  it('http/https 接受并规范化', () => {
    expect(parseBrowserUrl('http://example.com')).toBe('http://example.com/')
    expect(parseBrowserUrl('HTTP://Example.COM/a?b=1')).toBe('http://example.com/a?b=1')
    expect(parseBrowserUrl('  https://example.com:8443/x#y  ')).toBe('https://example.com:8443/x#y')
  })

  it('file/data/javascript/chrome/about 等协议默认拒绝', () => {
    for (const protocol of ['file', 'data', 'javascript', 'chrome', 'about', 'blob', 'ws']) {
      expect(() => parseBrowserUrl(`${protocol}://example.com/`)).toThrow(/协议不受支持/)
    }
    expect(() => parseBrowserUrl('file:///C:/Windows/')).toThrow(/协议不受支持/)
  })

  it('无协议/无法解析的输入拒绝', () => {
    expect(() => parseBrowserUrl('example.com')).toThrow(/无法解析/)
    expect(() => parseBrowserUrl('//example.com/path')).toThrow(/无法解析/)
    expect(() => parseBrowserUrl('http://')).toThrow(/无法解析/)
  })

  it('内嵌凭据拒绝（认证 URL 不得经普通导航进入）', () => {
    expect(() => parseBrowserUrl('http://user:pass@example.com/')).toThrow(/内嵌凭据/)
    expect(() => parseBrowserUrl('http://example.com@evil.com/')).toThrow(/内嵌凭据/)
  })

  it('非字符串/空串/超长拒绝', () => {
    expect(() => parseBrowserUrl(42)).toThrow(/字符串/)
    expect(() => parseBrowserUrl('')).toThrow(/不能为空/)
    expect(() => parseBrowserUrl('   ')).toThrow(/不能为空/)
    expect(() => parseBrowserUrl('a'.repeat(MAX_URL_LENGTH + 1))).toThrow(/上限/)
  })

  it('白名单与分区常量固定', () => {
    expect(ALLOWED_BROWSER_PROTOCOLS).toEqual(['http:', 'https:'])
    expect(BROWSER_PARTITION).toBe('persist:innate-browser')
    expect(BROWSER_CAPABILITY).toBe('network:navigate')
  })
})

describe('parseBrowserDescriptor（provider 隔离与 capability）', () => {
  it('合法 descriptor 只复制安全字段', () => {
    const parsed = parseBrowserDescriptor(descriptorInput())
    expect(parsed).toEqual({
      id: 'browser-1',
      providerId: 'browser',
      kind: 'webcontents',
      title: '浏览器',
      capabilities: ['network:navigate'],
    })
    expect('workspaceId' in parsed).toBe(false)
  })

  it('capabilities 缺省时声明 network:navigate', () => {
    const parsed = parseBrowserDescriptor(descriptorInput({ capabilities: undefined }))
    expect(parsed.capabilities).toEqual(['network:navigate'])
  })

  it('browser 不得声明其他 capability', () => {
    expect(() => parseBrowserDescriptor(descriptorInput({ capabilities: ['process:execute'] }))).toThrow(/capability/)
    expect(() => parseBrowserDescriptor(descriptorInput({ capabilities: ['x:y'] }))).toThrow(/capability/)
    expect(() => parseBrowserDescriptor(descriptorInput({ capabilities: ['network:navigate', 'canvas:write'] }))).toThrow(/capability/)
  })

  it('伪造 providerId 拒绝（与 terminal/harness 隔离）', () => {
    expect(() => parseBrowserDescriptor(descriptorInput({ providerId: 'terminal' }))).toThrow(/providerId/)
    expect(() => parseBrowserDescriptor(descriptorInput({ providerId: 'harness' }))).toThrow(/providerId/)
  })

  it('kind 必须是 webcontents', () => {
    expect(() => parseBrowserDescriptor(descriptorInput({ kind: 'terminal' }))).toThrow(/webcontents/)
    expect(() => parseBrowserDescriptor(descriptorInput({ kind: 'document' }))).toThrow(/webcontents/)
  })

  it('非法 id/title 拒绝', () => {
    expect(() => parseBrowserDescriptor(descriptorInput({ id: 'bad id!' }))).toThrow(/id/)
    expect(() => parseBrowserDescriptor(descriptorInput({ id: 'a'.repeat(65) }))).toThrow(/id/)
    expect(() => parseBrowserDescriptor(descriptorInput({ title: '' }))).toThrow(/title/)
    expect(() => parseBrowserDescriptor(descriptorInput({ title: 't'.repeat(121) }))).toThrow(/title/)
  })

  it('接受合法 workspaceId', () => {
    const parsed = parseBrowserDescriptor(descriptorInput({ workspaceId: 'ws-1' }))
    expect(parsed.workspaceId).toBe('ws-1')
  })

  it('非对象/字符串输入拒绝', () => {
    expect(() => parseBrowserDescriptor(null)).toThrow()
    expect(() => parseBrowserDescriptor('browser')).toThrow()
  })

  it('providerId 常量固定', () => {
    expect(BROWSER_PROVIDER_ID).toBe('browser')
  })
})
