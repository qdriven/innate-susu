import type { Plugin, WorkbenchHost } from '@dogic/kernel'
import type { WorkspaceApi } from './shared/index.js'
import { createWorkspaceSidebar } from './renderer/index.js'

/** UI 贡献插件：宿主通过 DI 提供受限 WorkspaceApi，插件不直接接触 Electron。 */
export const workspaceUiPlugin: Plugin = {
  id: 'workspace',
  apply(ctx) {
    const workbench = ctx.service.resolve<WorkbenchHost>('workbench')
    const api = ctx.service.resolve<WorkspaceApi>('workspace-api')
    workbench.registerPanel({ id: 'workspace', title: '工作区', icon: '▤', customFrame: true }, createWorkspaceSidebar(api))
    ctx.effect(() => workbench.unregisterPanel('workspace'))
  },
}
