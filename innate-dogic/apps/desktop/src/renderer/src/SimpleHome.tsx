import type { JSX } from 'react'
import type { HarnessState, StatusSnapshot } from '@dogic/core'
import { api } from './api'

interface Props {
  status: StatusSnapshot | null
  harness: HarnessState
  launching: boolean
  launchMsg: string
  onLaunch: () => void
  onStop: () => void
  onOpenSettings: () => void
}

/** M2 T2.3：simple 首页——状态灯 + 开始对话，无网关/接线等术语 */
export default function SimpleHome(props: Props): JSX.Element {
  const { status, harness, launching, launchMsg, onLaunch, onStop, onOpenSettings } = props
  const gwOk = status?.gateway.running === true
  const hasModels = (status?.gateway.modelsCount ?? 0) > 0
  const dshOk = status?.dsh.installed === true
  const level = !gwOk ? 'bad' : !hasModels ? 'warn' : 'ok'
  const lampText = !gwOk
    ? '模型服务未启动'
    : !hasModels
      ? '还没有可用模型'
      : `模型已就绪 · ${status?.gateway.modelsCount} 个可用`
  const canLaunch = gwOk && hasModels && dshOk

  return (
    <main className="main simple-home">
      <div className="simple-hero">
        <span className={`status-lamp ${level}`} />
        <h1>{lampText}</h1>
        <p className="dim">
          {level === 'ok'
            ? '一切就绪，开始你的对话。'
            : '到设置页完成模型来源配置后即可使用。'}
        </p>
        <div className="hero-actions">
          <button
            className="primary"
            disabled={!canLaunch || launching}
            onClick={onLaunch}
            title={canLaunch ? '' : '请先完成设置（模型服务 + 可用模型 + dsh 已安装）'}
          >
            {launching ? '启动中…' : harness.phase === 'running' ? '打开对话' : '开始对话'}
          </button>
          {harness.phase === 'running' && <button onClick={onStop}>停止</button>}
          {level !== 'ok' && <button onClick={onOpenSettings}>去设置</button>}
          {harness.phase === 'failed' && (
            <button className="small" onClick={() => void api.openLogs()}>查看日志</button>
          )}
        </div>
        {!dshOk && (
          <p className="simple-hint">尚未安装 dsh：npm install -g @deepseek-ai/dsh</p>
        )}
        {harness.phase === 'failed' && (
          <p className="simple-hint">启动失败：修复后再次点击「开始对话」，或先查看日志定位原因。</p>
        )}
        {launchMsg && <p className="simple-hint">{launchMsg}</p>}
        {harness.phase !== 'idle' && (
          <p className={`harness-state ${harness.phase}`}>{harness.message}</p>
        )}
      </div>
    </main>
  )
}
