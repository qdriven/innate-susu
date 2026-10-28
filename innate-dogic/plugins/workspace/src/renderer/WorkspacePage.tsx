import { useCallback, useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { SurfaceRegistry } from '@dogic/core/surface'
import type { SurfaceRecord } from '@dogic/core/surface'
import type { GitChange, GitDiff, GitStatus, WorkspaceApi, WorkspaceFile, WorkspaceRoot } from '../shared/index.js'
import { FilePreview } from './FilePreview.js'
import { FileTree } from './FileTree.js'
import { GitPanel } from './GitPanel.js'

const fileSurfaceId = (relative: string): string => `file:${relative}`
const diffSurfaceId = (relative: string): string => `diff:${relative}`
const storageKey = (root: string): string => `innate.workspace.surfaces:${encodeURIComponent(root)}`

export default function WorkspacePage({ api }: { api: WorkspaceApi }): JSX.Element {
  const registryRef = useRef<SurfaceRegistry | null>(null)
  if (!registryRef.current) registryRef.current = new SurfaceRegistry()
  const registry = registryRef.current
  const restoredRoot = useRef<string | undefined>(undefined)
  const [root, setRoot] = useState<WorkspaceRoot | null>(null)
  const [surfaces, setSurfaces] = useState<SurfaceRecord[]>([])
  const [activeSurfaceId, setActiveSurfaceId] = useState<string>()
  const [side, setSide] = useState<'files' | 'git'>('files')
  const [refreshToken, setRefreshToken] = useState(0)
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null)
  const [gitLoading, setGitLoading] = useState(false)
  const [diff, setDiff] = useState<GitDiff | null>(null)
  const [error, setError] = useState('')

  const syncSurfaces = useCallback(() => {
    setSurfaces(registry.list())
    setActiveSurfaceId(registry.active()?.id)
    if (restoredRoot.current) {
      localStorage.setItem(storageKey(restoredRoot.current), JSON.stringify(registry.snapshot()))
    }
  }, [registry])

  useEffect(() => {
    void api.workspaceGetRoot().then(setRoot).catch(() => setRoot(null))
  }, [api])

  // 每个工作区只恢复安全描述；文件与 diff 内容重新经只读 API 加载。
  useEffect(() => {
    if (!root || restoredRoot.current === root.path) return
    restoredRoot.current = root.path
    registry.clear()
    setFiles([])
    setDiff(null)
    setError('')
    const key = storageKey(root.path)
    try {
      const saved = localStorage.getItem(key)
      if (saved) registry.restore(JSON.parse(saved))
    } catch {
      localStorage.removeItem(key)
    }
    syncSurfaces()
    const restored = registry.list()
    void Promise.all(restored.map(async (surface) => {
      if (surface.providerId === 'workspace-file') {
        const file = await api.workspaceRead(root.path, surface.id.slice('file:'.length))
        setFiles((current) => [...current.filter((item) => item.path !== file.path), file])
      } else if (surface.providerId === 'workspace-git-diff') {
        setDiff(await api.workspaceGitDiff(root.path, surface.id.slice('diff:'.length)))
      }
    })).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason))
    })
  }, [api, root, registry, syncSurfaces])

  const refreshGit = useCallback(async () => {
    if (!root) return
    setGitLoading(true)
    try {
      setGitStatus(await api.workspaceGitStatus(root.path))
    } finally {
      setGitLoading(false)
    }
  }, [api, root])

  useEffect(() => {
    setGitStatus(null)
    void refreshGit()
  }, [refreshGit, refreshToken])

  const chooseRoot = async (): Promise<void> => {
    const selected = await api.workspacePickRoot()
    if (selected) setRoot(selected)
  }

  const openFile = useCallback(async (relative: string) => {
    if (!root) return
    try {
      const file = await api.workspaceRead(root.path, relative)
      const id = fileSurfaceId(relative)
      registry.open({
        id,
        providerId: 'workspace-file',
        kind: 'document',
        title: file.name,
        workspaceId: root.path,
        capabilities: ['workspace:read'],
      })
      registry.activate(id)
      setFiles((current) => [...current.filter((item) => item.path !== file.path), file])
      setError('')
      syncSurfaces()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }, [api, root, registry, syncSurfaces])

  const openDiff = async (change: GitChange): Promise<void> => {
    if (!root) return
    try {
      const value = await api.workspaceGitDiff(root.path, change.path)
      const id = diffSurfaceId(change.path)
      registry.open({
        id,
        providerId: 'workspace-git-diff',
        kind: 'document',
        title: `Git: ${change.path}`,
        workspaceId: root.path,
        capabilities: ['workspace:read'],
      })
      registry.activate(id)
      setDiff(value)
      setError('')
      syncSurfaces()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  const activateSurface = (id: string): void => {
    registry.activate(id)
    syncSurfaces()
  }

  const closeSurface = (surface: SurfaceRecord): void => {
    registry.close(surface.id)
    if (surface.providerId === 'workspace-file') {
      setFiles((current) => current.filter((file) => fileSurfaceId(file.path) !== surface.id))
    } else if (surface.providerId === 'workspace-git-diff') {
      setDiff(null)
    }
    syncSurfaces()
  }

  const activeSurface = surfaces.find((surface) => surface.id === activeSurfaceId)
  const activeFile = activeSurface?.providerId === 'workspace-file'
    ? files.find((file) => fileSurfaceId(file.path) === activeSurface.id)
    : undefined
  const activeDiff = activeSurface?.providerId === 'workspace-git-diff' ? diff : null
  const refresh = (): void => setRefreshToken((value) => value + 1)

  return (
    <div className="workspace-page">
      <div className="workspace-tabstrip">
        <button className="workspace-root-switch" onClick={() => void chooseRoot()} title="选择工作区目录">
          {root ? `▣ ${root.name}` : '选择工作区'}
        </button>
        {surfaces.map((surface) => (
          <div key={surface.id} className={`workspace-tab ${activeSurfaceId === surface.id ? 'current' : ''}`}>
            <button onClick={() => activateSurface(surface.id)}>{surface.title}</button>
            <button
              className="workspace-tab-close"
              aria-label={`关闭 ${surface.title}`}
              onClick={() => closeSurface(surface)}
            >×</button>
          </div>
        ))}
      </div>

      <div className="workspace-layout">
        <main className="workspace-document">
          {error && <div className="workspace-error">{error}</div>}
          {!root ? (
            <div className="workspace-empty">
              <h2>打开一个工作区</h2>
              <p>文件、Markdown 和 Git 都限制在所选目录内。</p>
              <button className="primary" onClick={() => void chooseRoot()}>选择目录</button>
            </div>
          ) : activeDiff ? (
            <DiffPreview diff={activeDiff} />
          ) : activeFile ? (
            <FilePreview api={api} root={root.path} file={activeFile} onOpenFile={(path) => void openFile(path)} />
          ) : (
            <div className="workspace-empty">
              <h2>{root.name}</h2>
              <p>从右侧文件树打开文件，或从 Git 面板查看变更。</p>
            </div>
          )}
        </main>

        <aside className="workspace-sidebar">
          <div className="workspace-activity">
            <button className={side === 'files' ? 'current' : ''} onClick={() => setSide('files')}>文件</button>
            <button className={side === 'git' ? 'current' : ''} onClick={() => setSide('git')}>Git</button>
            <button className="workspace-refresh" title="刷新当前面板" onClick={refresh}>↻</button>
          </div>
          <div className="workspace-panel-body">
            {!root ? <p className="workspace-message">尚未选择工作区。</p> : side === 'files' ? (
              <FileTree api={api} root={root} selectedPath={activeFile?.path ?? ''} refreshToken={refreshToken} onOpen={(path) => void openFile(path)} />
            ) : (
              <GitPanel status={gitStatus} loading={gitLoading} selectedPath={activeDiff?.path} onSelect={(change) => void openDiff(change)} onRefresh={refresh} />
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function DiffPreview({ diff }: { diff: GitDiff }): JSX.Element {
  return (
    <div className="diff-preview">
      <section>
        <h3>未暂存变更</h3>
        <pre>{diff.unstaged || '没有未暂存 diff。'}</pre>
      </section>
      <section>
        <h3>已暂存变更</h3>
        <pre>{diff.staged || '没有已暂存 diff。'}</pre>
      </section>
      {!diff.unstaged && !diff.staged && <p className="workspace-message">未跟踪文件不会产生 Git diff，可从文件树查看内容。</p>}
    </div>
  )
}
