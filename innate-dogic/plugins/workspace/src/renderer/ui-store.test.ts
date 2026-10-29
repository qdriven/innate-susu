import { beforeEach, describe, expect, it } from 'vitest'
import {
  WORKSPACE_UI_VERSION,
  loadUiState,
  migrateLegacySurfaces,
  saveUiState,
  toggleDir,
  workspaceUiKey,
  type WorkspaceUiState,
} from './ui-store'

const ROOT = 'C:/repos/innate'

function makeState(overrides?: Partial<WorkspaceUiState>): WorkspaceUiState {
  return { version: 1, root: ROOT, expandedDirs: [], sidebarView: 'files', ...overrides }
}

describe('W3.6 WorkspaceUiStore（UI 状态持久化）', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('save/load 往返：expandedDirs 与 sidebarView 原样恢复', () => {
    const state = makeState({ expandedDirs: ['src', 'docs'], sidebarView: 'git' })
    saveUiState(ROOT, state)
    expect(loadUiState(ROOT)).toEqual(state)
  })

  it('键含 encodeURIComponent(root)：含冒号/空格路径不冲突', () => {
    expect(workspaceUiKey('C:/a b')).toBe('innate.workspace.ui:C%3A%2Fa%20b')
  })

  it('损坏 JSON / 非对象 / 版本不符 / root 不匹配 → null（不抛异常）', () => {
    localStorage.setItem(workspaceUiKey(ROOT), '{corrupt')
    expect(loadUiState(ROOT)).toBeNull()
    localStorage.setItem(workspaceUiKey(ROOT), JSON.stringify([1, 2]))
    expect(loadUiState(ROOT)).toBeNull()
    localStorage.setItem(workspaceUiKey(ROOT), JSON.stringify({ version: 2, root: ROOT }))
    expect(loadUiState(ROOT)).toBeNull()
    localStorage.setItem(workspaceUiKey(ROOT), JSON.stringify({ version: 1, root: 'other' }))
    expect(loadUiState(ROOT)).toBeNull()
  })

  it('缺省值兜底：expandedDirs 非字符串项过滤、sidebarView 非 git 归 files', () => {
    localStorage.setItem(workspaceUiKey(ROOT), JSON.stringify({
      version: WORKSPACE_UI_VERSION,
      root: ROOT,
      expandedDirs: ['a', 1, null],
      sidebarView: 'weird',
    }))
    expect(loadUiState(ROOT)).toEqual({ version: 1, root: ROOT, expandedDirs: ['a'], sidebarView: 'files' })
  })

  it('migrateLegacySurfaces 一次性删除旧 surfaces:* 键，保留 ui:* 键', () => {
    localStorage.setItem('innate.workspace.surfaces:C%3A%2Frepo', '{"version":1}')
    localStorage.setItem('innate.workspace.ui:C%3A%2Frepo', JSON.stringify(makeState({ root: 'C:/repo' })))
    migrateLegacySurfaces()
    expect(localStorage.getItem('innate.workspace.surfaces:C%3A%2Frepo')).toBeNull()
    expect(localStorage.getItem('innate.workspace.ui:C%3A%2Frepo')).not.toBeNull()
  })

  it('toggleDir 增删目录且去重', () => {
    expect(toggleDir([], 'a', true)).toEqual(['a'])
    expect(toggleDir(['a', 'b'], 'a', true)).toEqual(['a', 'b'])
    expect(toggleDir(['a', 'b'], 'a', false)).toEqual(['b'])
  })
})
