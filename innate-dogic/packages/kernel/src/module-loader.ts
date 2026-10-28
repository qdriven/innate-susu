/**
 * 客户端模块加载器。
 *
 * 支持 __ModuleLoader__.load({id, factory})，
 * require 白名单：React/Cordis 基线 + external 声明。
 */

/** 基线模块（所有插件共享） */
const BASELINE_MODULES = new Set(['react', 'react-dom', 'react/jsx-runtime'])

export interface ModuleFactory {
  (require: (id: string) => unknown, module: { exports: unknown }, exports: unknown): void
}

export class ModuleLoader {
  private modules = new Map<string, ModuleFactory>()
  private cache = new Map<string, unknown>()
  private externalModules = new Map<string, unknown>()

  /**
   * 注册一个模块工厂。
   */
  load(id: string, factory: ModuleFactory): void {
    if (this.modules.has(id)) {
      throw new Error(`Module already loaded: ${id}`)
    }
    this.modules.set(id, factory)
  }

  /**
   * 注册外部模块（插件 external 声明的模块）。
   */
  registerExternal(id: string, module: unknown): void {
    this.externalModules.set(id, module)
  }

  /**
   * require 一个模块。
   * 白名单：基线模块 + external 模块 + 已注册模块。
   */
  require(id: string): unknown {
    // 缓存命中
    if (this.cache.has(id)) {
      return this.cache.get(id)
    }

    // 基线模块
    if (BASELINE_MODULES.has(id)) {
      const mod = this.externalModules.get(id)
      if (mod !== undefined) {
        this.cache.set(id, mod)
        return mod
      }
      throw new Error(
        `Baseline module not registered: ${id}. Did you forget to call registerExternal?`,
      )
    }

    // external 模块
    if (this.externalModules.has(id)) {
      const mod = this.externalModules.get(id)
      this.cache.set(id, mod)
      return mod
    }

    // 已注册模块
    const factory = this.modules.get(id)
    if (factory) {
      const moduleObj = { exports: {} }
      const exports = moduleObj.exports
      factory((depId) => this.require(depId), moduleObj, exports)
      const result = moduleObj.exports
      this.cache.set(id, result)
      return result
    }

    throw new Error(
      `Module not found: ${id}. Allowed: ${[...BASELINE_MODULES].join(', ')} or external declarations.`,
    )
  }

  has(id: string): boolean {
    return (
      BASELINE_MODULES.has(id) ||
      this.externalModules.has(id) ||
      this.modules.has(id)
    )
  }
}

/** 全局单例 */
let globalLoader: ModuleLoader | null = null

export function getGlobalModuleLoader(): ModuleLoader {
  if (!globalLoader) {
    globalLoader = new ModuleLoader()
  }
  return globalLoader
}

/**
 * 暴露给插件客户端的全局 API。
 * 插件打包时会调用 __ModuleLoader__.load(id, factory) 注册自身模块。
 */
export function installGlobalModuleLoader(): void {
  const loader = getGlobalModuleLoader()
  ;(globalThis as any).__ModuleLoader__ = {
    load: (id: string, factory: ModuleFactory) => loader.load(id, factory),
    require: (id: string) => loader.require(id),
  }
}
