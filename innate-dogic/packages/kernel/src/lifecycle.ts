/**
 * 插件生命周期管理。
 *
 * - activate: 执行插件 apply(ctx)
 * - deactivate: 执行 dispose 链
 * - ctx.effect: 注册资源回收回调
 * - 插件崩溃不拖垮宿主
 */
import { Container } from './container.js'
import type {
  Plugin,
  PluginContext,
  PluginRuntime,
  PluginState,
} from './plugin-types.js'

type EventMap = Map<string, Array<(...args: any[]) => void>>

export class LifecycleManager {
  private runtimes = new Map<string, PluginRuntime>()
  private globalListeners: EventMap = new Map()

  constructor(private container: Container) {}

  /**
   * 激活插件。
   */
  async activate(plugin: Plugin): Promise<void> {
    const runtime = this.getOrCreateRuntime(plugin)
    if (runtime.state === 'active' || runtime.state === 'activating') return

    runtime.state = 'activating'
    runtime.error = undefined

    const ctx = this.createContext(plugin, runtime)

    try {
      await plugin.apply(ctx)
      runtime.state = 'active'
    } catch (err) {
      runtime.state = 'error'
      runtime.error = err instanceof Error ? err : new Error(String(err))
      // 清理已注册的 effects
      await this.runEffects(runtime)
      runtime.effects = []
      throw runtime.error
    }
  }

  /**
   * 停用插件。
   */
  async deactivate(pluginId: string): Promise<void> {
    const runtime = this.runtimes.get(pluginId)
    if (!runtime) return
    if (runtime.state === 'inactive' || runtime.state === 'deactivating') return

    runtime.state = 'deactivating'

    try {
      await this.runEffects(runtime)
    } finally {
      runtime.effects = []
      runtime.listeners.clear()
      runtime.state = 'inactive'
    }
  }

  /**
   * 获取插件状态。
   */
  getState(pluginId: string): PluginState | undefined {
    return this.runtimes.get(pluginId)?.state
  }

  /**
   * 获取所有运行时。
   */
  listRuntimes(): PluginRuntime[] {
    return [...this.runtimes.values()]
  }

  private getOrCreateRuntime(plugin: Plugin): PluginRuntime {
    let runtime = this.runtimes.get(plugin.id)
    if (!runtime) {
      runtime = {
        plugin,
        state: 'pending',
        effects: [],
        listeners: new Map(),
      }
      this.runtimes.set(plugin.id, runtime)
    }
    return runtime
  }

  private createContext(
    plugin: Plugin,
    runtime: PluginRuntime,
  ): PluginContext {
    return {
      service: this.container,
      effect: (dispose) => {
        runtime.effects.push(dispose)
      },
      on: (event, handler) => {
        const listeners = runtime.listeners.get(event) ?? []
        listeners.push(handler)
        runtime.listeners.set(event, listeners)
      },
      emit: (event, ...args) => {
        this.emit(event, ...args)
      },
      meta: {
        id: plugin.id,
        name: plugin.id,
        version: '0.0.0',
      },
    }
  }

  private async runEffects(runtime: PluginRuntime): Promise<void> {
    const effects = [...runtime.effects].reverse()
    for (const effect of effects) {
      try {
        await effect()
      } catch {
        // 忽略单个 effect 的错误，继续清理
      }
    }
  }

  private emit(event: string, ...args: any[]): void {
    // 全局事件
    const globalHandlers = this.globalListeners.get(event) ?? []
    for (const h of globalHandlers) {
      try {
        h(...args)
      } catch {
        // 忽略
      }
    }
    // 各插件的事件
    for (const runtime of this.runtimes.values()) {
      const handlers = runtime.listeners.get(event) ?? []
      for (const h of handlers) {
        try {
          h(...args)
        } catch {
          // 忽略
        }
      }
    }
  }
}
