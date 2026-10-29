/** 工作区文档 provider 标识：文件与 Git diff 共用同一中栏 document 槽。 */
export const WORKSPACE_FILE_PROVIDER_ID = 'workspace-file'
export const WORKSPACE_GIT_DIFF_PROVIDER_ID = 'workspace-git-diff'

export type WorkspaceDocumentKind = 'file' | 'diff'

/**
 * 文档 id 由 workspaceId（canonical root）与规范化相对路径稳定派生。
 * 跨 root 同路径不冲突；Windows 盘符冒号在字符串 id 内安全。
 */
export function workspaceFileId(workspaceId: string, relative: string): string {
  return `file:${workspaceId}:${relative}`
}

export function workspaceDiffId(workspaceId: string, relative: string): string {
  return `diff:${workspaceId}:${relative}`
}

export function parseWorkspaceDocumentId(
  id: string,
  workspaceId: string,
): { kind: WorkspaceDocumentKind; relative: string } {
  const filePrefix = `file:${workspaceId}:`
  const diffPrefix = `diff:${workspaceId}:`
  if (id.startsWith(filePrefix)) return { kind: 'file', relative: id.slice(filePrefix.length) }
  if (id.startsWith(diffPrefix)) return { kind: 'diff', relative: id.slice(diffPrefix.length) }
  throw new Error('工作区文档 id 与当前 workspaceId 不匹配')
}
