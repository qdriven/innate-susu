import { describe, expect, it, vi } from 'vitest'
import { SurfaceProviderRegistry, removeSurfaceProvider } from './provider-registry'
import type { SurfaceProvider } from './provider-registry'
import { SurfaceTabs } from './surface-tabs'

function provider(id: string, extra: Partial<SurfaceProvider> = {}): SurfaceProvider {
  return {
    id,
    kind: 'webcontents',
    View: () => null,
    ...extra,
  }
}

describe('W1c provider 注册表', () => {
  it('重复注册显式失败', () => {
    const registry = new SurfaceProviderRegistry()
    registry.register(provider('harness'))
    expect(() => registry.register(provider('harness'))).toThrow('重复注册')
  })

  it('摘除 provider 只 dispose 自己，其它 provider 不受影响', () => {
    const registry = new SurfaceProviderRegistry()
    const harnessDispose = vi.fn()
    const consoleDispose = vi.fn()
    registry.register(provider('harness', { dispose: harnessDispose }))
    registry.register(provider('magpie-console', { dispose: consoleDispose }))

    registry.unregister('magpie-console')
    expect(consoleDispose).toHaveBeenCalledTimes(1)
    expect(harnessDispose).not.toHaveBeenCalled()
    expect(registry.get('magpie-console')).toBeUndefined()
    expect(registry.get('harness')).toBeDefined()
    expect(registry.isDisabled('magpie-console')).toBe(true)
  })

  it('单个 provider 清理抛错不影响其它 provider', () => {
    const registry = new SurfaceProviderRegistry()
    const okDispose = vi.fn()
    registry.register(provider('broken', {
      dispose: () => { throw new Error('dispose 失败') },
    }))
    registry.register(provider('harness', { dispose: okDispose }))
    expect(() => registry.unregister('broken')).not.toThrow()
    expect(okDispose).not.toHaveBeenCalled()
    expect(registry.get('harness')).toBeDefined()
  })

  it('removeSurfaceProvider 同时摘掉标签与 provider，其它标签保留', () => {
    const registry = new SurfaceProviderRegistry()
    const consoleDispose = vi.fn()
    registry.register(provider('harness'))
    registry.register(provider('magpie-console', { dispose: consoleDispose }))
    const tabs = new SurfaceTabs({ key: 'tabs', storage: null })
    tabs.open({ id: 'harness', providerId: 'harness', kind: 'webcontents', title: 'Harness' })
    tabs.open({ id: 'magpie-console', providerId: 'magpie-console', kind: 'webcontents', title: '控制台' })
    tabs.activate('harness')

    const removed = removeSurfaceProvider(registry, tabs, 'magpie-console')
    expect(removed).toEqual(['magpie-console'])
    expect(consoleDispose).toHaveBeenCalledTimes(1)
    expect(tabs.list().map((surface) => surface.id)).toEqual(['harness'])
    expect(tabs.active()?.id).toBe('harness')
    expect(registry.get('harness')).toBeDefined()
  })
})
