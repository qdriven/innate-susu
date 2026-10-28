import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { WorkspaceApi, WorkspaceEntry, WorkspaceRoot } from '../shared/index.js'

interface TreeProps {
  api: WorkspaceApi
  root: WorkspaceRoot
  selectedPath?: string
  refreshToken: number
  onOpen(path: string): void
}

export function FileTree({ api, root, selectedPath, refreshToken, onOpen }: TreeProps): JSX.Element {
  const [entries, setEntries] = useState<WorkspaceEntry[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setEntries(await api.workspaceList(root.path))
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }, [api, root.path])

  useEffect(() => { void load() }, [load, refreshToken])

  if (error) return <p className="workspace-message bad-text">{error}</p>
  return (
    <div className="file-tree" role="tree" aria-label="工作区文件">
      {entries.map((entry) => (
        <FileTreeNode
          key={entry.path}
          api={api}
          root={root}
          entry={entry}
          depth={0}
          selectedPath={selectedPath}
          onOpen={onOpen}
        />
      ))}
      {entries.length === 0 && <p className="workspace-message">空目录</p>}
    </div>
  )
}

interface NodeProps {
  api: WorkspaceApi
  root: WorkspaceRoot
  entry: WorkspaceEntry
  depth: number
  selectedPath?: string
  onOpen(path: string): void
}

function FileTreeNode({ api, root, entry, depth, selectedPath, onOpen }: NodeProps): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<WorkspaceEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  const toggle = async (): Promise<void> => {
    if (entry.kind === 'file') {
      onOpen(entry.path)
      return
    }
    if (!expanded && !loaded) {
      setChildren(await api.workspaceList(root.path, entry.path))
      setLoaded(true)
    }
    setExpanded((value) => !value)
  }

  return (
    <>
      <button
        className={`file-tree-row ${selectedPath === entry.path ? 'current' : ''}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        title={entry.path}
        role="treeitem"
        aria-expanded={entry.kind === 'directory' ? expanded : undefined}
        onClick={() => void toggle()}
      >
        <span className="file-tree-icon">{entry.kind === 'directory' ? expanded ? '▾' : '▸' : '·'}</span>
        <span className="file-tree-name">{entry.name}</span>
      </button>
      {expanded && children.map((child) => (
        <FileTreeNode
          key={child.path}
          api={api}
          root={root}
          entry={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onOpen={onOpen}
        />
      ))}
    </>
  )
}
