import { useEffect, useState } from 'react'
import type { ComponentType, JSX } from 'react'
import type { SurfaceDescriptor, SurfaceKind } from '@dogic/core/surface'
import type { GitDiff, WorkspaceApi, WorkspaceFile } from '../shared/index.js'
import {
  WORKSPACE_FILE_PROVIDER_ID,
  WORKSPACE_GIT_DIFF_PROVIDER_ID,
  parseWorkspaceDocumentId,
  workspaceFileId,
} from '../shared/document-id.js'
import { FilePreview } from './FilePreview.js'
import { DiffPreview } from './DiffPreview.js'
import { useWorkspaceDocument } from './document-context.js'

/** 与 shell 的 SurfaceViewProps 结构一致；跨包结构化兼容，无需 core 导出 react 类型。 */
export interface WorkspaceSurfaceViewProps {
  descriptor: SurfaceDescriptor
  active: boolean
  onRequestClose(): void
}

export interface WorkspaceSurfaceProvider {
  readonly id: string
  readonly kind: SurfaceKind
  readonly View: ComponentType<WorkspaceSurfaceViewProps>
}

function basename(relative: string): string {
  const parts = relative.split('/')
  return parts[parts.length - 1] ?? relative
}

function fileDescriptor(workspaceId: string, relative: string): SurfaceDescriptor {
  return {
    id: workspaceFileId(workspaceId, relative),
    providerId: WORKSPACE_FILE_PROVIDER_ID,
    kind: 'document',
    title: basename(relative),
    workspaceId,
    capabilities: ['workspace:read'],
  }
}

function toMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}

function FileView({
  api,
  workspaceId,
  relative,
  onOpenFile,
}: {
  api: WorkspaceApi
  workspaceId: string
  relative: string
  onOpenFile(path: string): void
}): JSX.Element {
  const [file, setFile] = useState<WorkspaceFile>()
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setFile(undefined)
    setError('')
    api.workspaceRead(workspaceId, relative)
      .then((f) => { if (active) setFile(f) })
      .catch((reason: unknown) => { if (active) setError(toMessage(reason)) })
    return () => { active = false }
  }, [api, workspaceId, relative])

  if (error) return <div className="workspace-error">{error}</div>
  if (!file) return <p className="workspace-message">加载中…</p>
  return <FilePreview api={api} root={workspaceId} file={file} onOpenFile={onOpenFile} />
}

function DiffView({
  api,
  workspaceId,
  relative,
}: {
  api: WorkspaceApi
  workspaceId: string
  relative: string
}): JSX.Element {
  const [diff, setDiff] = useState<GitDiff>()
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setDiff(undefined)
    setError('')
    api.workspaceGitDiff(workspaceId, relative)
      .then((d) => { if (active) setDiff(d) })
      .catch((reason: unknown) => { if (active) setError(toMessage(reason)) })
    return () => { active = false }
  }, [api, workspaceId, relative])

  if (error) return <div className="workspace-error">{error}</div>
  if (!diff) return <p className="workspace-message">加载中…</p>
  return <DiffPreview diff={diff} />
}

/**
 * 工厂：创建 workspace-file 与 workspace-git-diff 两个 provider，共用同一视图按 id 分派。
 * View 在工厂内定义以闭包持有 api；工厂在 shell 模块作用域调用一次，身份稳定。
 */
export function createWorkspaceDocumentProviders(api: WorkspaceApi): WorkspaceSurfaceProvider[] {
  function WorkspaceDocumentView({ descriptor }: WorkspaceSurfaceViewProps): JSX.Element {
    const { openDocument } = useWorkspaceDocument()
    const { workspaceId } = descriptor

    if (!workspaceId) return <div className="workspace-error">工作区文档缺少 workspaceId</div>

    let parsed: { kind: 'file' | 'diff'; relative: string }
    try {
      parsed = parseWorkspaceDocumentId(descriptor.id, workspaceId)
    } catch (error) {
      return <div className="workspace-error">{toMessage(error)}</div>
    }

    if (parsed.kind === 'diff') {
      return <DiffView api={api} workspaceId={workspaceId} relative={parsed.relative} />
    }
    return (
      <FileView
        api={api}
        workspaceId={workspaceId}
        relative={parsed.relative}
        onOpenFile={(relative) => openDocument(fileDescriptor(workspaceId, relative))}
      />
    )
  }

  return [
    { id: WORKSPACE_FILE_PROVIDER_ID, kind: 'document', View: WorkspaceDocumentView },
    { id: WORKSPACE_GIT_DIFF_PROVIDER_ID, kind: 'document', View: WorkspaceDocumentView },
  ]
}
