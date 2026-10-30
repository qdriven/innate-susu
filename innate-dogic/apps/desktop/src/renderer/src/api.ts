import type {
  CheckResult,
  HarnessLaunchResult,
  HarnessState,
  ModelInfo,
  SmokeResult,
  StatusSnapshot,
  ViewBounds,
} from '@dogic/core'
import type { AppMode } from '@dogic/core'
import type { SurfaceDescriptor, SurfaceShowResult } from '@dogic/core/surface'
import type { WorkspaceApi } from '@dogic/plugin-workspace'
import type { TerminalApi } from '@dogic/plugin-terminal'
import type { BrowserApi } from '@dogic/plugin-browser'

// 由 preload contextBridge 注入
declare global {
  interface Window {
    innate: WorkspaceApi & TerminalApi & BrowserApi & {
      getStatus: () => Promise<StatusSnapshot>
      winMin: () => Promise<void>
      winToggleMax: () => Promise<void>
      winClose: () => Promise<void>
      winIsMaximized: () => Promise<boolean>
      onWinMaximized: (cb: (maximized: boolean) => void) => () => void
      getMode: () => Promise<AppMode | null>
      setMode: (mode: AppMode) => Promise<boolean>
      getModels: () => Promise<{ ok: boolean; models: ModelInfo[]; detail: string }>
      runChecks: () => Promise<CheckResult[]>
      smokeTest: (model?: string) => Promise<SmokeResult>
      openMagpieWeb: () => Promise<boolean>
      startMagpie: () => Promise<{ ok: boolean; detail: string }>
      /** provider 中立的 Surface 窄接口：安全 descriptor + bounds，无认证 URL。 */
      surfaceShow: (descriptor: SurfaceDescriptor, bounds: ViewBounds) => Promise<SurfaceShowResult>
      surfaceHide: (id: string) => Promise<boolean>
      surfaceBounds: (id: string, bounds: ViewBounds) => Promise<boolean>
      surfaceClose: (id: string) => Promise<boolean>
      revealDshHome: () => Promise<string>
      openLogs: () => Promise<string>
      disconnectDsh: () => Promise<{ ok: boolean; detail: string }>
      launchHarness: () => Promise<HarnessLaunchResult>
      getHarnessState: () => Promise<HarnessState>
      stopHarness: () => Promise<boolean>
      onHarnessState: (cb: (state: HarnessState) => void) => () => void
    }
  }
}

export const api = window.innate
