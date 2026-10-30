import { BrowserPanel } from '@dogic/plugin-browser/renderer'
import type { BrowserPanelApi } from '@dogic/plugin-browser/renderer'
import type { BrowserLayoutStore } from '@dogic/plugin-browser/renderer'
import type { JSX } from 'react'
import type { SurfaceDescriptor } from '@dogic/core/surface'
import type { SurfaceProvider, SurfaceViewProps } from '../provider-registry'
import { BROWSER_PROVIDER_ID } from '../catalog'

/**
 * browser Surface provider（W5.3）：地址栏面板 + 宿主视图生命周期。
 *
 * 视图本体在主进程 WebContentsView（kind=webcontents，经 SurfaceHost 挂载），
 * 面板提供地址栏/前进后退/刷新/停止/加载进度；导航守卫在 main 侧强制执行
 * （页面内导航与重定向同样过协议白名单）。
 *
 * W5.6：可注入布局持久化 store（安全浏览布局快照）。面板挂载时消费恢复
 * URL 并用户可见地重新导航，导航后保存当前普通 URL；标签关闭时清理。
 */
export function createBrowserProvider(api: BrowserPanelApi, layout?: BrowserLayoutStore): SurfaceProvider {
  function View(props: SurfaceViewProps): JSX.Element {
    const { descriptor, active, onRequestClose } = props
    return (
      <BrowserPanel
        api={api}
        descriptor={descriptor}
        active={active}
        onRequestClose={onRequestClose}
        layout={layout}
      />
    )
  }

  return {
    id: BROWSER_PROVIDER_ID,
    kind: 'webcontents',
    View,
    close: (descriptor: SurfaceDescriptor) => {
      layout?.clear(descriptor.id)
      return api.surfaceClose(descriptor.id)
    },
  }
}
