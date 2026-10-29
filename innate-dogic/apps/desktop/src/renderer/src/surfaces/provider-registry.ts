import type { ComponentType } from 'react'
import type { SurfaceDescriptor, SurfaceKind } from '@dogic/core/surface'
import type { SurfaceTabs } from './surface-tabs'

/** provider 视图收到的安全 props：不含 URL、token、webContents 或进程句柄。 */
export interface SurfaceViewProps {
  descriptor: SurfaceDescriptor
  active: boolean
  onRequestClose(): void
}

/**
 * Surface provider 契约（W1c.1）。
 *
 * 同一接口容纳两类实现：
 * - `webcontents`：视图本体在主进程 WebContentsView，renderer 只占位与同步 bounds；
 * - `document` / `panel`：视图本体就是 renderer 内的本地页面。
 */
export interface SurfaceProvider {
  readonly id: string
  readonly kind: SurfaceKind
  readonly View: ComponentType<SurfaceViewProps>
  /** 显式关闭：销毁宿主视图（与 detach 区分）。 */
  close?(descriptor: SurfaceDescriptor): unknown | Promise<unknown>
  /** 摘除 provider：只清理自身贡献。 */
  dispose?(): void
}

/** provider 注册表：重复注册显式失败；摘除/销毁单个 provider 不影响其它 provider。 */
export class SurfaceProviderRegistry {
  private readonly providers = new Map<string, SurfaceProvider>()
  private readonly disabled = new Set<string>()
  private readonly listeners = new Set<() => void>()
  private revision = 0

  register(provider: SurfaceProvider): void {
    if (this.providers.has(provider.id)) throw new Error(`Surface provider 重复注册: ${provider.id}`)
    this.disabled.delete(provider.id)
    this.providers.set(provider.id, provider)
    this.notify()
  }

  /** 摘除 provider：只移除自身贡献并调用其 dispose。 */
  unregister(id: string): void {
    const provider = this.providers.get(id)
    this.providers.delete(id)
    this.disabled.add(id)
    this.disposeProvider(provider)
    this.notify()
  }

  isDisabled(id: string): boolean {
    return this.disabled.has(id)
  }

  get(id: string): SurfaceProvider | undefined {
    return this.providers.get(id)
  }

  list(): SurfaceProvider[] {
    return [...this.providers.values()]
  }

  dispose(): void {
    for (const provider of this.providers.values()) this.disposeProvider(provider)
    this.providers.clear()
    this.notify()
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  readonly getRevision = (): number => this.revision

  private disposeProvider(provider: SurfaceProvider | undefined): void {
    try {
      provider?.dispose?.()
    } catch {
      /* 单个 provider 清理失败不得影响其它 provider */
    }
  }

  private notify(): void {
    this.revision += 1
    for (const listener of [...this.listeners]) listener()
  }
}

/**
 * 摘除 provider 的统一入口：先关掉它的标签，再注销 provider。
 * 其它 provider 的标签、激活项与运行时保持不变。
 */
export function removeSurfaceProvider(
  registry: SurfaceProviderRegistry,
  tabs: SurfaceTabs,
  providerId: string,
): string[] {
  const removed = tabs.removeProvider(providerId)
  registry.unregister(providerId)
  return removed
}
