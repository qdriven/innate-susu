import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_MAX_BROWSER_SESSIONS, BrowserProvider } from './index.js'
import type { BrowserPageLoader } from './index.js'

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

function recordingLoader(overrides: Partial<BrowserPageLoader> = {}): BrowserPageLoader {
  return {
    load: vi.fn(async () => true),
    ...overrides,
  }
}

describe('BrowserProvider（会话隔离与导航策略 W5.1）', () => {
  it('open 创建会话并可见；重复 open 拒绝', async () => {
    const provider = new BrowserProvider({ loader: recordingLoader() })
    expect(await provider.open(descriptorInput())).toEqual({ ok: true })
    const state = provider.state('browser-1')
    expect(state?.title).toBe('浏览器')
    expect(state?.active).toBe(true)
    expect(state?.currentUrl).toBeNull()
    expect(state?.canBack).toBe(false)
    expect(state?.canForward).toBe(false)
    const again = await provider.open(descriptorInput())
    expect(again.ok).toBe(false)
    expect(again.detail).toContain('已存在')
  })

  it('并发会话上限受控', async () => {
    const provider = new BrowserProvider({ loader: recordingLoader(), maxSessions: 2 })
    expect((await provider.open(descriptorInput({ id: 'b-1' }))).ok).toBe(true)
    expect((await provider.open(descriptorInput({ id: 'b-2' }))).ok).toBe(true)
    const third = await provider.open(descriptorInput({ id: 'b-3' }))
    expect(third.ok).toBe(false)
    expect(third.detail).toContain('上限')
    expect(DEFAULT_MAX_BROWSER_SESSIONS).toBe(8)
  })

  it('navigate 接受 http/https 并记录历史；非法协议不污染历史', async () => {
    const loader = recordingLoader()
    const provider = new BrowserProvider({ loader })
    await provider.open(descriptorInput())
    const first = await provider.navigate('browser-1', { url: 'https://example.com/a' })
    expect(first).toEqual({ ok: true, url: 'https://example.com/a' })
    const rejected = await provider.navigate('browser-1', { url: 'file:///C:/' })
    expect(rejected.ok).toBe(false)
    expect(rejected.detail).toContain('协议不受支持')
    const state = provider.state('browser-1')
    expect(state?.currentUrl).toBe('https://example.com/a')
    expect(loader.load).toHaveBeenCalledTimes(1)
    expect(loader.load).toHaveBeenCalledWith('browser-1', 'https://example.com/a')
  })

  it('back/forward 状态机与边界', async () => {
    const provider = new BrowserProvider({ loader: recordingLoader() })
    await provider.open(descriptorInput())
    expect((await provider.back('browser-1')).ok).toBe(false)
    await provider.navigate('browser-1', { url: 'https://example.com/1' })
    await provider.navigate('browser-1', { url: 'https://example.com/2' })
    let state = provider.state('browser-1')
    expect(state?.canBack).toBe(true)
    expect(state?.canForward).toBe(false)
    expect((await provider.back('browser-1'))).toEqual({ ok: true, url: 'https://example.com/1' })
    state = provider.state('browser-1')
    expect(state?.canBack).toBe(false)
    expect(state?.canForward).toBe(true)
    // 新导航截断 forward 分支
    await provider.navigate('browser-1', { url: 'https://example.com/3' })
    expect((await provider.forward('browser-1')).ok).toBe(false)
  })

  it('reload 重载当前页；无页面 reload 拒绝', async () => {
    const loader = recordingLoader()
    const provider = new BrowserProvider({ loader })
    await provider.open(descriptorInput())
    expect((await provider.reload('browser-1')).ok).toBe(false)
    await provider.navigate('browser-1', { url: 'https://example.com/x' })
    expect((await provider.reload('browser-1'))).toEqual({ ok: true, url: 'https://example.com/x' })
    expect(loader.load).toHaveBeenCalledTimes(2)
  })

  it('activate/deactivate 只切换可见态，不销毁会话', async () => {
    const provider = new BrowserProvider({ loader: recordingLoader() })
    await provider.open(descriptorInput())
    await provider.navigate('browser-1', { url: 'https://example.com/' })
    expect((await provider.deactivate('browser-1')).ok).toBe(true)
    expect(provider.state('browser-1')?.active).toBe(false)
    expect(provider.state('browser-1')?.currentUrl).toBe('https://example.com/')
    expect((await provider.activate('browser-1')).ok).toBe(true)
    expect(provider.state('browser-1')?.active).toBe(true)
  })

  it('close 只回收本会话；loader 收到 dispose', async () => {
    const dispose = vi.fn()
    const provider = new BrowserProvider({ loader: recordingLoader({ dispose }) })
    await provider.open(descriptorInput({ id: 'b-1' }))
    await provider.open(descriptorInput({ id: 'b-2' }))
    await provider.navigate('b-2', { url: 'https://example.com/' })
    expect((await provider.close('b-1')).ok).toBe(true)
    expect(dispose).toHaveBeenCalledWith('b-1')
    expect(provider.state('b-1')).toBeUndefined()
    // 其他会话不受影响
    expect(provider.state('b-2')?.currentUrl).toBe('https://example.com/')
    expect((await provider.close('b-1')).ok).toBe(false)
  })

  it('未知会话的导航/历史/可见/关闭操作全部显式失败', async () => {
    const provider = new BrowserProvider({ loader: recordingLoader() })
    expect((await provider.navigate('ghost', { url: 'https://example.com/' })).ok).toBe(false)
    expect((await provider.back('ghost')).ok).toBe(false)
    expect((await provider.forward('ghost')).ok).toBe(false)
    expect((await provider.reload('ghost')).ok).toBe(false)
    expect((await provider.activate('ghost')).ok).toBe(false)
    expect((await provider.deactivate('ghost')).ok).toBe(false)
    expect((await provider.close('ghost')).ok).toBe(false)
    expect(provider.state('ghost')).toBeUndefined()
  })

  it('非法 descriptor/导航输入在策略层拒绝', async () => {
    const provider = new BrowserProvider({ loader: recordingLoader() })
    const forged = await provider.open(descriptorInput({ providerId: 'terminal' }))
    expect(forged.ok).toBe(false)
    expect(forged.detail).toContain('providerId')
    await provider.open(descriptorInput())
    expect((await provider.navigate('browser-1', { url: 'javascript:alert(1)' })).ok).toBe(false)
    expect((await provider.navigate('browser-1', { url: 42 })).ok).toBe(false)
    expect((await provider.navigate('browser-1', 'https://example.com/')).ok).toBe(false)
  })

  it('loader 未受理时导航失败且不入历史', async () => {
    const provider = new BrowserProvider({
      loader: { load: async () => false },
    })
    await provider.open(descriptorInput())
    const result = await provider.navigate('browser-1', { url: 'https://example.com/' })
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('未受理')
    expect(provider.state('browser-1')?.currentUrl).toBeNull()
  })

  it('dispose 统一回收全部会话', async () => {
    const dispose = vi.fn()
    const provider = new BrowserProvider({ loader: recordingLoader({ dispose }) })
    await provider.open(descriptorInput({ id: 'b-1' }))
    await provider.open(descriptorInput({ id: 'b-2' }))
    provider.dispose()
    expect(dispose).toHaveBeenCalledTimes(2)
    expect(provider.state('b-1')).toBeUndefined()
    expect(provider.state('b-2')).toBeUndefined()
  })
})
