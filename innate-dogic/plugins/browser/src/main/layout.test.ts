import { describe, expect, it } from 'vitest'
import {
  BROWSER_LAYOUT_VERSION,
  BrowserLayoutStorage,
  buildBrowserLayoutSnapshot,
  isSensitiveBrowserUrl,
  parseBrowserLayoutSnapshot,
  BrowserLayoutStore,
  DEFAULT_BROWSER_LAYOUT_KEY,
} from './layout.js'

/** 内存持久化后端。 */
function memStorage(): { storage: BrowserLayoutStorage; data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    storage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value) },
      removeItem: (key: string) => { data.delete(key) },
    },
  }
}

interface MakeStoreResult {
  store: BrowserLayoutStore
  data: Map<string, string>
  storage: BrowserLayoutStorage
}

function makeStore(storage?: BrowserLayoutStorage): MakeStoreResult {
  const ctx = storage === undefined ? memStorage() : { data: new Map(), storage }
  const store = new BrowserLayoutStore({ storage: ctx.storage, key: 'test-layout' })
  return { store, ...ctx }
}

describe('isSensitiveBrowserUrl（W5.6 敏感 URL 判定）', () => {
  it('普通 http/https URL 不敏感', () => {
    expect(isSensitiveBrowserUrl('https://example.com/')).toBe(false)
    expect(isSensitiveBrowserUrl('http://example.com/path?q=1')).toBe(false)
  })

  it('内嵌凭据敏感', () => {
    expect(isSensitiveBrowserUrl('http://user:pass@example.com/')).toBe(true)
  })

  it('token/key 等敏感 query 参数敏感', () => {
    expect(isSensitiveBrowserUrl('https://example.com/?token=abc')).toBe(true)
    expect(isSensitiveBrowserUrl('https://example.com/?access_token=abc')).toBe(true)
    expect(isSensitiveBrowserUrl('https://example.com/?apikey=abc')).toBe(true)
    expect(isSensitiveBrowserUrl('https://example.com/?password=abc')).toBe(true)
  })

  it('非 http/https 协议与非法 URL 敏感', () => {
    expect(isSensitiveBrowserUrl('file:///C:/')).toBe(true)
    expect(isSensitiveBrowserUrl('javascript:alert(1)')).toBe(true)
    expect(isSensitiveBrowserUrl('not a url')).toBe(true)
  })
})

describe('buildBrowserLayoutSnapshot（构建 + 敏感 URL 过滤）', () => {
  it('保留普通 URL、过滤敏感 URL', () => {
    const snapshot = buildBrowserLayoutSnapshot([
      { id: 'browser-1', url: 'https://example.com/' },
      { id: 'browser-2', url: 'https://example.com/?token=abc' },
    ], 'browser-1')
    expect(snapshot.version).toBe(BROWSER_LAYOUT_VERSION)
    expect(snapshot.tabs).toEqual([{ id: 'browser-1', url: 'https://example.com/' }])
    expect(snapshot.activeId).toBe('browser-1')
  })

  it('activeId 指向被过滤标签时剔除', () => {
    const snapshot = buildBrowserLayoutSnapshot([
      { id: 'browser-1', url: 'https://example.com/?token=x' },
    ], 'browser-1')
    expect(snapshot.activeId).toBeUndefined()
  })
})

describe('parseBrowserLayoutSnapshot（版本兼容与结构校验）', () => {
  it('版本不兼容抛错', () => {
    expect(() => parseBrowserLayoutSnapshot({ version: 99, tabs: [] })).toThrow(/版本不兼容/)
  })

  it('结构非法抛错', () => {
    expect(() => parseBrowserLayoutSnapshot({ version: BROWSER_LAYOUT_VERSION })).toThrow()
    expect(() => parseBrowserLayoutSnapshot('nope')).toThrow()
  })

  it('重复 id 抛错', () => {
    expect(() => parseBrowserLayoutSnapshot({
      version: BROWSER_LAYOUT_VERSION,
      tabs: [{ id: 'browser-1', url: 'https://example.com/' }, { id: 'browser-1', url: 'https://example.com/' }],
    })).toThrow(/重复 id/)
  })

  it('解析时兜底过滤快照内敏感 URL', () => {
    const parsed = parseBrowserLayoutSnapshot({
      version: BROWSER_LAYOUT_VERSION,
      tabs: [
        { id: 'browser-1', url: 'https://example.com/' },
        { id: 'browser-2', url: 'https://example.com/?secret=x' },
      ],
    })
    expect(parsed.tabs).toEqual([{ id: 'browser-1', url: 'https://example.com/' }])
  })
})

describe('BrowserLayoutStore（保存/消费/关闭/快照）', () => {
  it('保存并持久化普通 URL；敏感 URL 拒绝且删除已有记录', () => {
    const { store, data } = makeStore()
    store.saveUrl('browser-1', 'https://example.com/')
    expect(data.get('test-layout')).toContain('example.com')
    expect(store.consume('browser-1')).toBe('https://example.com/')
    // consume 后不再有记录
    expect(store.consume('browser-1')).toBeUndefined()
    // 敏感 URL：保存即删除
    store.saveUrl('browser-2', 'https://example.com/')
    store.saveUrl('browser-2', 'https://example.com/?token=x')
    expect(store.consume('browser-2')).toBeUndefined()
  })

  it('消费取出并移除（恢复后不再重复重导航）', () => {
    const { store } = makeStore()
    store.saveUrl('browser-1', 'https://example.com/')
    expect(store.consume('browser-1')).toBe('https://example.com/')
    expect(store.consume('browser-1')).toBeUndefined()
  })

  it('clear 删除标签布局记录并清理 activeId', () => {
    const { store } = makeStore()
    store.saveUrl('browser-1', 'https://example.com/')
    store.setActive('browser-1')
    store.clear('browser-1')
    expect(store.consume('browser-1')).toBeUndefined()
    expect(store.snapshot().activeId).toBeUndefined()
  })

  it('恢复：重新构建布局（用户可见重导航由面板触发）', () => {
    const { store } = makeStore()
    store.saveUrl('browser-1', 'https://example.com/')
    store.saveUrl('browser-2', 'https://example.com/?token=x')
    store.setActive('browser-1')
    const snap = store.snapshot()
    // 新建 store 从同一存储恢复
    const { store: restored } = makeStoreFrom(snap, DEFAULT_BROWSER_LAYOUT_KEY)
    expect(restored.consume('browser-1')).toBe('https://example.com/')
    expect(restored.consume('browser-2')).toBeUndefined()
  })

  it('版本不兼容：构造时丢弃旧快照安全回退', () => {
    const data = new Map<string, string>([
      ['test-layout', JSON.stringify({ version: 99, tabs: [] })],
    ])
    const store = new BrowserLayoutStore({
      storage: {
        getItem: (k) => data.get(k) ?? null,
        setItem: (k, v) => { data.set(k, v) },
        removeItem: (k) => { data.delete(k) },
      },
      key: 'test-layout',
    })
    expect(store.snapshot().tabs).toEqual([])
    expect(data.get('test-layout')).toBeUndefined()
  })
})

/** 用已构建快照作为初始存储内容构造 store。 */
function makeStoreFrom(snapshot: unknown, key = 'test-layout'): MakeStoreResult {
  const data = new Map<string, string>([
    [key, JSON.stringify(snapshot)],
  ])
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v) },
    removeItem: (k: string) => { data.delete(k) },
  }
  const store = new BrowserLayoutStore({ storage, key })
  return { store, data, storage }
}
