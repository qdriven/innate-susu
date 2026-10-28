import type { JSX } from 'react'
import type { AppMode, StatusSnapshot } from '@dogic/core'
import TitlebarStrip from './shell/TitlebarStrip'

interface TitlebarProps {
  mode: AppMode
  pageLabel: string
  status: StatusSnapshot | null
  onSwitchMode: () => void
}

/** 保持 App 现有 props 边界；W2 前不把网关状态接入顶栏。 */
export default function Titlebar({ mode, pageLabel, onSwitchMode }: TitlebarProps): JSX.Element {
  return <TitlebarStrip mode={mode} pageLabel={pageLabel} onSwitchMode={onSwitchMode} />
}
