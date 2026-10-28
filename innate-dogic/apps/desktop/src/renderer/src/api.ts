import type {
  CheckResult,
  ConsoleReadyResult,
  HarnessLaunchResult,
  HarnessState,
  ModelInfo,
  SmokeResult,
  StatusSnapshot,
  ViewBounds,
} from '@dogic/core'
import type { AppMode } from '@dogic/core'
import type { WorkspaceApi } from '@dogic/plugin-workspace'

// 由 preload contextBridge 注入
declare global {
  interface Window {
    innate: WorkspaceApi & {
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
      consoleShow: (bounds: ViewBounds) => Promise<ConsoleReadyResult>
      consoleHide: () => Promise<boolean>
      consoleBounds: (bounds: ViewBounds) => Promise<boolean>
      revealDshHome: () => Promise<string>
      openLogs: () => Promise<string>
      disconnectDsh: () => Promise<{ ok: boolean; detail: string }>
      launchHarness: () => Promise<HarnessLaunchResult>
      harnessShow: (bounds: ViewBounds) => Promise<HarnessLaunchResult>
      harnessHide: () => Promise<boolean>
      harnessBounds: (bounds: ViewBounds) => Promise<boolean>
      getHarnessState: () => Promise<HarnessState>
      stopHarness: () => Promise<boolean>
      onHarnessState: (cb: (state: HarnessState) => void) => () => void
    }
  }
}

export const api = window.innate
