import { describe, expect, it } from 'vitest'
import { SurfaceRegistry, parseSurfaceDescriptor } from './surface'
import type { SurfaceDescriptor, SurfaceSnapshot } from './surface'

const file: SurfaceDescriptor = {
  id: 'file:src/index.ts',
  providerId: 'workspace-file',
  kind: 'document',
  title: 'index.ts',
  workspaceId: '/workspace',
  capabilities: ['workspace:read'],
}
const harness: SurfaceDescriptor = {
  id: 'harness',
  providerId: 'harness',
  kind: 'webcontents',
  title: 'DeepSeek Harness',
  capabilities: ['agent:tools'],
}

describe('SurfaceRegistry', () => {
  it(' separates activate/deactivate from close', () => {
    const registry = new SurfaceRegistry()
    registry.open(harness)
    registry.activate(harness.id)
    registry.deactivate(harness.id)
    expect(registry.active()).toBeUndefined()
    expect(registry.get(harness.id)?.status).toBe('open')
    registry.close(harness.id)
    expect(registry.get(harness.id)?.status).toBe('closed')
    expect(registry.list()).toEqual([])
  })

  it('activates the last remaining surface when the active one closes', () => {
    const registry = new SurfaceRegistry()
    registry.open(file)
    registry.open(harness)
    registry.activate(file.id)
    registry.activate(harness.id)
    registry.close(harness.id)
    expect(registry.active()?.id).toBe(file.id)
  })

  it('round-trips a versioned snapshot without runtime secrets', () => {
    const registry = new SurfaceRegistry()
    registry.open({ ...harness, url: 'http://secret/?token=value' } as SurfaceDescriptor)
    registry.open(file)
    registry.activate(file.id)
    const snapshot = registry.snapshot()
    expect(JSON.stringify(snapshot)).not.toContain('secret')
    const restored = new SurfaceRegistry()
    restored.restore(snapshot)
    expect(restored.list()).toHaveLength(2)
    expect(restored.active()?.id).toBe(file.id)
  })

  it('reopens a closed descriptor with updated metadata', () => {
    const registry = new SurfaceRegistry()
    registry.open(file)
    registry.close(file.id)
    registry.open({ ...file, title: 'renamed.ts' })
    expect(registry.get(file.id)).toMatchObject({ status: 'open', title: 'renamed.ts' })
  })

  it('rejects invalid snapshots atomically', () => {
    const registry = new SurfaceRegistry()
    registry.open(file)
    const invalid: SurfaceSnapshot = { version: 1, activeId: 'missing', surfaces: [file] }
    expect(() => registry.restore(invalid)).toThrow('activeId')
    expect(registry.list().map((surface) => surface.id)).toEqual([file.id])
  })
})

describe('W1c Surface 契约加固', () => {
  it('重复 id 只保留一条；换 provider 复用同一 id 显式失败', () => {
    const registry = new SurfaceRegistry()
    registry.open(file)
    registry.open({ ...file, title: 'index.ts（已改）' })
    expect(registry.list()).toHaveLength(1)
    expect(registry.get(file.id)?.title).toBe('index.ts（已改）')
    expect(() => registry.open({ ...file, providerId: 'other-provider' })).toThrow('已被其他 provider 占用')
  })

  it('白名单解析拒绝非法 descriptor，额外字段被丢弃', () => {
    expect(() => parseSurfaceDescriptor(null)).toThrow('必须是对象')
    expect(() => parseSurfaceDescriptor({ id: '', providerId: 'p', kind: 'webcontents', title: 't' })).toThrow('id')
    expect(() => parseSurfaceDescriptor({ id: 'i', providerId: 'p', kind: 'terminal-x', title: 't' })).toThrow('kind')
    expect(() => parseSurfaceDescriptor({ id: 'i', providerId: 'p', kind: 'webcontents', title: 't', capabilities: ['x:y'] })).toThrow('capability')
    const parsed = parseSurfaceDescriptor({
      id: 'i', providerId: 'p', kind: 'webcontents', title: 't',
      url: 'http://x/?token=secret', webContents: { id: 1 }, child: { pid: 2 },
    })
    expect(parsed).toEqual({ id: 'i', providerId: 'p', kind: 'webcontents', title: 't' })
    expect(JSON.stringify(parsed)).not.toContain('secret')
  })

  it('非法版本与非法结构安全回退：拒绝且不改动已有状态', () => {
    const registry = new SurfaceRegistry()
    registry.open(file)
    expect(() => registry.restore({ version: 2, surfaces: [] })).toThrow('版本')
    expect(() => registry.restore({ version: 1, surfaces: [{ id: 'x' }] })).toThrow()
    expect(() => registry.restore({ version: 1, surfaces: [file, file] })).toThrow('重复 id')
    expect(registry.list().map((surface) => surface.id)).toEqual([file.id])
  })

  it('旧 v1 快照（缺省可选元数据）可读', () => {
    const registry = new SurfaceRegistry()
    registry.restore({
      version: 1,
      activeId: 'harness',
      surfaces: [{ id: 'harness', providerId: 'harness', kind: 'webcontents', title: 'DeepSeek Harness' }],
    })
    expect(registry.list()).toHaveLength(1)
    expect(registry.active()?.id).toBe('harness')
  })
})
