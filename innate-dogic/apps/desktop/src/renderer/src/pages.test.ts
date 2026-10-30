import { describe, expect, it } from 'vitest'
import { pagesForMode } from './pages'

describe('W1a 页面注册基线', () => {
  it('simple 只保留对话与设置，默认落点为对话', () => {
    const pages = pagesForMode('simple')
    expect(pages.map((page) => page.id)).toEqual(['chat', 'settings'])
    expect(pages[0]?.id).toBe('chat')
  })

  it('dev 保留七个公开页面（W3 工作区移出中栏导航 + W4 终端 + W5 浏览器）及总览默认落点', () => {
    const pages = pagesForMode('dev')
    expect(pages.map((page) => page.id)).toEqual([
      'chat', 'overview', 'terminal', 'browser', 'models', 'console', 'tools',
    ])
    expect(pages.some((page) => page.id === 'overview')).toBe(true)
    expect(pages.some((page) => page.id === 'settings')).toBe(false)
    // W3：工作区不再是中栏导航页，而是 dev 模式常驻右栏 Panel
    expect(pages.some((page) => page.id === 'workspace')).toBe(false)
  })

  it('两种模式共享对话页面但门控集合互不污染', () => {
    const simple = pagesForMode('simple').map((page) => page.id)
    const dev = pagesForMode('dev').map((page) => page.id)
    expect(simple).toContain('chat')
    expect(dev).toContain('chat')
    expect(simple.filter((id) => id !== 'chat')).toEqual(['settings'])
    expect(dev).toHaveLength(7)
  })
})
