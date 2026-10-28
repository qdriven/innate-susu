import type { ComponentType } from 'react'
import { Container, WorkbenchHost } from '@dogic/kernel/browser'
import type { PluginContext } from '@dogic/kernel/browser'
import { workspaceUiPlugin } from '@dogic/plugin-workspace/plugin'
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

export const WorkspacePanel = panel.component as ComponentType
