/**
 * 插件类型定义。
 */
import type { Container } from './container.js'

/** 插件包声明（package.json 中的 innate.plugin 字段） */
export interface PluginManifest {
  id: string
  name: string
  version: string
  host?: string
  client?: string
  external?: string[]
  provides?: string[]
  consumes?: string[]
}

/** 插件上下文，传递给 apply(ctx) */
export interface PluginContext {
  /** DI 容器，用于注册/解析服务 */
  service: Container
  /** 注册资源回收回调，deactivate 时倒序执行 */
  effect(dispose: () => void | Promise<void>): void
  /** 事件总线 */
  on(event: string, handler: (...args: any[]) => void): void
  emit(event: string, ...args: any[]): void
  /** 插件元数据 */
  meta: PluginManifest
}

/** 插件定义 */
export interface Plugin {
  id: string
  apply(ctx: PluginContext): void | Promise<void>
}

/** 插件运行时状态 */
export type PluginState =
  | 'pending'
  | 'activating'
  | 'active'
  | 'deactivating'
  | 'inactive'
  | 'error'

export interface PluginRuntime {
  plugin: Plugin
  state: PluginState
  error?: Error
  effects: Array<() => void | Promise<void>>
  listeners: Map<string, Array<(...args: any[]) => void>>
}
