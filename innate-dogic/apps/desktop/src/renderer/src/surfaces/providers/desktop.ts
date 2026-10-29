import { api } from '../../api'
import { HARNESS_PROVIDER_ID, MAGPIE_CONSOLE_PROVIDER_ID } from '../catalog'
import { SurfaceProviderRegistry } from '../provider-registry'
import type { SurfaceProvider } from '../provider-registry'
import { createTerminalProvider } from './terminal'
import { createWebContentsProvider } from './webcontents'

/**
 * 桌面端 provider 注册表（W1c.2 / W1c.3）。
 *
 * 注册失败只让该 Surface 不可用，壳、导航与其它 provider 照常工作；
 * 未注册的 provider 在标签条上显示明确错误，不静默跳过。
 */
export function createDesktopSurfaceProviders(): SurfaceProviderRegistry {
  const registry = new SurfaceProviderRegistry()
  const factories: Array<() => SurfaceProvider> = [
    () => createWebContentsProvider({
      id: HARNESS_PROVIDER_ID,
      actions: [{ label: '查看日志', run: () => api.openLogs() }],
    }),
    () => createWebContentsProvider({
      id: MAGPIE_CONSOLE_PROVIDER_ID,
      actions: [
        { label: '启动 magpie 并重试', run: () => api.startMagpie(), retryAfter: true },
        { label: '浏览器打开', run: () => api.openMagpieWeb() },
      ],
    }),
    () => createTerminalProvider(api),
  ]
  for (const factory of factories) {
    try {
      registry.register(factory())
    } catch (reason) {
      console.error('[surface] provider 注册失败，该 Surface 降级为不可用', reason)
    }
  }
  return registry
}
