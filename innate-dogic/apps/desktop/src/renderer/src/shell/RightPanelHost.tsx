import type { JSX } from 'react'

/**
 * 壳右栏挂载点（W1b.3）：可拆卸空容器。
 * 本阶段不带任何业务语义——不导入 W3 Panel、不发起新 IPC；
 * dev 模式挂载、simple 不渲染；移除后中栏与导航不受影响。
 */
export default function RightPanelHost(): JSX.Element {
  return (
    <aside className="right-panel" data-testid="right-panel" aria-label="右栏面板区">
      <p className="right-panel-empty" aria-hidden>右栏（W3 接入）</p>
    </aside>
  )
}
