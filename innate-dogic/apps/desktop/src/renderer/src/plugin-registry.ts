import type { ComponentType } from 'react'
import { Container, WorkbenchHost } from '@dogic/kernel/browser'
import type { PluginContext } from '@dogic/kernel/browser'
import { workspaceUiPlugin } from '@dogic/plugin-workspace/plugin'
import {
  WorkspaceDocumentContext,
  createWorkspaceDocumentProviders,
} from '@dogic/plugin-workspace/renderer'
import type { WorkspaceDocumentOpener } from '@dogic/plugin-workspace/renderer'
import { api } from './api'

const service = new Container()
const workbench = new WorkbenchHost()
service.registerInstance('workbench', workbench)
service.registerInstance('workspace-api', api)

const context: PluginContext = {
  service,
  effect: (dispose) => service.onDispose(dispose),
  on: () => {},
  emit: () => {},
  meta: { id: 'workspace', name: '工作区', version: '0.1.0' },
}
void workspaceUiPlugin.apply(context)

const panel = workbench.getPanel('workspace')
if (!panel) throw new Error('工作区插件未注册 workspace 面板')

/** 右栏工作区侧栏组件（dev 模式常驻）。 */
export const WorkspaceSidebar = panel.component as ComponentType

/** 中栏文档 provider 工厂：shell 注册到 SurfaceProviderRegistry。 */
export { createWorkspaceDocumentProviders }

/** shell ↔ plugin 解耦契约：插件经 context 打开/聚焦工作区文档。 */
export { WorkspaceDocumentContext }
export type { WorkspaceDocumentOpener }
