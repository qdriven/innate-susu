import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach } from 'vitest'
import ShellSidebar from './ShellSidebar'
import { pagesForMode } from '../pages'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('W1b ShellSidebar（@innate/ui Sidebar 原语承载）', () => {
  it('消费 @innate/ui Sidebar 原语（data-sidebar 铬面存在），导航按钮保持 .nav-item[title] DOM 契约', () => {
    const { container } = render(
      <ShellSidebar
        pages={pagesForMode('dev')}
        activeId="overview"
        harnessPhase="idle"
        onNavigate={() => {}}
        onSwitchMode={() => {}}
      />,
    )
    expect(container.querySelector('[data-sidebar="sidebar"]')).not.toBeNull()
    const items = screen.getAllByRole('button', { name: /对话|总览|模型|工具/ })
    expect(items).toHaveLength(5)
    for (const item of items) {
      expect(item.className).toContain('nav-item')
      expect(item.title).not.toBe('')
    }
    expect((container.querySelector('.nav-item.current') as HTMLElement | null)?.title).toBe('总览')
  })

  it('simple 只渲染对话/设置，dev 渲染五个入口（W3：工作区迁出中栏导航）', () => {
    const { rerender } = render(
      <ShellSidebar
        pages={pagesForMode('simple')}
        activeId="chat"
        harnessPhase="idle"
        onNavigate={() => {}}
        onSwitchMode={() => {}}
      />,
    )
    expect(screen.getAllByRole('button', { name: /对话|设置/ })).toHaveLength(2)
    rerender(
      <ShellSidebar
        pages={pagesForMode('dev')}
        activeId="overview"
        harnessPhase="running"
        onNavigate={() => {}}
        onSwitchMode={() => {}}
      />,
    )
    expect(screen.getAllByRole('button', { name: /对话|总览|模型|工具/ })).toHaveLength(5)
    // W3：工作区不再是中栏导航项（迁至 dev 右栏常驻 Panel）
    expect(screen.queryByTitle('工作区')).toBeNull()
    expect(screen.queryByTitle('设置')).toBeNull()
    expect(containerDotOk(document)).toBe(true)
  })

  it('点击导航回调页面 id；模式切换按钮回调', () => {
    const onNavigate = vi.fn()
    const onSwitchMode = vi.fn()
    render(
      <ShellSidebar
        pages={pagesForMode('dev')}
        activeId="overview"
        harnessPhase="idle"
        onNavigate={onNavigate}
        onSwitchMode={onSwitchMode}
      />,
    )
    fireEvent.click(screen.getByTitle('工具'))
    expect(onNavigate).toHaveBeenCalledWith('tools')
    fireEvent.click(screen.getByTitle('切换模式'))
    expect(onSwitchMode).toHaveBeenCalledTimes(1)
  })
})

function containerDotOk(doc: Document): boolean {
  return doc.querySelector('.sidebar .dot.ok') !== null
}
