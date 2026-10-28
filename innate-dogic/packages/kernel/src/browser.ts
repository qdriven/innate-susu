/** Renderer 专用入口：不包含 Registry 等 Node 文件系统模块。 */
export { Container } from './container.js'
export type { ServiceContext, ServiceFactory, ServiceEntry } from './container.js'
export { WorkbenchHost } from './workbench-host.js'
export type { PanelSpec, PanelRegistration } from './workbench-host.js'
export { SettingsHost } from './settings-host.js'
export type { SettingField, SettingFieldType, SettingGroup } from './settings-host.js'
export type { Plugin, PluginContext, PluginManifest } from './plugin-types.js'
