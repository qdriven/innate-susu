import type { JSX } from 'react'
import type { GitDiff } from '../shared/index.js'

/** Git diff 纯展示组件（从 WorkspacePage 抽出）；无状态、无副作用。 */
export function DiffPreview({ diff }: { diff: GitDiff }): JSX.Element {
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
      {!diff.unstaged && !diff.staged && (
        <p className="workspace-message">未跟踪文件不会产生 Git diff，可从文件树查看内容。</p>
      )}
    </div>
  )
}
