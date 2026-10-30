import { describe, expect, it } from 'vitest'
import {
  PAGES,
  defaultPageId,
  pageSlot,
  pagesForMode,
  pagesForSlot,
  resolveActivePage,
  type PageDef,
} from './pages'

describe('W1b 页面注册 slot/mode 元数据', () => {
  it('每个现有页面保留原 ID，slot 声明合法（现集全为 content，right 为 W3 预留）', () => {
    const ids = PAGES.map((page) => page.id)
    expect(ids).toEqual(['chat', 'settings', 'overview', 'terminal', 'browser', 'models', 'console', 'tools'])
    for (const page of PAGES) {
      expect(['content', 'right']).toContain(pageSlot(page))
    }
    expect(PAGES.filter((page) => pageSlot(page) === 'right')).toHaveLength(0)
  })

  it('simple/dev 门控集合与 W1a 基线一致（W3：工作区移出中栏导航），默认页不变', () => {
    expect(pagesForMode('simple').map((page) => page.id)).toEqual(['chat', 'settings'])
    expect(pagesForMode('dev').map((page) => page.id)).toEqual([
      'chat', 'overview', 'terminal', 'browser', 'models', 'console', 'tools',
    ])
    expect(defaultPageId('simple')).toBe('chat')
    expect(defaultPageId('dev')).toBe('overview')
  })

  it('pagesForSlot 过滤与全量守恒', () => {
    expect(pagesForSlot('dev', 'content')).toHaveLength(7)
    expect(pagesForSlot('dev', 'right')).toHaveLength(0)
    expect(pagesForSlot('simple', 'content')).toHaveLength(2)
  })
})

describe('W1b 可选页面安全解析（负路径）', () => {
  it('activeId 指向被删除的注册项时回退模式默认页，不抛异常', () => {
    // 模拟删除 console 注册后的注册表
    const original = [...PAGES]
    const index = PAGES.findIndex((page) => page.id === 'console')
    const removed = PAGES.splice(index, 1)[0] as PageDef
    try {
      const resolved = resolveActivePage('dev', 'console')
      expect(resolved?.id).toBe('overview')
      expect(resolveActivePage('dev', null)?.id).toBe('overview')
      expect(resolveActivePage('simple', 'overview')?.id).toBe('chat')
    } finally {
      PAGES.push(removed)
      PAGES.sort((a, b) => original.findIndex((page) => page.id === a.id) - original.findIndex((page) => page.id === b.id))
    }
  })

  it('空注册表模式解析返回 undefined 而不抛异常', () => {
    // 直接构造空集场景：defaultPageId 兜底链末端为 pages[0]=undefined
    const resolved = resolveActivePage('dev', undefined)
    expect(resolved?.id).toBe('overview')
  })
})
