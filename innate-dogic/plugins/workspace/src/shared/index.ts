export interface WorkspaceRoot {
  path: string
  name: string
}

/** 当前选定的工作区上下文：root 只代表用户选定的上下文，不代表调用方已获任意文件权限。 */
export interface WorkspaceContext extends WorkspaceRoot {
  /** 稳定身份（= canonical root）；W4 terminal 引用同一值。 */
  workspaceId: string
}

export type WorkspaceRootSource = 'saved' | 'env' | 'picker'

/** root 变更类型化事件：{rootPath, source} 契约，不暴露任何凭据。 */
export interface WorkspaceRootChanged {
  rootPath: string
  source: WorkspaceRootSource
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

/** preload 暴露给工作区 UI 插件的唯一宿主契约。只读；不暴露 Node path/fs。 */
export interface WorkspaceApi {
  workspaceGetRoot(): Promise<WorkspaceContext | null>
  workspacePickRoot(): Promise<WorkspaceContext | null>
  workspaceList(root: string, relative?: string): Promise<WorkspaceEntry[]>
  workspaceRead(root: string, relative: string): Promise<WorkspaceFile>
  workspaceGitStatus(root: string): Promise<GitStatus>
  workspaceGitDiff(root: string, relative: string): Promise<GitDiff>
  /** root 变更订阅：类型化事件，renderer 不持有 main 进程句柄。 */
  workspaceOnRootChanged(cb: (changed: WorkspaceRootChanged) => void): () => void
}
