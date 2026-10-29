import type { JSX } from 'react'
import type { AppMode, ConsoleStatusEvent, GatewayStatusEvent, StatusSnapshot } from '@dogic/core'
import TitlebarStrip from './shell/TitlebarStrip'

interface TitlebarProps {
  mode: AppMode
  pageLabel: string
  status: StatusSnapshot | null
  gatewayStatus?: GatewayStatusEvent | null
  consoleStatus?: ConsoleStatusEvent | null
  onStartGateway?: () => void
  onSwitchMode: () => void
}

/** W2.5：网关/控制台状态 pill 挂入 W1a.3 预留的状态槽。 */
export default function Titlebar({
  mode,
  pageLabel,
  gatewayStatus,
  consoleStatus,
  onStartGateway,
  onSwitchMode,
}: TitlebarProps): JSX.Element {
  return (
    <TitlebarStrip
      mode={mode}
      pageLabel={pageLabel}
      gatewayStatus={gatewayStatus}
      consoleStatus={consoleStatus}
      onStartGateway={onStartGateway}
      onSwitchMode={onSwitchMode}
    />
  )
}
