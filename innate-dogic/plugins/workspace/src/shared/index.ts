export interface WorkspaceRoot {
  path: string
  name: string
}

export interface WorkspaceEntry {
  name: string
  path: string
  kind: 'file' | 'directory'
  size?: number
  modifiedAt: string
}

export type WorkspaceFileKind = 'text' | 'markdown' | 'image' | 'unsupported'

export interface WorkspaceFile {
  path: string
  name: string
  kind: WorkspaceFileKind
  content: string
  mime?: string
  size: number
  truncated: boolean
}

export interface GitChange {
  path: string
  previousPath?: string
  index: string
  workingTree: string
}

export interface GitStatus {
  isRepo: boolean
  branch?: string
  changes: GitChange[]
  detail?: string
}

export interface GitDiff {
  path: string
  unstaged: string
  staged: string
  truncated: boolean
}

/** preload 暴露给工作区 UI 插件的唯一宿主契约。 */
export interface WorkspaceApi {
  workspaceGetRoot(): Promise<WorkspaceRoot | null>
  workspacePickRoot(): Promise<WorkspaceRoot | null>
  workspaceList(root: string, relative?: string): Promise<WorkspaceEntry[]>
  workspaceRead(root: string, relative: string): Promise<WorkspaceFile>
  workspaceGitStatus(root: string): Promise<GitStatus>
  workspaceGitDiff(root: string, relative: string): Promise<GitDiff>
}
