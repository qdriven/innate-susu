import { describe, expect, it } from 'vitest'
import { pagesForMode } from './pages'

describe('W1a 页面注册基线', () => {
  it('simple 只保留对话与设置，默认落点为对话', () => {
    const pages = pagesForMode('simple')
    expect(pages.map((page) => page.id)).toEqual(['chat', 'settings'])
    expect(pages[0]?.id).toBe('chat')
  })

  it('dev 保留六个公开页面及总览默认落点', () => {
    const pages = pagesForMode('dev')
    expect(pages.map((page) => page.id)).toEqual([
      'chat', 'overview', 'workspace', 'models', 'console', 'tools',
    ])
    expect(pages.some((page) => page.id === 'overview')).toBe(true)
    expect(pages.some((page) => page.id === 'settings')).toBe(false)
  })

  it('两种模式共享对话页面但门控集合互不污染', () => {
    const simple = pagesForMode('simple').map((page) => page.id)
    const dev = pagesForMode('dev').map((page) => page.id)
    expect(simple).toContain('chat')
    expect(dev).toContain('chat')
    expect(simple.filter((id) => id !== 'chat')).toEqual(['settings'])
    expect(dev).toHaveLength(6)
  })
})
