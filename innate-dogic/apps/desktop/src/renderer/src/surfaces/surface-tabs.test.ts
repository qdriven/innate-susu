import { describe, expect, it } from 'vitest'
import { SurfaceTabs } from './surface-tabs'
import type { SurfaceStorage } from './surface-tabs'

class MemoryStorage implements SurfaceStorage {
  private readonly map = new Map<string, string>()

  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }

  raw(key: string): string | null {
    return this.map.get(key) ?? null
  }
}

const harness = {
  id: 'harness', providerId: 'harness', kind: 'webcontents' as const, title: 'DeepSeek Harness',
}
const consoleSurface = {
  id: 'magpie-console', providerId: 'magpie-console', kind: 'webcontents' as const, title: 'magpie 控制台',
}
const file = {
  id: 'file:index.ts', providerId: 'workspace-file', kind: 'document' as const, title: 'index.ts',
  workspaceId: '/workspace', capabilities: ['workspace:read' as const],
}

describe('W1c SurfaceTabs 生命周期', () => {
  it('open/activate/deactivate/close 与共享 Registry 语义一致', () => {
    const tabs = new SurfaceTabs({ key: 'tabs', storage: new MemoryStorage() })
    tabs.open(harness)
    tabs.open(consoleSurface)
    tabs.activate(harness.id)
    expect(tabs.active()?.id).toBe('harness')

    tabs.deactivate(harness.id)
    expect(tabs.active()).toBeUndefined()
    expect(tabs.has(harness.id)).toBe(true)

    tabs.close(harness.id)
    expect(tabs.has(harness.id)).toBe(false)
    expect(tabs.list().map((surface) => surface.id)).toEqual(['magpie-console'])
  })

  it('关闭激活项后激活剩下的最后一个', () => {
    const tabs = new SurfaceTabs({ key: 'tabs', storage: new MemoryStorage() })
    tabs.open(harness)
    tabs.open(consoleSurface)
    tabs.activate(consoleSurface.id)
    tabs.close(consoleSurface.id)
    expect(tabs.active()?.id).toBe('harness')
  })

  it('重复 id 不产生第二条：同 provider 更新标题，换 provider 显式失败', () => {
    const tabs = new SurfaceTabs({ key: 'tabs', storage: new MemoryStorage() })
    tabs.open(harness)
    tabs.open({ ...harness, title: 'Harness（已连接）' })
    expect(tabs.list()).toHaveLength(1)
    expect(tabs.get('harness')?.title).toBe('Harness（已连接）')
    expect(() => tabs.open({ ...harness, providerId: 'magpie-console' })).toThrow('已被其他 provider 占用')
  })

  it('removeProvider 只摘除该 provider 的标签，其它标签与激活项保留', () => {
    const tabs = new SurfaceTabs({ key: 'tabs', storage: new MemoryStorage() })
    tabs.open(harness)
    tabs.open(consoleSurface)
    tabs.activate(harness.id)
    const removed = tabs.removeProvider('magpie-console')
    expect(removed).toEqual(['magpie-console'])
    expect(tabs.list().map((surface) => surface.id)).toEqual(['harness'])
    expect(tabs.active()?.id).toBe('harness')
  })
})

describe('W1c SurfaceTabs 快照与持久化', () => {
  it('快照只保存安全字段，URL/token/运行时对象不进入状态', () => {
    const storage = new MemoryStorage()
    const tabs = new SurfaceTabs({ key: 'tabs', storage })
    tabs.open({
      ...harness,
      url: 'http://127.0.0.1:4100/?token=secret',
      webContents: { id: 'wc-1' },
      child: { pid: 42 },
    } as never)
    const raw = storage.raw('tabs') ?? ''
    expect(raw).not.toContain('secret')
    expect(raw).not.toContain('token')
    expect(raw).not.toContain('webContents')
    expect(raw).not.toContain('pid')
    expect(tabs.snapshot()).toMatchObject({ version: 1, surfaces: [{ id: 'harness', kind: 'webcontents' }] })
  })

  it('激活项以安全 id 持久化，新实例可恢复', () => {
    const storage = new MemoryStorage()
    const first = new SurfaceTabs({ key: 'tabs', storage })
    first.open(harness)
    first.open(file)
    first.activate(file.id)

    const second = new SurfaceTabs({ key: 'tabs', storage })
    expect(second.list().map((surface) => surface.id)).toEqual(['harness', 'file:index.ts'])
    expect(second.active()?.id).toBe('file:index.ts')
  })

  it('旧 v1 快照（无 workspaceId/capabilities）可读', () => {
    const storage = new MemoryStorage()
    storage.setItem('tabs', JSON.stringify({
      version: 1,
      activeId: 'harness',
      surfaces: [{ id: 'harness', providerId: 'harness', kind: 'webcontents', title: 'DeepSeek Harness' }],
    }))
    const tabs = new SurfaceTabs({ key: 'tabs', storage })
    expect(tabs.list()).toHaveLength(1)
    expect(tabs.active()?.id).toBe('harness')
  })

  it('非法版本与非法 descriptor 安全回退：丢弃坏快照且不抛异常', () => {
    const storage = new MemoryStorage()
    storage.setItem('tabs', JSON.stringify({ version: 2, surfaces: [] }))
    const tabs = new SurfaceTabs({ key: 'tabs', storage })
    expect(tabs.list()).toEqual([])
    expect(storage.raw('tabs')).toBeNull()

    storage.setItem('tabs', JSON.stringify({
      version: 1,
      surfaces: [{ id: 'x', providerId: 'p', kind: 'webcontents', title: 'x' }, { id: 'x', providerId: 'p', kind: 'webcontents', title: 'x' }],
    }))
    expect(tabs.restore(JSON.parse(storage.raw('tabs') ?? '{}'))).toBe(false)
    expect(tabs.list()).toEqual([])
  })

  it('restore 遇到坏数据不改变已有标签状态', () => {
    const tabs = new SurfaceTabs({ key: 'tabs', storage: new MemoryStorage() })
    tabs.open(harness)
    expect(tabs.restore({ version: 1, surfaces: [{ id: 'broken' }] })).toBe(false)
    expect(tabs.list().map((surface) => surface.id)).toEqual(['harness'])
  })
})
