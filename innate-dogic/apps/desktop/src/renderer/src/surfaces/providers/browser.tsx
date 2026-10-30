import { BrowserPanel } from '@dogic/plugin-browser/renderer'
import type { BrowserPanelApi } from '@dogic/plugin-browser/renderer'
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
 */
export function createBrowserProvider(api: BrowserPanelApi): SurfaceProvider {
  function View(props: SurfaceViewProps): JSX.Element {
    const { descriptor, active, onRequestClose } = props
    return (
      <BrowserPanel
        api={api}
        descriptor={descriptor}
        active={active}
        onRequestClose={onRequestClose}
      />
    )
  }

  return {
    id: BROWSER_PROVIDER_ID,
    kind: 'webcontents',
    View,
    close: (descriptor: SurfaceDescriptor) => api.surfaceClose(descriptor.id),
  }
}
