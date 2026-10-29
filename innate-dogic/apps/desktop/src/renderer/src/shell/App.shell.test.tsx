import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

// App 依赖的窗口 API 全量 mock（W1b F2-V1：窗口调用、轮询一次、卸载清理）
const apiMocks = vi.hoisted(() => ({
  getMode: vi.fn(async (): Promise<'dev' | 'simple' | null> => 'dev'),
  setMode: vi.fn(async () => true),
  getStatus: vi.fn(async () => ({
    gateway: { running: true, baseUrl: 'http://127.0.0.1:3425', version: '0.1.1230', modelsCount: 34 },
    webUi: { running: true, url: 'http://127.0.0.1:3430' },
    dsh: { installed: true, wiredFiles: ['cordis.patch.yml'], hasGatewayKey: true, defaultModel: 'm' },
  })),
  onHarnessState: vi.fn(() => () => {}),
  getHarnessState: vi.fn(async () => ({ phase: 'idle' as const, message: 'Harness 未运行' })),
  launchHarness: vi.fn(async () => ({ ok: true, port: 12345, url: 'http://127.0.0.1:12345', detail: 'ok' })),
  stopHarness: vi.fn(async () => true),
  surfaceShow: vi.fn(async () => ({ ok: true })),
  surfaceHide: vi.fn(async () => true),
  surfaceBounds: vi.fn(async () => true),
  surfaceClose: vi.fn(async () => true),
  winIsMaximized: vi.fn(async () => false),
  onWinMaximized: vi.fn(() => () => {}),
  winMin: vi.fn(async () => true),
  winToggleMax: vi.fn(async () => true),
  winClose: vi.fn(async () => true),
  openMagpieWeb: vi.fn(async () => true),
  openLogs: vi.fn(async () => true),
  startMagpie: vi.fn(async () => ({ ok: true, detail: 'ok' })),
  runChecks: vi.fn(async () => []),
  getModels: vi.fn(async () => ({ ok: true, models: [], detail: '' })),
  smokeTest: vi.fn(async () => ({ ok: true, detail: '' })),
  disconnectDsh: vi.fn(async () => ({ ok: true, detail: '' })),
  revealDshHome: vi.fn(async () => ''),
}))

vi.mock('../api', () => ({ api: apiMocks }))
vi.mock('../plugin-registry', () => ({
  WorkspacePanel: () => <div data-testid="workspace-panel">workspace</div>,
}))

import App from '../App'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('W1b App 壳组合（T2/T3）', () => {
  it('dev：三栏结构（Sidebar 原语 + ContentArea + RightPanelHost），默认页总览，窗口控制走原有 API', async () => {
    const { container } = render(<App />)
    await waitFor(() => expect(screen.getByTitle('工作区')).toBeTruthy())
    expect(container.querySelector('[data-sidebar="sidebar"]')).not.toBeNull()
    expect(container.querySelector('.content')).not.toBeNull()
    expect(screen.getByTestId('right-panel')).not.toBeNull()
    expect((container.querySelector('.nav-item.current') as HTMLElement | null)?.title).toBe('总览')
    // 被动 effect（窗口状态）在负载下可能晚一拍：等待而非瞬时断言
    await waitFor(() => expect(apiMocks.winIsMaximized).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: '最小化' }))
    expect(apiMocks.winMin).toHaveBeenCalled()
  })

  it('点击导航切换既有页面；卸载时清理轮询订阅（F2-V1）', async () => {
    const { unmount } = render(<App />)
    await waitFor(() => expect(screen.getByTitle('工作区')).toBeTruthy())
    fireEvent.click(screen.getByTitle('工作区'))
    await waitFor(() => expect(screen.getByTestId('workspace-panel')).not.toBeNull())
    const intervalsBefore = (apiMocks.getStatus.mock.calls.length as number) > 0
    expect(intervalsBefore).toBe(true)
    unmount()
    const callsAtUnmount = apiMocks.getStatus.mock.calls.length
    await new Promise((resolve) => setTimeout(resolve, 30))
    // 卸载后轮询不再触发
    expect(apiMocks.getStatus.mock.calls.length).toBe(callsAtUnmount)
  })

  it('simple：右栏不渲染、开发入口隐藏，对话默认页（F1-V3/T3-V3）', async () => {
    apiMocks.getMode.mockResolvedValueOnce('simple')
    const { container } = render(<App />)
    await waitFor(() => expect(screen.queryByTitle('设置')).not.toBeNull())
    expect(screen.queryByTestId('right-panel')).toBeNull()
    expect(screen.queryByTitle('工作区')).toBeNull()
    await waitFor(() => {
      expect((container.querySelector('.nav-item[data-current="true"]') as HTMLElement | null)?.title).toBe('对话')
    })
  })

  it('RightPanelHost 可拆卸：rightPanel=false 时导航与页面不受影响（T3 F1-V2）', async () => {
    const { container } = render(<App rightPanel={false} />)
    await waitFor(() => expect(screen.getByTitle('工作区')).toBeTruthy())
    expect(screen.queryByTestId('right-panel')).toBeNull()
    fireEvent.click(screen.getByTitle('工作区'))
    await waitFor(() => expect(screen.getByTestId('workspace-panel')).not.toBeNull())
    expect(container.querySelector('.content')).not.toBeNull()
  })
})
