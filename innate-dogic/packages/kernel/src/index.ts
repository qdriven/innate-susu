/**
 * @dogic/kernel — 插件容器内核。
 *
 * 提供：DI 容器、插件生命周期、模块加载器、workbench 插槽、设置页插槽、注册表。
 */

export { Container } from './container.js'
export type { ServiceContext, ServiceFactory, ServiceEntry } from './container.js'
export { CircularDependencyError, ServiceNotFoundError } from './container.js'

export { LifecycleManager } from './lifecycle.js'

export { ModuleLoader, getGlobalModuleLoader, installGlobalModuleLoader } from './module-loader.js'
export type { ModuleFactory } from './module-loader.js'

export { WorkbenchHost } from './workbench-host.js'
export type { PanelSpec, PanelRegistration } from './workbench-host.js'

export { SettingsHost } from './settings-host.js'
export type { SettingField, SettingFieldType, SettingGroup } from './settings-host.js'

export { Registry } from './registry.js'
export type { PluginMeta, RegistryState } from './registry.js'

export type {
  Plugin,
  PluginContext,
  PluginManifest,
  PluginRuntime,
  PluginState,
} from './plugin-types.js'
