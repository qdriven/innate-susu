import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { SurfaceDescriptor } from '@dogic/core/surface'
import type { GitChange, GitStatus, WorkspaceApi, WorkspaceContext, WorkspaceRootChanged } from '../shared/index.js'
import {
  WORKSPACE_FILE_PROVIDER_ID,
  WORKSPACE_GIT_DIFF_PROVIDER_ID,
  parseWorkspaceDocumentId,
  workspaceDiffId,
  workspaceFileId,
} from '../shared/document-id.js'
import { FileTree } from './FileTree.js'
import { GitPanel } from './GitPanel.js'
import { useWorkspaceDocument } from './document-context.js'
import {
  loadUiState,
  migrateLegacySurfaces,
  saveUiState,
  toggleDir,
  WORKSPACE_UI_VERSION,
  type WorkspaceSidebarView,
  type WorkspaceUiState,
} from './ui-store.js'

function toMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}

function diffDescriptor(workspaceId: string, relative: string): SurfaceDescriptor {
  return {
    id: workspaceDiffId(workspaceId, relative),
    providerId: WORKSPACE_GIT_DIFF_PROVIDER_ID,
    kind: 'document',
    title: `Git: ${relative}`,
    workspaceId,
    capabilities: ['workspace:read'],
  }
}

/**
 * 右栏工作区侧栏（W3.3）：root 选择 + 文件树 / Git 面板。
 * 文件点击与 Git 变更点击都通过 WorkspaceDocumentContext.openDocument 打开中栏文档标签，
 * 侧栏自身不持有文件内容或 SurfaceRegistry。
 */
export function createWorkspaceSidebar(api: WorkspaceApi): () => JSX.Element {
  return function WorkspaceSidebar(): JSX.Element {
    const { openDocument, activeDocument } = useWorkspaceDocument()
    const [ctx, setCtx] = useState<WorkspaceContext | null>(null)
    const [view, setView] = useState<WorkspaceSidebarView>('files')
    const [refreshToken, setRefreshToken] = useState(0)
    const [gitStatus, setGitStatus] = useState<GitStatus | null>(null)
    const [gitLoading, setGitLoading] = useState(false)
    const [ui, setUi] = useState<WorkspaceUiState | null>(null)

    // 一次性迁移旧 surfaces:* 键
    useEffect(() => {
      migrateLegacySurfaces()
    }, [])

    // 加载 root + 订阅 root 变化
    useEffect(() => {
      let active = true
      const apply = (c: WorkspaceContext | null): void => {
        if (!active) return
        setCtx(c)
        if (c) {
          const restored = loadUiState(c.workspaceId)
          setUi(restored)
          if (restored?.sidebarView) setView(restored.sidebarView)
        } else {
          setUi(null)
        }
      }
      void api.workspaceGetRoot().then(apply).catch(() => apply(null))
      const unsubscribe = api.workspaceOnRootChanged((changed: WorkspaceRootChanged) => {
        // shell 自身订阅 root 变化关闭旧文档；侧栏只刷新 root + UI 状态
        void api.workspaceGetRoot().then(apply).catch(() => apply(null))
      })
      return () => {
        active = false
        unsubscribe()
      }
    }, [api])

    // 激活 diff 文档时自动切到 Git 视图
    useEffect(() => {
      if (!activeDocument || !ctx) return
      try {
        const parsed = parseWorkspaceDocumentId(activeDocument.id, ctx.workspaceId)
        if (parsed.kind === 'diff') setView('git')
      } catch {
        /* stale 文档：忽略 */
      }
    }, [activeDocument, ctx])

    const refresh = useCallback((): void => {
      setRefreshToken((value) => value + 1)
    }, [])

    const refreshGit = useCallback(async (): Promise<void> => {
      if (!ctx) return
      setGitLoading(true)
      try {
        setGitStatus(await api.workspaceGitStatus(ctx.workspaceId))
      } finally {
        setGitLoading(false)
      }
    }, [api, ctx])

    useEffect(() => {
      setGitStatus(null)
      void refreshGit()
    }, [refreshGit, refreshToken])

    // 持久化 UI 状态（展开目录、侧栏视图）
    useEffect(() => {
      if (ctx && ui) saveUiState(ctx.workspaceId, ui)
    }, [ctx, ui])

    const chooseRoot = async (): Promise<void> => {
      const selected = await api.workspacePickRoot()
      if (selected) {
        setCtx(selected)
        setUi(loadUiState(selected.workspaceId))
      }
    }

    const openFile = useCallback((relative: string): void => {
      if (!ctx) return
      openDocument({
        id: workspaceFileId(ctx.workspaceId, relative),
        providerId: WORKSPACE_FILE_PROVIDER_ID,
        kind: 'document',
        title: relative.split('/').pop() ?? relative,
        workspaceId: ctx.workspaceId,
        capabilities: ['workspace:read'],
      })
    }, [ctx, openDocument])

    const openDiff = useCallback((change: GitChange): void => {
      if (!ctx) return
      openDocument(diffDescriptor(ctx.workspaceId, change.path))
    }, [ctx, openDocument])

    const onToggleDir = useCallback((path: string, expanded: boolean): void => {
      setUi((prev) => {
        const base: WorkspaceUiState =
          prev ?? {
            version: WORKSPACE_UI_VERSION,
            root: ctx?.workspaceId ?? '',
            expandedDirs: [],
            sidebarView: 'files',
          }
        return { ...base, expandedDirs: toggleDir(base.expandedDirs, path, expanded) }
      })
    }, [ctx])

    const activeRelative = ((): string | undefined => {
      if (!activeDocument || !ctx) return undefined
      try {
        return parseWorkspaceDocumentId(activeDocument.id, ctx.workspaceId).relative
      } catch {
        return undefined
      }
    })()
    const activeDiffPath =
      activeDocument?.providerId === WORKSPACE_GIT_DIFF_PROVIDER_ID ? activeRelative : undefined

    return (
      <div className="workspace-sidebar" data-testid="workspace-sidebar">
        <div className="workspace-root-bar">
          <button
            className="workspace-root-switch"
            onClick={() => void chooseRoot()}
            title="选择工作区目录"
          >
            {ctx ? `▣ ${ctx.name}` : '选择工作区'}
          </button>
          {ctx && (
            <button className="workspace-refresh" title="刷新" onClick={refresh}>↻</button>
          )}
        </div>
        <div className="workspace-activity">
          <button className={view === 'files' ? 'current' : ''} onClick={() => setView('files')}>文件</button>
          <button className={view === 'git' ? 'current' : ''} onClick={() => setView('git')}>Git</button>
        </div>
        <div className="workspace-panel-body">
          {!ctx ? (
            <div className="workspace-empty">
              <h2>打开一个工作区</h2>
              <p>文件、Markdown 和 Git 都限制在所选目录内。</p>
              <button className="primary" onClick={() => void chooseRoot()}>选择目录</button>
            </div>
          ) : view === 'files' ? (
            <FileTree
              api={api}
              root={ctx}
              selectedPath={activeRelative}
              refreshToken={refreshToken}
              expandedDirs={ui?.expandedDirs ?? []}
              onToggleDir={onToggleDir}
              onOpen={openFile}
            />
          ) : (
            <GitPanel
              status={gitStatus}
              loading={gitLoading}
              selectedPath={activeDiffPath}
              onSelect={openDiff}
              onRefresh={refresh}
            />
          )}
        </div>
      </div>
    )
  }
}
