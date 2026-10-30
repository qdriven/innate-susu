import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { BrowserNavigateRequest, BrowserSessionState, BrowserSurfaceEvent } from '@dogic/plugin-browser'
import type { BrowserPanelApi } from '@dogic/plugin-browser/renderer'
import { BrowserPanel } from '@dogic/plugin-browser/renderer'
import type { SurfaceDescriptor } from '@dogic/core/surface'
import type { ViewBounds } from '@dogic/core'

interface FakeBrowserApi {
  api: BrowserPanelApi
  navigate: ReturnType<typeof vi.fn>
  back: ReturnType<typeof vi.fn>
  forward: ReturnType<typeof vi.fn>
  reload: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  state: ReturnType<typeof vi.fn>
  show: ReturnType<typeof vi.fn>
  hide: ReturnType<typeof vi.fn>
  bounds: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  emit(event: BrowserSurfaceEvent): void
}

const DESCRIPTOR: SurfaceDescriptor = {
  id: 'browser-1',
  providerId: 'browser',
  kind: 'webcontents',
  title: '浏览器 1',
  capabilities: ['network:navigate'],
}

/** 伪造会话快照：事件/导航会改变快照，与主进程状态机行为一致（面板经 browserState 拉取）。 */
function makeState(overrides: Partial<BrowserSessionState> = {}): BrowserSessionState {
  return {
    id: 'browser-1',
    title: '浏览器 1',
    active: true,
    currentUrl: 'https://example.com/',
    canBack: false,
    canForward: false,
    loading: false,
    failed: '',
    crashed: false,
    unresponsive: false,
    ...overrides,
  }
}

function makeApi(
  initialState: BrowserSessionState | null = null,
  navigateOverride: { ok: boolean; url: string; detail?: string } | null = null,
): FakeBrowserApi {
  const listeners = new Set<(event: BrowserSurfaceEvent) => void>()
  const current = { value: initialState }
  const navigate = vi.fn(async (_id: string, _request: BrowserNavigateRequest) => {
    const result = { ok: true, url: 'https://example.com/' }
    if (current.value) {
      current.value = { ...current.value, currentUrl: result.url, failed: '', crashed: false }
    }
    return result
  })
  if (navigateOverride) {
    navigate.mockImplementation(async () => navigateOverride)
  }
  const back = vi.fn(async () => ({ ok: true, url: 'https://example.com/back' }))
  const forward = vi.fn(async () => ({ ok: true, url: 'https://example.com/' }))
  const reload = vi.fn(async () => ({ ok: true, url: 'https://example.com/' }))
  const stop = vi.fn(async () => ({ ok: true }))
  const state = vi.fn(async () => current.value)
  const show = vi.fn(async (_descriptor: SurfaceDescriptor, _bounds: ViewBounds) => ({ ok: true }))
  const hide = vi.fn(async () => true)
  const bounds = vi.fn(async () => true)
  const close = vi.fn(async () => true)
  const onEvent = vi.fn((cb: (event: BrowserSurfaceEvent) => void) => {
    listeners.add(cb)
    return () => { listeners.delete(cb) }
  })
  const api: BrowserPanelApi = {
    browserNavigate: navigate,
    browserBack: back,
    browserForward: forward,
    browserReload: reload,
    browserStop: stop,
    browserState: state,
    browserOnEvent: onEvent,
    surfaceShow: show,
    surfaceHide: hide,
    surfaceBounds: bounds,
    surfaceClose: close,
  }
  return {
    api, navigate, back, forward, reload, stop, state, show, hide, bounds, close,
    emit: (event) => {
      if (current.value) {
        current.value = {
          ...current.value,
          loading: event.type === 'loading' ? event.loading : current.value.loading,
          failed: event.type === 'failed' ? event.message : current.value.failed,
          currentUrl: event.type === 'navigated' ? event.url : current.value.currentUrl,
          crashed: event.type === 'crashed' ? true : current.value.crashed,
          unresponsive: event.type === 'unresponsive' ? event.responsive : current.value.unresponsive,
        }
      }
      for (const listener of [...listeners]) listener(event)
    },
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('BrowserPanel（W5.3 地址栏与导航控制）', () => {
  it('挂载即挂载宿主视图（surfaceShow 收到 descriptor 与 bounds），卸载只摘除', async () => {
    const fake = makeApi(makeState())
    const onRequestClose = vi.fn()

    const { unmount } = render(<BrowserPanel api={fake.api} descriptor={DESCRIPTOR} active onRequestClose={onRequestClose} />)

    await waitFor(() => expect(fake.show).toHaveBeenCalledTimes(1))
    const [descriptor, bounds] = fake.show.mock.calls[0] as [SurfaceDescriptor, ViewBounds]
    expect(descriptor).toMatchObject({ id: 'browser-1', providerId: 'browser', kind: 'webcontents' })
    expect(bounds).toMatchObject({ width: 0, height: 0 })
    expect(fake.close).not.toHaveBeenCalled()

    unmount()
    expect(fake.hide).toHaveBeenCalled()
  })

  it('active=false 挂载时即隐藏视图（标签切换不销毁）', () => {
    const fake = makeApi(makeState())
    render(<BrowserPanel api={fake.api} descriptor={DESCRIPTOR} active={false} onRequestClose={vi.fn()} />)
    expect(fake.show).not.toHaveBeenCalled()
    expect(fake.hide).toHaveBeenCalledWith('browser-1')
  })

  it('地址栏提交经 browserNavigate；成功后输入框同步当前 URL', async () => {
    const fake = makeApi(makeState())
    render(<BrowserPanel api={fake.api} descriptor={DESCRIPTOR} active onRequestClose={vi.fn()} />)
    const address = screen.getByPlaceholderText('输入 http/https 地址') as HTMLInputElement
    await waitFor(() => expect(address.value).toBe('https://example.com/'))

    fireEvent.change(address, { target: { value: 'https://example.com/a' } })
    fireEvent.click(screen.getByRole('button', { name: '前往' }))

    await waitFor(() => expect(fake.navigate).toHaveBeenCalledTimes(1))
    expect(fake.navigate.mock.calls[0]?.[0]).toBe('browser-1')
    expect(fake.navigate.mock.calls[0]?.[1]).toMatchObject({ url: 'https://example.com/a' })
    // 成功后提示清空、输入框回到服务端当前 URL
    await waitFor(() => expect(address.value).toBe('https://example.com/'))
  })

  it('非法 URL 由服务端拒绝：回显安全 detail，不产生导航成功态', async () => {
    const fake = makeApi(makeState(), { ok: false, url: '', detail: 'browser 协议不受支持: file:' })
    render(<BrowserPanel api={fake.api} descriptor={DESCRIPTOR} active onRequestClose={vi.fn()} />)
    const address = screen.getByPlaceholderText('输入 http/https 地址') as HTMLInputElement
    await waitFor(() => expect(address.value).toBe('https://example.com/'))

    fireEvent.change(address, { target: { value: 'file:///C:/' } })
    fireEvent.click(screen.getByRole('button', { name: '前往' }))

    await waitFor(() => expect(screen.getByText(/browser 协议不受支持/)).toBeTruthy())
    expect(fake.navigate).toHaveBeenCalledTimes(1)
  })

  it('后退/前进/刷新/停止按钮转发对应通道；按钮可用性跟随会话状态', async () => {
    const fake = makeApi(makeState({ canBack: true, canForward: true, loading: true }))
    const { unmount } = render(<BrowserPanel api={fake.api} descriptor={DESCRIPTOR} active onRequestClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByTitle('后退').getAttribute('disabled')).toBeNull())

    fireEvent.click(screen.getByTitle('后退'))
    fireEvent.click(screen.getByTitle('前进'))
    fireEvent.click(screen.getByTitle('刷新'))
    fireEvent.click(screen.getByTitle('停止'))
    await waitFor(() => {
      expect(fake.back).toHaveBeenCalledWith('browser-1')
      expect(fake.forward).toHaveBeenCalledWith('browser-1')
      expect(fake.reload).toHaveBeenCalledWith('browser-1')
      expect(fake.stop).toHaveBeenCalledWith('browser-1')
    })
    unmount()

    // 无页面（currentUrl=null）时：← → ⟳ ⏹ 全部禁用
    const empty = makeApi(makeState({ currentUrl: null }))
    render(<BrowserPanel api={empty.api} descriptor={DESCRIPTOR} active onRequestClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByTitle('后退').getAttribute('disabled')).not.toBeNull()
      expect(screen.getByTitle('前进').getAttribute('disabled')).not.toBeNull()
      expect(screen.getByTitle('刷新').getAttribute('disabled')).not.toBeNull()
      expect(screen.getByTitle('停止').getAttribute('disabled')).not.toBeNull()
    })
  })

  it('loading 事件驱动进度条与停止按钮', async () => {
    const fake = makeApi(makeState())
    render(<BrowserPanel api={fake.api} descriptor={DESCRIPTOR} active onRequestClose={vi.fn()} />)

    fake.emit({ type: 'loading', id: 'browser-1', loading: true })
    await waitFor(() => expect(screen.getByTitle('停止').getAttribute('disabled')).toBeNull())

    fake.emit({ type: 'loading', id: 'browser-1', loading: false })
    await waitFor(() => expect(screen.getByTitle('停止').getAttribute('disabled')).not.toBeNull())
  })

  it('failed 事件：提示显示服务端净化文案，提供重试/关闭标签', async () => {
    const fake = makeApi(makeState())
    const onRequestClose = vi.fn()
    render(<BrowserPanel api={fake.api} descriptor={DESCRIPTOR} active onRequestClose={onRequestClose} />)

    fake.emit({ type: 'failed', id: 'browser-1', errorCode: -3, message: '导航被安全策略拒绝' })
    await waitFor(() => expect(screen.getByText(/导航被安全策略拒绝/)).toBeTruthy())
    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '关闭标签' })).toBeTruthy()

    // 重试 → reload
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    await waitFor(() => expect(fake.reload).toHaveBeenCalledWith('browser-1'))

    // 关闭标签 → 交回壳层（面板不销毁会话）
    fake.emit({ type: 'crashed', id: 'browser-1' })
    await waitFor(() => expect(screen.getByText(/页面已崩溃/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '关闭标签' }))
    expect(onRequestClose).toHaveBeenCalledTimes(1)
  })

  it('页面事件只作用于本 descriptor 的会话', async () => {
    const fake = makeApi(makeState())
    render(<BrowserPanel api={fake.api} descriptor={DESCRIPTOR} active onRequestClose={vi.fn()} />)
    fake.emit({ type: 'failed', id: 'browser-2', errorCode: -1, message: '其他标签失败' })
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(screen.queryByText(/其他标签失败/)).toBeNull()
  })

  it('permission-denied 事件：呈现脱敏拒绝文案（origin+类型）', async () => {
    const fake = makeApi(makeState())
    render(<BrowserPanel api={fake.api} descriptor={DESCRIPTOR} active onRequestClose={vi.fn()} />)
    fake.emit({ type: 'permission-denied', id: 'browser-1', origin: 'https://example.com', permission: 'geolocation' })
    await waitFor(() =>
      expect(screen.getByText(/已拒绝 https:\/\/example\.com 的 geolocation 权限请求/)).toBeTruthy(),
    )
    // 拒绝事件不驱动导航/历史状态变化
    expect(fake.reload).not.toHaveBeenCalled()
  })
})
