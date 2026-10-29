import type { JSX } from 'react'
import type { AppMode, ConsoleStatusEvent, GatewayStatusEvent } from '@dogic/core'
import { consolePill, gatewayPill, type StatusPillView } from './status-pills'

export interface StatusPillsProps {
  gateway: GatewayStatusEvent | null
  consoleStatus: ConsoleStatusEvent | null
  mode: AppMode
  onStartGateway: () => void
}

/** W2.5 顶栏状态 pill：网关与控制台各一枚，区分显示（Harness 位留 R1）。 */
export default function StatusPills({ gateway, consoleStatus, mode, onStartGateway }: StatusPillsProps): JSX.Element {
  const gw = gateway ? gatewayPill(gateway) : undefined
  const con = consoleStatus ? consolePill(consoleStatus) : undefined
  if (!gw && !con) return <></>

  const renderPill = (pill: StatusPillView, testId: string, clickable: boolean): JSX.Element => {
    const content = (
      <>
        <span className={`dot ${pill.tone}`} aria-hidden />
        <span>{pill.label}</span>
        {mode === 'dev' && pill.hint && <span className="status-pill-hint">{pill.hint}</span>}
      </>
    )
    const cls = `pill status-pill${clickable ? ' clickable' : ''}`
    const title = pill.detail ? `${pill.hint ? `${pill.hint} · ` : ''}${pill.detail}` : pill.hint
    if (clickable && pill.action === 'start') {
      return (
        <button type="button" className={cls} data-testid={testId} title={title ?? ''} onClick={onStartGateway}>
          {content}
        </button>
      )
    }
    return (
      <span className={cls} data-testid={testId} title={title ?? ''}>
        {content}
      </span>
    )
  }

  return (
    <div className="status-pills">
      {gw && renderPill(gw, 'pill-gateway', gw.action === 'start')}
      {con && renderPill(con, 'pill-console', false)}
    </div>
  )
}
