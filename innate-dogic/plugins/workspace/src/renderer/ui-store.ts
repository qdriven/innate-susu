/**
 * 工作区 UI 状态持久化（W3.6 renderer）：只存安全 UI 状态（展开目录、侧栏视图），
 * 不存文件内容或 diff 全文，不含认证信息。
 *
 * 键：`innate.workspace.ui:${encodeURIComponent(root)}`。
 * 损坏/版本不匹配/root 不匹配 → null（空布局，不抛异常）。
 */

export const WORKSPACE_UI_VERSION = 1

export type WorkspaceSidebarView = 'files' | 'git'

export interface WorkspaceUiState {
  version: 1
  root: string
  expandedDirs: string[]
  sidebarView: WorkspaceSidebarView
}

export function workspaceUiKey(root: string): string {
  return `innate.workspace.ui:${encodeURIComponent(root)}`
}

/** 旧快照键（W3 之前）：一次性迁移删除。 */
const LEGACY_SURFACES_PREFIX = 'innate.workspace.surfaces:'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function loadUiState(root: string): WorkspaceUiState | null {
  try {
    const raw = localStorage.getItem(workspaceUiKey(root))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    if (parsed.version !== WORKSPACE_UI_VERSION) return null
    if (parsed.root !== root) return null
    return {
      version: WORKSPACE_UI_VERSION,
      root,
      expandedDirs: Array.isArray(parsed.expandedDirs)
        ? parsed.expandedDirs.filter((item): item is string => typeof item === 'string')
        : [],
      sidebarView: parsed.sidebarView === 'git' ? 'git' : 'files',
    }
  } catch {
    return null
  }
}

export function saveUiState(root: string, state: WorkspaceUiState): void {
  try {
    localStorage.setItem(workspaceUiKey(root), JSON.stringify(state))
  } catch {
    /* 存储不可用时 UI 仍可用，只是不持久化 */
  }
}

/** 一次性迁移：删除旧 `innate.workspace.surfaces:*` 键（内容已迁至 surface-tabs:center）。 */
export function migrateLegacySurfaces(): void {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (key && key.startsWith(LEGACY_SURFACES_PREFIX)) localStorage.removeItem(key)
    }
  } catch {
    /* 存储不可用时跳过迁移 */
  }
}

export function toggleDir(dirs: string[], path: string, expanded: boolean): string[] {
  const set = new Set(dirs)
  if (expanded) set.add(path)
  else set.delete(path)
  return [...set]
}
