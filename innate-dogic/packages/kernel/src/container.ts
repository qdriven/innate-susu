/**
 * DI 容器 — 服务注册与解析。
 *
 * 借鉴 Cordis 的 ctx.service 模式，支持懒加载、循环依赖检测。
 */

export type ServiceFactory<T = unknown> = (ctx: ServiceContext) => T | Promise<T>

export interface ServiceContext {
  resolve<T>(id: string): T
  has(id: string): boolean
}

export interface ServiceEntry {
  id: string
  factory: ServiceFactory
  instance?: unknown
  /** 标记正在解析中（用于循环依赖检测） */
  resolving?: boolean
}

export class CircularDependencyError extends Error {
  constructor(chain: string[]) {
    super(`Circular dependency detected: ${chain.join(' -> ')}`)
    this.name = 'CircularDependencyError'
  }
}

export class ServiceNotFoundError extends Error {
  constructor(id: string) {
    super(`Service not found: ${id}`)
    this.name = 'ServiceNotFoundError'
  }
}

export class Container {
  private services = new Map<string, ServiceEntry>()
  private resolveChain: string[] = []
  private disposeCallbacks: Array<() => void | Promise<void>> = []

  /**
   * 注册服务工厂。
   */
  register<T>(id: string, factory: ServiceFactory<T>): void {
    if (this.services.has(id)) {
      throw new Error(`Service already registered: ${id}`)
    }
    this.services.set(id, { id, factory })
  }

  /**
   * 注册服务实例（非懒加载）。
   */
  registerInstance<T>(id: string, instance: T): void {
    if (this.services.has(id)) {
      throw new Error(`Service already registered: ${id}`)
    }
    this.services.set(id, { id, factory: () => instance, instance })
  }

  /**
   * 解析服务实例。懒加载，首次解析时调用工厂。
   */
  resolve<T>(id: string): T {
    const entry = this.services.get(id)
    if (!entry) {
      throw new ServiceNotFoundError(id)
    }

    if (entry.instance !== undefined) {
      return entry.instance as T
    }

    if (entry.resolving) {
      throw new CircularDependencyError([...this.resolveChain, id])
    }

    entry.resolving = true
    this.resolveChain.push(id)

    try {
      const ctx: ServiceContext = {
        resolve: <U>(depId: string) => this.resolve<U>(depId),
        has: (depId: string) => this.has(depId),
      }
      const result = entry.factory(ctx)
      entry.instance = result
      return result as T
    } finally {
      entry.resolving = false
      this.resolveChain.pop()
    }
  }

  /**
   * 异步解析服务（工厂返回 Promise 时）。
   */
  async resolveAsync<T>(id: string): Promise<T> {
    const entry = this.services.get(id)
    if (!entry) {
      throw new ServiceNotFoundError(id)
    }

    if (entry.instance !== undefined) {
      return entry.instance as T
    }

    if (entry.resolving) {
      throw new CircularDependencyError([...this.resolveChain, id])
    }

    entry.resolving = true
    this.resolveChain.push(id)

    try {
      const ctx: ServiceContext = {
        resolve: <U>(depId: string) => this.resolve<U>(depId),
        has: (depId: string) => this.has(depId),
      }
      const result = await entry.factory(ctx)
      entry.instance = result
      return result as T
    } finally {
      entry.resolving = false
      this.resolveChain.pop()
    }
  }

  has(id: string): boolean {
    return this.services.has(id)
  }

  /**
   * 注册 dispose 回调，dispose() 时倒序执行。
   */
  onDispose(cb: () => void | Promise<void>): void {
    this.disposeCallbacks.push(cb)
  }

  /**
   * 销毁容器，执行所有 dispose 回调。
   */
  async dispose(): Promise<void> {
    const callbacks = [...this.disposeCallbacks].reverse()
    this.disposeCallbacks = []
    for (const cb of callbacks) {
      await cb()
    }
    this.services.clear()
  }

  /**
   * 列出所有已注册服务 ID。
   */
  list(): string[] {
    return [...this.services.keys()]
  }
}
