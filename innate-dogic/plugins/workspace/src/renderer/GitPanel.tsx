import type { JSX } from 'react'
import type { GitChange, GitStatus } from '../shared/index.js'

interface Props {
  status: GitStatus | null
  loading: boolean
  selectedPath?: string
  onSelect(change: GitChange): void
  onRefresh(): void
}

export function GitPanel({ status, loading, selectedPath, onSelect, onRefresh }: Props): JSX.Element {
  if (!status) return <p className="workspace-message">{loading ? '正在读取 Git 状态…' : '选择工作区后读取 Git 状态。'}</p>
  if (!status.isRepo) {
    return (
      <div className="workspace-message">
        <p>当前目录不是 Git 仓库。</p>
        {status.detail && <p className="dim">{status.detail}</p>}
      </div>
    )
  }
  return (
    <div className="git-panel">
      <div className="workspace-panel-heading">
        <span title={status.branch}>⑂ {status.branch}</span>
        <button className="small" onClick={onRefresh} disabled={loading}>刷新</button>
      </div>
      <div className="workspace-panel-subhead">变更 {status.changes.length}</div>
      {status.changes.length === 0 ? (
        <p className="workspace-message">工作区干净，没有未提交变更。</p>
      ) : status.changes.map((change) => (
        <button
          key={`${change.index}${change.workingTree}:${change.path}`}
          className={`git-change-row ${selectedPath === change.path ? 'current' : ''}`}
          onClick={() => onSelect(change)}
          title={change.previousPath ? `${change.previousPath} → ${change.path}` : change.path}
        >
          <span className={`git-status git-${statusClass(change)}`}>{statusLabel(change)}</span>
          <span className="file-tree-name">{change.path}</span>
        </button>
      ))}
    </div>
  )
}

function statusLabel(change: GitChange): string {
  if (change.workingTree === '?' || change.index === '?') return 'U'
  if (change.index !== ' ') return change.index
  return change.workingTree
}

function statusClass(change: GitChange): string {
  const status = statusLabel(change)
  if (status === 'D') return 'deleted'
  if (status === 'U') return 'untracked'
  return 'modified'
}
