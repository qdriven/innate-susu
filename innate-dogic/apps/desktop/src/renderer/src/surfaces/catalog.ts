import type { AppMode } from '@dogic/core'
import type { SurfaceDescriptor } from '@dogic/core/surface'

/** 中栏 Surface 标识；标签条本身不认识这些 id，映射只在 App 组合层。 */
export const HARNESS_SURFACE_ID = 'harness'
export const MAGPIE_CONSOLE_SURFACE_ID = 'magpie-console'

export const HARNESS_PROVIDER_ID = 'harness'
export const MAGPIE_CONSOLE_PROVIDER_ID = 'magpie-console'
export const TERMINAL_PROVIDER_ID = 'terminal'
export const BROWSER_PROVIDER_ID = 'browser'

export const harnessSurface = (): SurfaceDescriptor => ({
  id: HARNESS_SURFACE_ID,
  providerId: HARNESS_PROVIDER_ID,
  kind: 'webcontents',
  title: 'DeepSeek Harness',
  capabilities: ['agent:tools'],
})

export const magpieConsoleSurface = (): SurfaceDescriptor => ({
  id: MAGPIE_CONSOLE_SURFACE_ID,
  providerId: MAGPIE_CONSOLE_PROVIDER_ID,
  kind: 'webcontents',
  title: 'magpie 控制台',
  capabilities: ['network:navigate'],
})

/** terminal Surface（W4.4）：id 由终端页按打开顺序派生（terminal-1、terminal-2…）。 */
export const terminalSurface = (id: string, workspaceId: string, index: number): SurfaceDescriptor => ({
  id,
  providerId: TERMINAL_PROVIDER_ID,
  kind: 'terminal',
  title: `终端 ${index}`,
  workspaceId,
  capabilities: ['process:execute'],
})

/** browser Surface（W5.2）：id 由浏览器页按打开顺序派生（browser-1、browser-2…）。 */
export const browserSurface = (id: string, index: number): SurfaceDescriptor => ({
  id,
  providerId: BROWSER_PROVIDER_ID,
  kind: 'webcontents',
  title: `浏览器 ${index}`,
  capabilities: ['network:navigate'],
})

/** Surface → 壳页面映射；simple 模式的控制台落在「设置」页，终端仅 dev 可见。 */
export function surfacePageId(providerId: string, mode: AppMode): string | undefined {
  if (providerId === HARNESS_PROVIDER_ID) return 'chat'
  if (providerId === MAGPIE_CONSOLE_PROVIDER_ID) return mode === 'simple' ? 'settings' : 'console'
  if (providerId === TERMINAL_PROVIDER_ID) return mode === 'dev' ? 'terminal' : undefined
  return undefined
}
