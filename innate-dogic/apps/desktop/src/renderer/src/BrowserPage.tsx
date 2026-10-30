import { useCallback, useRef, useSyncExternalStore } from 'react'
import type { JSX } from 'react'
import { api } from './api'
import SurfaceSlot from './surfaces/SurfaceSlot'
import { BROWSER_PROVIDER_ID, browserSurface } from './surfaces/catalog'
import type { SurfaceDescriptor } from '@dogic/core/surface'
import type { SurfaceProviderRegistry } from './surfaces/provider-registry'
import type { SurfaceTabs } from './surfaces/surface-tabs'

interface Props {
  tabs: SurfaceTabs
  providers: SurfaceProviderRegistry
  onSwitchSurface(descriptor: SurfaceDescriptor): void
  onCloseSurface(descriptor: SurfaceDescriptor): void
}

/**
 * 浏览器页（W5.7）：browser 是统一中栏槽里的独立 Surface。
 *
 * - 「新建浏览器」按打开顺序派生 browser-N 标签 id（与终端页 terminal-N 同型）；
 * - 标签切换只隐藏视图（store detach），会话与历史保留；
 * - simple 模式页面注册表不含浏览器（pagesForMode 门控），标签条不可见；
 * - 浏览器初始为空白页（deferredUrl），URL 一律经地址栏提交并由 main
 *   策略层白名单校验——本页不持有任何 URL 解析或脚本执行通道。
 */
export default function BrowserPage({ tabs, providers, onSwitchSurface, onCloseSurface }: Props): JSX.Element {
  const counterRef = useRef(0)
  useSyncExternalStore(tabs.subscribe, tabs.getRevision, tabs.getRevision)
  const snapshot = tabs.snapshot()
  const browserSurfaces = snapshot.surfaces.filter((surface) => surface.providerId === BROWSER_PROVIDER_ID)
  const activeBrowser = snapshot.activeId && browserSurfaces.some((surface) => surface.id === snapshot.activeId)
    ? snapshot.activeId
    : undefined

  const openBrowser = useCallback((): void => {
    counterRef.current += 1
    const id = `browser-${counterRef.current}`
    tabs.open(browserSurface(id, counterRef.current))
    tabs.activate(id)
  }, [tabs])

  return (
    <div className="terminal-page">
      <div className="terminal-toolbar">
        <button type="button" className="primary" onClick={openBrowser}>
          新建浏览器
        </button>
      </div>
      {browserSurfaces.length > 0 ? (
        <SurfaceSlot
          tabs={tabs}
          providers={providers}
          focusId={activeBrowser}
          fallback={<BrowserEmpty />}
          onSwitch={onSwitchSurface}
          onClose={onCloseSurface}
        />
      ) : (
        <BrowserEmpty />
      )}
    </div>
  )
}

function BrowserEmpty(): JSX.Element {
  return (
    <div className="workspace-empty">
      <h2>浏览器</h2>
      <p>点击上方「新建浏览器」打开受控浏览 Surface。导航经地址栏提交，协议白名单与凭据检查在主进程执行。</p>
    </div>
  )
}
