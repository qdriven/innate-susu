import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { SurfaceDescriptor } from '@dogic/core/surface'
import { createWorkspaceDocumentProviders } from './document-provider'
import { WorkspaceDocumentContext } from './document-context'
import type { WorkspaceDocumentOpener } from './document-context'
import type { WorkspaceApi } from '../shared/index'

const apiMocks = vi.hoisted(() => ({
  workspaceGetRoot: vi.fn(async () => null),
  workspacePickRoot: vi.fn(async () => null),
  workspaceList: vi.fn(async () => []),
  workspaceRead: vi.fn(async () => ({})),
  workspaceGitStatus: vi.fn(async () => ({ isRepo: true, branch: 'main', changes: [] })),
  workspaceGitDiff: vi.fn(async () => ({ path: '', unstaged: '', staged: '', truncated: false })),
  workspaceOnRootChanged: vi.fn(() => () => {}),
}))

function fileDescriptor(overrides?: Partial<SurfaceDescriptor>): SurfaceDescriptor {
  return {
    id: 'file:/repo:package.json',
    providerId: 'workspace-file',
    kind: 'document',
    title: 'package.json',
    workspaceId: '/repo',
    capabilities: ['workspace:read'],
    ...overrides,
  }
}

function renderView(providerId: string, descriptor: SurfaceDescriptor) {
  const opener: WorkspaceDocumentOpener = { openDocument: vi.fn() }
  const providers = createWorkspaceDocumentProviders(apiMocks as unknown as WorkspaceApi)
  const provider = providers.find((p) => p.id === providerId)
  if (!provider) throw new Error(`provider 未注册: ${providerId}`)
  render(
    <WorkspaceDocumentContext.Provider value={opener}>
      <provider.View descriptor={descriptor} active onRequestClose={() => {}} />
    </WorkspaceDocumentContext.Provider>,
  )
  return opener
}

describe('W3.4 WorkspaceDocumentProviders（中栏文档标签视图）', () => {
  beforeEach(() => {
    localStorage.clear()
    apiMocks.workspaceRead.mockResolvedValue({ path: '/repo/package.json', name: 'package.json', kind: 'text', content: 'hello', size: 5, truncated: false })
    apiMocks.workspaceGitDiff.mockResolvedValue({ path: 'src/index.ts', unstaged: '-1', staged: '+1', truncated: false })
  })

  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('工厂注册 workspace-file 与 workspace-git-diff 两个 document provider', () => {
    const providers = createWorkspaceDocumentProviders(apiMocks as unknown as WorkspaceApi)
    expect(providers.map((p) => p.id)).toEqual(['workspace-file', 'workspace-git-diff'])
    for (const provider of providers) {
      expect(provider.kind).toBe('document')
      expect(typeof provider.View).toBe('function')
    }
  })

  it('文本文件读取成功：渲染预览内容', async () => {
    renderView('workspace-file', fileDescriptor())
    await waitFor(() => expect(screen.getByText('hello')).toBeTruthy())
  })

  it('截断文件跳过高亮：保留纯文本 + 截断提示（错误隔离）', async () => {
    apiMocks.workspaceRead.mockResolvedValue({
      path: '/repo/big.txt', name: 'big.txt', kind: 'text', content: 'partial', size: 3_000_000, truncated: true,
    })
    renderView('workspace-file', fileDescriptor({ id: 'file:/repo:big.txt', title: 'big.txt' }))
    await waitFor(() => expect(screen.getByText('partial')).toBeTruthy())
    expect(screen.getByText(/仅预览前 2 MB/)).toBeTruthy()
  })

  it('读取失败：错误只影响当前文档（workspace-error 显式，不抛出）', async () => {
    apiMocks.workspaceRead.mockRejectedValue(new Error('读取失败'))
    renderView('workspace-file', fileDescriptor())
    await waitFor(() => expect(screen.getByText('读取失败')).toBeTruthy())
    expect(screen.getByText('读取失败').className).toContain('workspace-error')
  })

  it('stale root：descriptor.workspaceId 与 id 不匹配 → 隔离错误', async () => {
    renderView('workspace-file', fileDescriptor({ id: 'file:/other:package.json' }))
    await waitFor(() => expect(screen.getByText(/不匹配/)).toBeTruthy())
  })

  it('缺 workspaceId → 显式错误', () => {
    renderView('workspace-file', fileDescriptor({ workspaceId: undefined }))
    expect(screen.getByText('工作区文档缺少 workspaceId')).toBeTruthy()
  })

  it('diff 文档：workspaceGitDiff 成功渲染 diff-preview', async () => {
    renderView('workspace-git-diff', fileDescriptor({
      id: 'diff:/repo:src/index.ts',
      providerId: 'workspace-git-diff',
      title: 'Git: src/index.ts',
    }))
    await waitFor(() => expect(screen.getByText('未暂存变更')).toBeTruthy())
    expect(screen.getByText('已暂存变更')).toBeTruthy()
    expect(screen.getByText('-1')).toBeTruthy()
  })

  it('diff 文档读取失败：错误隔离（workspace-error）', async () => {
    apiMocks.workspaceGitDiff.mockRejectedValue(new Error('diff 读取失败'))
    renderView('workspace-git-diff', fileDescriptor({
      id: 'diff:/repo:src/index.ts',
      providerId: 'workspace-git-diff',
      title: 'Git: src/index.ts',
    }))
    await waitFor(() => expect(screen.getByText('diff 读取失败')).toBeTruthy())
  })
})
