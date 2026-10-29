import { SurfaceRegistry } from '@dogic/core/surface'
import type { SurfaceDescriptor, SurfaceRecord, SurfaceSnapshot } from '@dogic/core/surface'

/** 标签快照的持久化后端；测试注入内存实现，产品用 localStorage。 */
export interface SurfaceStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface SurfaceTabsOptions {
  /** 持久化键；快照只含安全字段，不含 URL/token/webContents。 */
  key: string
  storage?: SurfaceStorage | null
}

function defaultStorage(): SurfaceStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/**
 * 中栏 Surface 标签模型（W1c.1）。
 *
 * 只保存 id/kind/providerId/title/workspaceId/capabilities 与安全激活 id；
 * 生命周期语义与 @dogic/core 的 SurfaceRegistry 完全一致（open/activate/deactivate/close）。
 */
export class SurfaceTabs {
  private readonly registry = new SurfaceRegistry()
  private readonly listeners = new Set<() => void>()
  private readonly key: string
  private readonly storage: SurfaceStorage | null
  private revision = 0
  private snapshotCache?: SurfaceSnapshot

  constructor(options: SurfaceTabsOptions) {
    this.key = options.key
    this.storage = options.storage === undefined ? defaultStorage() : options.storage
    this.restoreFromStorage()
  }

  open(descriptor: SurfaceDescriptor): SurfaceRecord {
    const record = this.registry.open(descriptor)
    this.commit()
    return record
  }

  activate(id: string): SurfaceRecord {
    const record = this.registry.activate(id)
    this.commit()
    return record
  }

  deactivate(id?: string): void {
    this.registry.deactivate(id)
    this.commit()
  }

  /**
   * 仅当当前激活项是该 provider 时摘掉激活；标签本身保留（可再激活）。
   * W3：内容页切换时摘掉 Harness/控制台激活，但保留 workspace 文档激活。
   */
  deactivateProvider(providerId: string): void {
    const active = this.registry.active()
    if (active && active.providerId === providerId) {
      this.registry.deactivate()
      this.commit()
    }
  }

  close(id: string): void {
    this.registry.close(id)
    this.commit()
  }

  /** 摘除某个 provider 的全部标签；其它 provider 的标签与激活项不受影响。 */
  removeProvider(providerId: string): string[] {
    const removed = this.registry
      .list()
      .filter((surface) => surface.providerId === providerId)
      .map((surface) => surface.id)
    for (const id of removed) this.registry.close(id)
    if (removed.length > 0) this.commit()
    return removed
  }

  get(id: string): SurfaceRecord | undefined {
    return this.registry.get(id)
  }

  has(id: string): boolean {
    return this.registry.has(id)
  }

  list(): SurfaceRecord[] {
    return this.registry.list()
  }

  active(): SurfaceRecord | undefined {
    return this.registry.active()
  }

  snapshot(): SurfaceSnapshot {
    this.snapshotCache ??= this.registry.snapshot()
    return this.snapshotCache
  }

  /** 非法版本/结构安全回退：返回 false 并丢弃坏快照，绝不抛到渲染链路。 */
  restore(input: unknown): boolean {
    try {
      this.registry.restore(input)
      this.commit()
      return true
    } catch {
      this.storage?.removeItem(this.key)
      this.commit()
      return false
    }
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  readonly getRevision = (): number => this.revision

  dispose(): void {
    this.listeners.clear()
  }

  private restoreFromStorage(): void {
    const saved = this.storage?.getItem(this.key)
    if (!saved) return
    try {
      this.registry.restore(JSON.parse(saved) as unknown)
    } catch {
      this.storage?.removeItem(this.key)
    }
  }

  private commit(): void {
    this.snapshotCache = undefined
    this.persist()
    this.revision += 1
    for (const listener of [...this.listeners]) listener()
  }

  private persist(): void {
    if (!this.storage) return
    try {
      this.storage.setItem(this.key, JSON.stringify(this.registry.snapshot()))
    } catch {
      /* 存储不可用时标签仍可用，只是不持久化 */
    }
  }
}
