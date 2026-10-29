import { createContext, useContext } from 'react'
import type { SurfaceDescriptor } from '@dogic/core/surface'

/**
 * shell ↔ plugin 解耦契约（W3.4）：插件通过 context 打开中栏文档标签，
 * 而不直接持有 shell 的 SurfaceTabs。shell 在右栏与中栏外层提供 opener。
 */
export interface WorkspaceDocumentOpener {
  /** 打开（或聚焦）一个文档 Surface；descriptor 由插件按 workspaceId + relative 构造。 */
  openDocument(descriptor: SurfaceDescriptor): void
  /** 当前激活的工作区文档（仅 workspace-* provider）；无则 undefined。 */
  activeDocument?: SurfaceDescriptor
}

export const WorkspaceDocumentContext = createContext<WorkspaceDocumentOpener | null>(null)

export function useWorkspaceDocument(): WorkspaceDocumentOpener {
  const value = useContext(WorkspaceDocumentContext)
  if (!value) throw new Error('useWorkspaceDocument 必须在 WorkspaceDocumentContext.Provider 内使用')
  return value
}
