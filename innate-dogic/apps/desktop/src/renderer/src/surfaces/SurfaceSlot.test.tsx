import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import SurfaceSlot from './SurfaceSlot'
import { SurfaceProviderRegistry, removeSurfaceProvider } from './provider-registry'
import { SurfaceTabs } from './surface-tabs'
import type { SurfaceProvider } from './provider-registry'

const harnessDescriptor = {
  id: 'harness', providerId: 'harness', kind: 'webcontents' as const, title: 'DeepSeek Harness',
}
const consoleDescriptor = {
  id: 'magpie-console', providerId: 'magpie-console', kind: 'webcontents' as const, title: 'magpie 控制台',
}

function tabsWith(...descriptors: Array<typeof harnessDescriptor>): SurfaceTabs {
  const tabs = new SurfaceTabs({ key: 'tabs', storage: null })
  for (const descriptor of descriptors) tabs.open(descriptor)
  return tabs
}

function provider(id: string, View: SurfaceProvider['View']): SurfaceProvider {
  return { id, kind: 'webcontents', View }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('W1c 统一 Surface 槽', () => {
  it('渲染安全标签并把切换/关闭交给壳', () => {
    const tabs = tabsWith(harnessDescriptor, consoleDescriptor)
    tabs.activate('harness')
    const registry = new SurfaceProviderRegistry()
    registry.register(provider('harness', () => <div data-testid="harness-view">harness</div>))
    registry.register(provider('magpie-console', () => <div data-testid="console-view">console</div>))
    const onSwitch = vi.fn()
    const onClose = vi.fn()

    render(
      <SurfaceSlot
        tabs={tabs}
        providers={registry}
        fallback={<div data-testid="fallback">fallback</div>}
        onSwitch={onSwitch}
        onClose={onClose}
      />,
    )

    expect(screen.getByTestId('surface-tabs')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'DeepSeek Harness' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByTestId('harness-view')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'magpie 控制台' }))
    expect(onSwitch).toHaveBeenCalledTimes(1)
    expect(onSwitch.mock.calls[0]?.[0]).toMatchObject({ id: 'magpie-console' })

    fireEvent.click(screen.getByLabelText('关闭 magpie 控制台'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('provider 未注册时显示明确错误，其它标签与壳不受影响', () => {
    const tabs = tabsWith(harnessDescriptor, consoleDescriptor)
    tabs.activate('magpie-console')
    const registry = new SurfaceProviderRegistry()
    registry.register(provider('harness', () => <div data-testid="harness-view">harness</div>))
    const onClose = vi.fn()

    render(
      <SurfaceSlot
        tabs={tabs}
        providers={registry}
        fallback={<div data-testid="fallback">fallback</div>}
        onSwitch={() => undefined}
        onClose={onClose}
      />,
    )

    expect(screen.getByTestId('surface-error')).toBeTruthy()
    expect(screen.getByText(/未注册的 provider/)).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'DeepSeek Harness' })).toBeTruthy()
    fireEvent.click(screen.getByLabelText('关闭 magpie 控制台'))
    expect(onClose).toHaveBeenCalled()
  })

  it('摘除 provider 只移除它的标签，Harness 标签与视图继续可用', () => {
    const tabs = tabsWith(harnessDescriptor, consoleDescriptor)
    const registry = new SurfaceProviderRegistry()
    registry.register(provider('harness', () => <div data-testid="harness-view">harness</div>))
    registry.register(provider('magpie-console', () => <div data-testid="console-view">console</div>))
    tabs.activate('harness')

    const { rerender } = render(
      <SurfaceSlot
        tabs={tabs}
        providers={registry}
        fallback={<div data-testid="fallback">fallback</div>}
        onSwitch={() => undefined}
        onClose={() => undefined}
      />,
    )
    expect(screen.getByRole('tab', { name: 'magpie 控制台' })).toBeTruthy()

    removeSurfaceProvider(registry, tabs, 'magpie-console')
    rerender(
      <SurfaceSlot
        tabs={tabs}
        providers={registry}
        fallback={<div data-testid="fallback">fallback</div>}
        onSwitch={() => undefined}
        onClose={() => undefined}
      />,
    )

    expect(screen.queryByRole('tab', { name: 'magpie 控制台' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'DeepSeek Harness' })).toBeTruthy()
    expect(screen.getByTestId('harness-view')).toBeTruthy()
  })

  it('provider 渲染抛错时只影响该 Surface，壳继续可用', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const tabs = tabsWith(harnessDescriptor)
    const registry = new SurfaceProviderRegistry()
    registry.register(provider('harness', () => { throw new Error('渲染炸了') }))

    render(
      <div>
        <div data-testid="shell">shell</div>
        <SurfaceSlot
          tabs={tabs}
          providers={registry}
          fallback={<div data-testid="fallback">fallback</div>}
          onSwitch={() => undefined}
          onClose={() => undefined}
        />
      </div>,
    )

    expect(screen.getByTestId('shell')).toBeTruthy()
    expect(screen.getByTestId('surface-error')).toBeTruthy()
    expect(screen.getByText(/Surface 渲染失败/)).toBeTruthy()
  })
})
