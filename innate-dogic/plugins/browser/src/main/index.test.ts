import { describe, expect, it, vi } from 'vitest'
import type { WebContentsView } from 'electron'
import { DEFAULT_MAX_BROWSER_SESSIONS, BrowserSurfaceService } from './index.js'
import type {
  BrowserDescriptor,
  BrowserSurfaceEvent,
  BrowserSurfaceView,
  BrowserSurfaceViewFactory,
  BrowserViewEvent,
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

interface FakeView {
  view: BrowserSurfaceView
  loadURL: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  setBounds: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  emit(event: BrowserViewEvent): void
}

function fakeViewFactory(): { factory: BrowserSurfaceViewFactory; views: FakeView[] } {
  const views: FakeView[] = []
  const factory = ((_descriptor: BrowserDescriptor) => {
    const listeners = new Set<(event: BrowserViewEvent) => void>()
    const loadURL = vi.fn(async () => {})
    const close = vi.fn()
    const setBounds = vi.fn()
    const subscribe = vi.fn((listener: (event: BrowserViewEvent) => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    })
    const view: BrowserSurfaceView = {
      underlying: {} as unknown as WebContentsView,
      loadURL,
      close,
      setBounds,
      subscribe,
    }
    views.push({
      view,
      loadURL,
      close,
      setBounds,
      subscribe,
      emit: (event) => {
        for (const listener of [...listeners]) listener(event)
      },
    })
    return view
  }) as BrowserSurfaceViewFactory
  return { factory, views }
}

function recordingService() {
  const { factory, views } = fakeViewFactory()
  const events: BrowserSurfaceEvent[] = []
  const service = new BrowserSurfaceService({
    factory,
    onEvent: (event) => events.push(event),
  })
  return { service, views, events }
}

describe('BrowserSurfaceService（会话隔离与导航策略）', () => {
  it('open 创建会话并可见；重复 open 拒绝', async () => {
    const { service } = recordingService()
    expect(await service.open(descriptorInput())).toEqual({ ok: true })
    const state = service.state('browser-1')
    expect(state?.title).toBe('浏览器')
    expect(state?.active).toBe(true)
    expect(state?.currentUrl).toBeNull()
    expect(state?.canBack).toBe(false)
    expect(state?.canForward).toBe(false)
    const again = await service.open(descriptorInput())
    expect(again.ok).toBe(false)
    expect(again.detail).toContain('已存在')
  })

  it('并发会话上限受控', async () => {
    const { factory } = fakeViewFactory()
    const service = new BrowserSurfaceService({ factory, maxSessions: 2 })
    expect((await service.open(descriptorInput({ id: 'b-1' }))).ok).toBe(true)
    expect((await service.open(descriptorInput({ id: 'b-2' }))).ok).toBe(true)
    const third = await service.open(descriptorInput({ id: 'b-3' }))
    expect(third.ok).toBe(false)
    expect(third.detail).toContain('上限')
    expect(DEFAULT_MAX_BROWSER_SESSIONS).toBe(8)
  })

  it('navigate 接受 http/https 并记录历史；非法协议不污染历史', async () => {
    const { service, views } = recordingService()
    await service.open(descriptorInput())
    const first = await service.navigate('browser-1', { url: 'https://example.com/a' })
    expect(first).toEqual({ ok: true, url: 'https://example.com/a' })
    const rejected = await service.navigate('browser-1', { url: 'file:///C:/' })
    expect(rejected.ok).toBe(false)
    expect(rejected.detail).toContain('协议不受支持')
    const state = service.state('browser-1')
    expect(state?.currentUrl).toBe('https://example.com/a')
    expect(views[0]?.loadURL).toHaveBeenCalledTimes(1)
    expect(views[0]?.loadURL).toHaveBeenCalledWith('https://example.com/a')
  })

  it('back/forward 状态机与边界', async () => {
    const { service } = recordingService()
    await service.open(descriptorInput())
    expect((await service.back('browser-1')).ok).toBe(false)
    await service.navigate('browser-1', { url: 'https://example.com/1' })
    await service.navigate('browser-1', { url: 'https://example.com/2' })
    let state = service.state('browser-1')
    expect(state?.canBack).toBe(true)
    expect(state?.canForward).toBe(false)
    expect((await service.back('browser-1'))).toEqual({ ok: true, url: 'https://example.com/1' })
    state = service.state('browser-1')
    expect(state?.canBack).toBe(false)
    expect(state?.canForward).toBe(true)
    // 新导航截断 forward 分支
    await service.navigate('browser-1', { url: 'https://example.com/3' })
    expect((await service.forward('browser-1')).ok).toBe(false)
  })

  it('reload 重载当前页；无页面 reload 拒绝', async () => {
    const { service, views } = recordingService()
    await service.open(descriptorInput())
    expect((await service.reload('browser-1')).ok).toBe(false)
    await service.navigate('browser-1', { url: 'https://example.com/x' })
    expect((await service.reload('browser-1'))).toEqual({ ok: true, url: 'https://example.com/x' })
    expect(views[0]?.loadURL).toHaveBeenCalledTimes(2)
  })

  it('activate/deactivate 只切换可见态，不销毁会话', async () => {
    const { service, views } = recordingService()
    await service.open(descriptorInput())
    await service.navigate('browser-1', { url: 'https://example.com/' })
    expect((await service.deactivate('browser-1')).ok).toBe(true)
    expect(service.state('browser-1')?.active).toBe(false)
    expect(service.state('browser-1')?.currentUrl).toBe('https://example.com/')
    expect(views[0]?.close).not.toHaveBeenCalled()
    expect((await service.activate('browser-1')).ok).toBe(true)
    expect(service.state('browser-1')?.active).toBe(true)
  })

  it('close 只回收本会话；视图销毁且其他会话不受影响', async () => {
    const { service, views } = recordingService()
    await service.open(descriptorInput({ id: 'b-1' }))
    await service.open(descriptorInput({ id: 'b-2' }))
    await service.navigate('b-2', { url: 'https://example.com/' })
    expect((await service.close('b-1')).ok).toBe(true)
    expect(views[0]?.close).toHaveBeenCalledTimes(1)
    expect(service.state('b-1')).toBeUndefined()
    // 其他会话不受影响
    expect(service.state('b-2')?.currentUrl).toBe('https://example.com/')
    expect(views[1]?.close).not.toHaveBeenCalled()
    expect((await service.close('b-1')).ok).toBe(false)
  })

  it('未知会话的导航/历史/可见/关闭操作全部显式失败', async () => {
    const { service } = recordingService()
    expect((await service.navigate('ghost', { url: 'https://example.com/' })).ok).toBe(false)
    expect((await service.back('ghost')).ok).toBe(false)
    expect((await service.forward('ghost')).ok).toBe(false)
    expect((await service.reload('ghost')).ok).toBe(false)
    expect((await service.activate('ghost')).ok).toBe(false)
    expect((await service.deactivate('ghost')).ok).toBe(false)
    expect((await service.close('ghost')).ok).toBe(false)
    expect(service.state('ghost')).toBeUndefined()
  })

  it('非法 descriptor/导航输入在策略层拒绝', async () => {
    const { service } = recordingService()
    const forged = await service.open(descriptorInput({ providerId: 'terminal' }))
    expect(forged.ok).toBe(false)
    expect(forged.detail).toContain('providerId')
    await service.open(descriptorInput())
    expect((await service.navigate('browser-1', { url: 'javascript:alert(1)' })).ok).toBe(false)
    expect((await service.navigate('browser-1', { url: 42 })).ok).toBe(false)
    expect((await service.navigate('browser-1', 'https://example.com/')).ok).toBe(false)
  })

  it('loadURL 未受理时导航失败且不入历史，failed 事件上报', async () => {
    const { service, views, events } = recordingService()
    await service.open(descriptorInput())
    views[0]?.loadURL.mockRejectedValueOnce(new Error('net::ERR_CONNECTION_REFUSED'))
    const result = await service.navigate('browser-1', { url: 'https://example.com/' })
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('ERR_CONNECTION_REFUSED')
    expect(service.state('browser-1')?.currentUrl).toBeNull()
    expect(service.state('browser-1')?.failed).toContain('ERR_CONNECTION_REFUSED')
    expect(events).toContainEqual({
      type: 'failed', id: 'browser-1', errorCode: -1, message: 'net::ERR_CONNECTION_REFUSED',
    })
  })

  it('dispose 统一回收全部会话（视图销毁 + 事件出口断开）', async () => {
    const { service, views, events } = recordingService()
    await service.open(descriptorInput({ id: 'b-1' }))
    await service.open(descriptorInput({ id: 'b-2' }))
    service.dispose()
    expect(views[0]?.close).toHaveBeenCalledTimes(1)
    expect(views[1]?.close).toHaveBeenCalledTimes(1)
    expect(service.state('b-1')).toBeUndefined()
    expect(service.state('b-2')).toBeUndefined()
    // 回收后再发事件不触达出口（订阅已移除）
    views[0]?.emit({ type: 'loading', loading: true })
    expect(events).toHaveLength(0)
  })
})

describe('BrowserSurfaceService（多标签与生命周期 W5.2）', () => {
  it('多浏览器标签共存：切换不重载（视图不重建、不销毁）', async () => {
    const { service, views } = recordingService()
    await service.open(descriptorInput({ id: 'browser-1' }))
    await service.open(descriptorInput({ id: 'browser-2' }))
    await service.navigate('browser-1', { url: 'https://example.com/a' })
    await service.navigate('browser-2', { url: 'https://example.com/b' })
    expect(views).toHaveLength(2)
    expect(views[0]?.loadURL).toHaveBeenCalledWith('https://example.com/a')
    expect(views[1]?.loadURL).toHaveBeenCalledWith('https://example.com/b')
    // 标签切换只切可见态：视图不被销毁、历史保留
    expect((await service.deactivate('browser-1')).ok).toBe(true)
    expect((await service.activate('browser-2')).ok).toBe(true)
    expect(views[0]?.close).not.toHaveBeenCalled()
    expect(views[1]?.close).not.toHaveBeenCalled()
    expect(service.state('browser-1')?.currentUrl).toBe('https://example.com/a')
    expect(service.state('browser-2')?.currentUrl).toBe('https://example.com/b')
    // 切回后仍可后退（历史未丢）
    await service.navigate('browser-1', { url: 'https://example.com/a2' })
    expect((await service.back('browser-1'))).toEqual({ ok: true, url: 'https://example.com/a' })
  })

  it('视图事件驱动会话状态：loading/failed/navigated/crashed/unresponsive', async () => {
    const { service, views, events } = recordingService()
    await service.open(descriptorInput())
    await service.navigate('browser-1', { url: 'https://example.com/a' })
    views[0]?.emit({ type: 'loading', loading: true })
    expect(service.state('browser-1')?.loading).toBe(true)
    views[0]?.emit({ type: 'loading', loading: false })
    expect(service.state('browser-1')?.loading).toBe(false)
    views[0]?.emit({ type: 'failed', errorCode: -3, message: 'ERR_NAME_NOT_RESOLVED' })
    expect(service.state('browser-1')?.failed).toBe('ERR_NAME_NOT_RESOLVED')
    expect(service.state('browser-1')?.currentUrl).toBe('https://example.com/a')
    views[0]?.emit({ type: 'navigated', url: 'https://example.com/final' })
    expect(service.state('browser-1')?.currentUrl).toBe('https://example.com/final')
    views[0]?.emit({ type: 'crashed' })
    expect(service.state('browser-1')?.crashed).toBe(true)
    views[0]?.emit({ type: 'unresponsive', responsive: false })
    expect(service.state('browser-1')?.unresponsive).toBe(true)
    views[0]?.emit({ type: 'unresponsive', responsive: true })
    expect(service.state('browser-1')?.unresponsive).toBe(false)
    expect(events.map((event) => event.type)).toEqual([
      'loading', 'loading', 'failed', 'navigated', 'crashed', 'unresponsive', 'unresponsive',
    ])
  })

  it('重定向到非白名单/内嵌凭据地址：不记录并上报 failed', async () => {
    const { service, views, events } = recordingService()
    await service.open(descriptorInput())
    await service.navigate('browser-1', { url: 'https://example.com/a' })
    views[0]?.emit({ type: 'navigated', url: 'file:///C:/Windows/' })
    expect(service.state('browser-1')?.currentUrl).toBe('https://example.com/a')
    expect(service.state('browser-1')?.failed).toContain('协议不受支持')
    views[0]?.emit({ type: 'navigated', url: 'http://user:pass@example.com/' })
    expect(service.state('browser-1')?.failed).toContain('内嵌凭据')
    expect(events.some((event) => event.type === 'failed' && event.errorCode === -2)).toBe(true)
    expect(events.some((event) => event.type === 'navigated')).toBe(false)
  })

  it('崩溃隔离：一个会话崩溃/无响应不影响其他会话', async () => {
    const { service, views } = recordingService()
    await service.open(descriptorInput({ id: 'b-1' }))
    await service.open(descriptorInput({ id: 'b-2' }))
    await service.navigate('b-1', { url: 'https://example.com/1' })
    await service.navigate('b-2', { url: 'https://example.com/2' })
    views[0]?.emit({ type: 'crashed' })
    views[0]?.emit({ type: 'unresponsive', responsive: false })
    expect(service.state('b-1')?.crashed).toBe(true)
    expect(service.state('b-1')?.unresponsive).toBe(true)
    const other = service.state('b-2')
    expect(other?.crashed).toBe(false)
    expect(other?.unresponsive).toBe(false)
    expect(other?.currentUrl).toBe('https://example.com/2')
    // 崩溃会话仍可关闭回收，其他会话继续可用
    expect((await service.close('b-1')).ok).toBe(true)
    expect(service.state('b-2')?.currentUrl).toBe('https://example.com/2')
  })

  it('onViewClosed：视图销毁后清理会话，后续事件忽略', async () => {
    const { service, views, events } = recordingService()
    await service.open(descriptorInput())
    expect(views[0]?.subscribe).toHaveBeenCalledTimes(1)
    service.provider.onViewClosed('browser-1')
    expect(service.state('browser-1')).toBeUndefined()
    // 会话终态后忽略后续事件（视图销毁与事件到达无固定顺序）
    views[0]?.emit({ type: 'loading', loading: true })
    views[0]?.emit({ type: 'crashed' })
    expect(events).toHaveLength(0)
  })

  it('provider 适配器：createView 创建会话视图、deferredUrl、resolve 恒就绪', async () => {
    const { service, views } = recordingService()
    expect(service.provider.id).toBe('browser')
    expect(service.provider.kind).toBe('webcontents')
    expect(service.provider.deferredUrl).toBe(true)
    expect(await service.provider.resolve()).toEqual({ ok: true })
    const underlying = service.provider.createView(descriptorInput())
    expect(underlying).toBe(views[0]?.view.underlying)
    expect(service.state('browser-1')?.title).toBe('浏览器')
    service.provider.createView(descriptorInput({ id: 'browser-2' }))
    expect(service.state('browser-2')?.id).toBe('browser-2')
    // 非法 descriptor/重复 id：createView 显式抛错（SurfaceHost 捕获呈现）
    expect(() => service.provider.createView(descriptorInput({ providerId: 'terminal' }))).toThrow(/providerId/)
    expect(() => service.provider.createView(descriptorInput())).toThrow(/已存在/)
  })

  it('provider 适配器：onViewAttached/onViewDetached 同步会话可见态', async () => {
    const { service } = recordingService()
    await service.open(descriptorInput())
    service.provider.onViewDetached('browser-1')
    expect(service.state('browser-1')?.active).toBe(false)
    service.provider.onViewAttached('browser-1')
    expect(service.state('browser-1')?.active).toBe(true)
    service.provider.onViewDetached('ghost')
    service.provider.onViewAttached('ghost')
  })

  it('视图抽象不提供 JS 执行通道（类型层保证）', () => {
    // @ts-expect-error BrowserSurfaceView 没有 executeJavaScript 属性
    void ({} as BrowserSurfaceView).executeJavaScript
  })
})
