import type { JSX } from 'react'
import type { SurfaceDescriptor } from '@dogic/core/surface'
import { api } from './api'
import SurfaceSlot from './surfaces/SurfaceSlot'
import { MAGPIE_CONSOLE_SURFACE_ID } from './surfaces/catalog'
import type { SurfaceProviderRegistry } from './surfaces/provider-registry'
import type { SurfaceTabs } from './surfaces/surface-tabs'

interface Props {
  tabs: SurfaceTabs
  providers: SurfaceProviderRegistry
  onSwitchSurface(descriptor: SurfaceDescriptor): void
  onCloseSurface(descriptor: SurfaceDescriptor): void
  onReconnect(): void
}

/**
 * magpie 控制台页（W1c.2）：与 Harness 共用同一中栏槽与同一标签模型，
 * 本页只提供「控制台未打开」时的本地回落与重连动作。
 */
export default function ConsolePage(props: Props): JSX.Element {
  return (
    <div className="console-page">
      <SurfaceSlot
        tabs={props.tabs}
        providers={props.providers}
        focusId={MAGPIE_CONSOLE_SURFACE_ID}
        fallback={<ConsoleFallback onReconnect={props.onReconnect} />}
        onSwitch={props.onSwitchSurface}
        onClose={props.onCloseSurface}
      />
    </div>
  )
}

function ConsoleFallback({ onReconnect }: { onReconnect(): void }): JSX.Element {
  return (
    <div className="console-fallback">
      <p className="dim">magpie 控制台未打开。启动 magpie 后可在此重连，或用浏览器打开受管控制台。</p>
      <div className="row-btns">
        <button className="small" onClick={onReconnect}>重新连接</button>
        <button className="small" onClick={() => void api.openMagpieWeb()}>浏览器打开</button>
      </div>
    </div>
  )
}
