import { createElement } from 'react'
import type { ComponentType, ReactNode } from 'react'
import type { WorkspaceApi } from '../shared/index.js'
import WorkspacePage from './WorkspacePage.js'

export { WorkspacePage }
export { resolveWorkspaceRelative } from './FilePreview.js'

export function createWorkspacePanel(api: WorkspaceApi): ComponentType {
  return function WorkspacePanel(): ReactNode {
    return createElement(WorkspacePage, { api })
  }
}
