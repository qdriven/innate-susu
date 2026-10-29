import type { JSX } from 'react'
import { WorkspaceSidebar } from '../plugin-registry'

/**
 * 壳右栏挂载点（W1b.3）：dev 模式常驻工作区侧栏。
 * simple 模式不渲染；移除后中栏与导航不受影响。
 */
export default function RightPanelHost(): JSX.Element {
  return (
    <aside className="right-panel" data-testid="right-panel" aria-label="工作区面板">
      <WorkspaceSidebar />
    </aside>
  )
}
