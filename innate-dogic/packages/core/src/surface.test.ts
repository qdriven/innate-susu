import { describe, expect, it } from 'vitest'
import { SurfaceRegistry } from './surface'
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
