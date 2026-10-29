import { Component, useSyncExternalStore } from 'react'
import type { ErrorInfo, JSX, ReactNode } from 'react'
import type { SurfaceDescriptor } from '@dogic/core/surface'
import type { SurfaceProviderRegistry } from './provider-registry'
import type { SurfaceTabs } from './surface-tabs'
import SurfaceError from './SurfaceError'

export interface SurfaceSlotProps {
  tabs: SurfaceTabs
  providers: SurfaceProviderRegistry
  /** 没有可用 Surface 时的本地页面（对话启动页、控制台提示等）。 */
  fallback: ReactNode
  /** 标签条尾部的壳级动作（如「停止」）。 */
  trailing?: ReactNode
  /**
   * 当前页面期望展示的 Surface。给了它就不会激活别的 Surface——
   * 避免恢复出来的旧激活项在别的页面抢先 attach。
   */
  focusId?: string
  /**
   * 内容页模式（W3.4）：标签条与正文只显示 workspace-* provider 的 Surface；
   * 无活跃 workspace 文档时回落 fallback（页面内容）。
   */
  contentMode?: boolean
  onSwitch(descriptor: SurfaceDescriptor): void
  onClose(descriptor: SurfaceDescriptor): void
}

interface BoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface BoundaryState {
  failed: boolean
}

/** 单个 provider 渲染异常不得拖垮整个壳。 */
class SurfaceBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[surface] provider 渲染失败，壳与其它 Surface 不受影响', error.message, info.componentStack)
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * 中栏统一 Surface 槽（W1c.2）。
 *
 * 标签条只认安全 descriptor 与 provider 注册表，不感知 Harness / magpie 私有类型；
 * 切换只换激活项（主进程 detach），显式关闭才销毁宿主视图。
 */
export default function SurfaceSlot({
  tabs,
  providers,
  fallback,
  trailing,
  focusId,
  contentMode,
  onSwitch,
  onClose,
}: SurfaceSlotProps): JSX.Element {
  useSyncExternalStore(tabs.subscribe, tabs.getRevision, tabs.getRevision)
  useSyncExternalStore(providers.subscribe, providers.getRevision, providers.getRevision)

  const snapshot = tabs.snapshot()
  const visible = snapshot.surfaces.filter((surface) => {
    if (providers.isDisabled(surface.providerId)) return false
    if (contentMode && !surface.providerId.startsWith('workspace-')) return false
    return true
  })
  if (visible.length === 0) return <>{fallback}</>

  const focused = focusId ? visible.find((surface) => surface.id === focusId) : undefined
  const active = focusId
    ? focused
    : visible.find((surface) => surface.id === snapshot.activeId) ?? visible[0]
  const provider = active ? providers.get(active.providerId) : undefined

  return (
    <div className="surface-slot">
      <div className="surface-tabstrip" role="tablist" aria-label="Surface 标签" data-testid="surface-tabs">
        {visible.map((surface) => (
          <div key={surface.id} className={`surface-tab ${active?.id === surface.id ? 'current' : ''}`}>
            <button
              type="button"
              role="tab"
              aria-selected={active?.id === surface.id}
              title={surface.title}
              onClick={() => onSwitch(surface)}
            >
              {surface.title}
            </button>
            <button
              type="button"
              className="surface-tab-close"
              aria-label={`关闭 ${surface.title}`}
              onClick={() => onClose(surface)}
            >
              ×
            </button>
          </div>
        ))}
        {trailing && <div className="surface-tabstrip-trailing">{trailing}</div>}
      </div>
      <div className="surface-slot-body">
        {active && provider ? (
          <SurfaceBoundary
            key={active.id}
            fallback={(
              <SurfaceError
                title="Surface 渲染失败"
                detail="该 Surface 已停止响应；壳、导航与其它 Surface 不受影响。"
                actions={[{ label: '关闭标签', run: () => onClose(active) }]}
              />
            )}
          >
            <provider.View descriptor={active} active onRequestClose={() => onClose(active)} />
          </SurfaceBoundary>
        ) : active ? (
          <SurfaceError
            title="Surface provider 不可用"
            detail={`未注册的 provider：${active.providerId}`}
            actions={[{ label: '关闭标签', run: () => onClose(active) }]}
          />
        ) : (
          fallback
        )}
      </div>
    </div>
  )
}
