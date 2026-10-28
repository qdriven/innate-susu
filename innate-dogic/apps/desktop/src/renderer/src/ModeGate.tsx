import type { JSX } from 'react'
import type { AppMode } from '@dogic/core'

/** M2 T2.2：首启模式选择（readMode 为 null 时出现） */
export default function ModeGate(props: { onChoose: (mode: AppMode) => void }): JSX.Element {
  return (
    <div className="mode-gate">
      <div className="mode-gate-inner">
        <h1>选择使用方式</h1>
        <p className="dim">随时可以切换，设置里一键更换。</p>
        <div className="mode-cards">
          <button className="mode-card" onClick={() => props.onChoose('simple')}>
            <span className="mode-card-icon">◍</span>
            <span className="mode-card-title">简易使用</span>
            <span className="mode-card-desc">对话 + 模型设置，两步上手。适合只想安静使用的人。</span>
          </button>
          <button className="mode-card" onClick={() => props.onChoose('dev')}>
            <span className="mode-card-icon">⌘</span>
            <span className="mode-card-title">开发工作台</span>
            <span className="mode-card-desc">总览、模型目录、magpie 控制台与工具全开放。</span>
          </button>
        </div>
      </div>
    </div>
  )
}
