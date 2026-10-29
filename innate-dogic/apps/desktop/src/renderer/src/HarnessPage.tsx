import type { JSX } from 'react'
import type { HarnessState, StatusSnapshot } from '@dogic/core'
import type { SurfaceDescriptor } from '@dogic/core/surface'
import SimpleHome from './SimpleHome'
import SurfaceSlot from './surfaces/SurfaceSlot'
import { HARNESS_SURFACE_ID } from './surfaces/catalog'
import type { SurfaceProviderRegistry } from './surfaces/provider-registry'
import type { SurfaceTabs } from './surfaces/surface-tabs'

interface Props {
  status: StatusSnapshot | null
  harness: HarnessState
  launching: boolean
  launchMsg: string
  onLaunch(): void
  onStop(): void
  onOpenSettings(): void
  tabs: SurfaceTabs
  providers: SurfaceProviderRegistry
  onSwitchSurface(descriptor: SurfaceDescriptor): void
  onCloseSurface(descriptor: SurfaceDescriptor): void
}

/**
 * 对话页（W1c.2）：Harness 是统一中栏槽里的一个 Surface。
 *
 * Harness 未运行时回落到本地启动页（不白屏、不阻塞壳）；运行后由 SurfaceSlot
 * 承载标签条与视图本体，切换标签只 detach。
 */
export default function HarnessPage(props: Props): JSX.Element {
  const { harness, tabs, providers, onSwitchSurface, onCloseSurface } = props
  const running = harness.phase === 'running'

  return (
    <div className="harness-page">
      {running ? (
        <SurfaceSlot
          tabs={tabs}
          providers={providers}
          focusId={HARNESS_SURFACE_ID}
          fallback={<SimpleHome {...props} />}
          trailing={<button className="small" onClick={props.onStop}>停止</button>}
          onSwitch={onSwitchSurface}
          onClose={onCloseSurface}
        />
      ) : (
        <SimpleHome {...props} />
      )}
    </div>
  )
}
