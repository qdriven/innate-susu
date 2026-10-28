import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const apiMocks = vi.hoisted(() => ({
  winIsMaximized: vi.fn(async () => false),
  onWinMaximized: vi.fn(() => () => {}),
  winMin: vi.fn(async () => undefined),
  winToggleMax: vi.fn(async () => undefined),
  winClose: vi.fn(async () => undefined),
  openMagpieWeb: vi.fn(async () => true),
  openLogs: vi.fn(async () => ''),
}))
vi.mock('../api', () => ({ api: apiMocks }))

import TitlebarStrip from './TitlebarStrip'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('W1a TitlebarStrip', () => {
  it('包含品牌、空标签槽、右栏开关位与空状态槽，不接 W2 pill', () => {
    const { container } = render(<TitlebarStrip mode="dev" pageLabel="总览" onSwitchMode={() => {}} />)
    expect(screen.getByTestId('titlebar-brand').textContent).toContain('Innate')
    expect(container.querySelector('#titlebar-tabs')?.childNodes).toHaveLength(0)
    expect(container.querySelector('#titlebar-right-panel-slot')).not.toBeNull()
    expect(container.querySelector('#titlebar-status-slot')?.getAttribute('data-empty')).toBe('true')
    expect(container.querySelector('#titlebar-status-slot')?.childNodes).toHaveLength(0)
    expect(screen.queryByText(/magpie/)).toBeNull()
    expect(container.querySelectorAll('.window-controls-btn')).toHaveLength(3)
  })

  it('窗口按钮、双击拖拽区与应用菜单沿用现有行为', () => {
    const onSwitchMode = vi.fn()
    const { container } = render(<TitlebarStrip mode="dev" pageLabel="总览" onSwitchMode={onSwitchMode} />)
    fireEvent.click(screen.getByRole('button', { name: '最小化' }))
    fireEvent.click(screen.getByRole('button', { name: '最大化' }))
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    fireEvent.doubleClick(container.querySelector('#titlebar-tabs')!)
    expect(apiMocks.winMin).toHaveBeenCalledTimes(1)
    expect(apiMocks.winToggleMax).toHaveBeenCalledTimes(2)
    expect(apiMocks.winClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '应用菜单' }))
    expect(screen.getAllByRole('menuitem')).toHaveLength(3)
    fireEvent.click(screen.getByRole('menuitem', { name: '切换到简易使用' }))
    expect(onSwitchMode).toHaveBeenCalledTimes(1)
  })

  it('顶栏控件由共享 Button 渲染，双击按钮不会重复触发最大化', () => {
    render(<TitlebarStrip mode="simple" pageLabel="对话" onSwitchMode={() => {}} />)
    const menu = screen.getByRole('button', { name: '应用菜单' })
    expect(menu.getAttribute('data-slot')).toBe('button')
    fireEvent.doubleClick(menu)
    expect(apiMocks.winToggleMax).not.toHaveBeenCalled()
  })
})
