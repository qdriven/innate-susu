import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createWorkspaceSidebar } from './WorkspaceSidebar'
import { WorkspaceDocumentContext } from './document-context'
import type { WorkspaceDocumentOpener } from './document-context'
import type {
  GitDiff,
  GitStatus,
  WorkspaceApi,
  WorkspaceContext,
  WorkspaceEntry,
  WorkspaceFile,
  WorkspaceRootChanged,
} from '../shared/index'

const apiMocks = vi.hoisted(() => ({
  workspaceGetRoot: vi.fn(async (): Promise<WorkspaceContext | null> => null),
  workspacePickRoot: vi.fn(async (): Promise<WorkspaceContext | null> => null),
  workspaceList: vi.fn(async (_root: string, _relative?: string): Promise<WorkspaceEntry[]> => []),
  workspaceRead: vi.fn(async (_root: string, _relative: string): Promise<WorkspaceFile> => ({}) as WorkspaceFile),
  workspaceGitStatus: vi.fn(async (_root: string): Promise<GitStatus> => ({ isRepo: true, branch: 'main', changes: [] })),
  workspaceGitDiff: vi.fn(async (_root: string, _relative: string): Promise<GitDiff> => ({ path: '', unstaged: '', staged: '', truncated: false })),
  workspaceOnRootChanged: vi.fn((_cb: (changed: WorkspaceRootChanged) => void): (() => void) => () => {}),
}))

const CTX_A: WorkspaceContext = { path: '/repo', name: 'repo', workspaceId: '/repo' }
const CTX_B: WorkspaceContext = { path: '/other', name: 'other', workspaceId: '/other' }

function renderSidebar(): WorkspaceDocumentOpener {
  const openDocument = vi.fn()
  const opener: WorkspaceDocumentOpener = { openDocument }
  const WorkspaceSidebar = createWorkspaceSidebar(apiMocks as unknown as WorkspaceApi)
  render(
    <WorkspaceDocumentContext.Provider value={opener}>
      <WorkspaceSidebar />
    </WorkspaceDocumentContext.Provider>,
  )
  return opener
}

describe('W3.3 WorkspaceSidebar（右栏侧栏）', () => {
  beforeEach(() => {
    localStorage.clear()
    apiMocks.workspaceGetRoot.mockResolvedValue(null)
    apiMocks.workspacePickRoot.mockResolvedValue(null)
    apiMocks.workspaceList.mockResolvedValue([])
    apiMocks.workspaceRead.mockResolvedValue({} as WorkspaceFile)
    apiMocks.workspaceGitStatus.mockResolvedValue({ isRepo: true, branch: 'main', changes: [] })
    apiMocks.workspaceGitDiff.mockResolvedValue({ path: '', unstaged: '', staged: '', truncated: false })
    apiMocks.workspaceOnRootChanged.mockReturnValue(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('无 root：空状态显式可操作（选择目录），不渲染文件树', async () => {
    renderSidebar()
    await waitFor(() => expect(screen.getByText('打开一个工作区')).toBeTruthy())
    expect(screen.getByRole('button', { name: '选择目录' })).toBeTruthy()
    expect(screen.queryByRole('tree')).toBeNull()
  })

  it('有 root：root 名展示 + 文件树懒加载顶层条目', async () => {
    apiMocks.workspaceGetRoot.mockResolvedValue(CTX_A)
    apiMocks.workspaceList.mockResolvedValue([
      { name: 'package.json', path: 'package.json', kind: 'file', size: 100, modifiedAt: '' },
      { name: 'src', path: 'src', kind: 'directory', modifiedAt: '' },
    ])
    renderSidebar()
    await waitFor(() => expect(screen.getByText('▣ repo')).toBeTruthy())
    await waitFor(() => expect(screen.getByTitle('package.json')).toBeTruthy())
    expect(screen.getByTitle('src')).toBeTruthy()
    // 目录展开是懒加载：未点击时不请求子目录
    expect(apiMocks.workspaceList).toHaveBeenCalledTimes(1)
  })

  it('点击文件 → openDocument 收到安全 file descriptor（workspaceId + relative）', async () => {
    apiMocks.workspaceGetRoot.mockResolvedValue(CTX_A)
    apiMocks.workspaceList.mockResolvedValue([
      { name: 'package.json', path: 'package.json', kind: 'file', size: 100, modifiedAt: '' },
    ])
    const opener = renderSidebar()
    await waitFor(() => expect(screen.getByTitle('package.json')).toBeTruthy())
    fireEvent.click(screen.getByTitle('package.json'))
    expect(opener.openDocument).toHaveBeenCalledWith({
      id: 'file:/repo:package.json',
      providerId: 'workspace-file',
      kind: 'document',
      title: 'package.json',
      workspaceId: '/repo',
      capabilities: ['workspace:read'],
    })
  })

  it('Git 视图：点击变更行 → openDocument 收到 diff descriptor', async () => {
    apiMocks.workspaceGetRoot.mockResolvedValue(CTX_A)
    apiMocks.workspaceList.mockResolvedValue([])
    apiMocks.workspaceGitStatus.mockResolvedValue({
      isRepo: true,
      branch: 'main',
      changes: [
        { path: 'src/index.ts', index: ' ', workingTree: 'M', previousPath: undefined },
      ],
    })
    const opener = renderSidebar()
    await waitFor(() => expect(screen.getByText('▣ repo')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Git' }))
    await waitFor(() => expect(screen.getByTitle('src/index.ts')).toBeTruthy())
    fireEvent.click(screen.getByTitle('src/index.ts'))
    expect(opener.openDocument).toHaveBeenCalledWith({
      id: 'diff:/repo:src/index.ts',
      providerId: 'workspace-git-diff',
      kind: 'document',
      title: 'Git: src/index.ts',
      workspaceId: '/repo',
      capabilities: ['workspace:read'],
    })
  })

  it('root 变化订阅：收到事件后重取 root 并重渲染', async () => {
    apiMocks.workspaceGetRoot.mockResolvedValueOnce(CTX_A).mockResolvedValueOnce(CTX_B)
    apiMocks.workspaceList.mockResolvedValue([])
    renderSidebar()
    await waitFor(() => expect(screen.getByText('▣ repo')).toBeTruthy())

    const callback = apiMocks.workspaceOnRootChanged.mock.calls[0]?.[0]
    expect(callback).toBeTypeOf('function')
    callback?.({ rootPath: CTX_B.path, source: 'picker' })
    await waitFor(() => expect(screen.getByText('▣ other')).toBeTruthy())
    expect(apiMocks.workspaceGetRoot).toHaveBeenCalledTimes(2)
  })

  it('UI 状态恢复：展开目录经 ui-store 持久化（不抛异常）', async () => {
    apiMocks.workspaceGetRoot.mockResolvedValue(CTX_A)
    apiMocks.workspaceList.mockImplementation(async (_root: string, relative?: string) => {
      if (relative === 'src') {
        return [{ name: 'deep.ts', path: 'src/deep.ts', kind: 'file', size: 1, modifiedAt: '' }]
      }
      return [{ name: 'src', path: 'src', kind: 'directory', modifiedAt: '' }]
    })
    renderSidebar()
    await waitFor(() => expect(screen.getByTitle('src')).toBeTruthy())
    // 展开目录 → 懒加载子条目
    fireEvent.click(screen.getByTitle('src'))
    await waitFor(() => expect(screen.getByTitle('src/deep.ts')).toBeTruthy())
    await waitFor(() => {
      const saved = localStorage.getItem('innate.workspace.ui:%2Frepo')
      return typeof saved === 'string' && JSON.parse(saved).expandedDirs.includes('src')
    })
  })
})
