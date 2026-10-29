import type {
  CheckResult,
  ConsoleStatusEvent,
  GatewayStatusEvent,
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
      /** provider 中立的 Surface 窄接口：安全 descriptor + bounds，无认证 URL。 */
      surfaceShow: (descriptor: SurfaceDescriptor, bounds: ViewBounds) => Promise<SurfaceShowResult>
      surfaceHide: (id: string) => Promise<boolean>
      surfaceBounds: (id: string, bounds: ViewBounds) => Promise<boolean>
      surfaceClose: (id: string) => Promise<boolean>
      revealDshHome: () => Promise<string>
      openLogs: () => Promise<string>
      /** 断开 dsh 接线（经 gateway facade；返回恢复结果/失败原因/下一步 hint） */
      disconnectDsh: () => Promise<{ ok: boolean; detail: string; hint?: string }>
      /** 接线 dsh（用户动作触发；模型名白名单校验在 facade 层） */
      wireDsh: (model: string) => Promise<{ ok: boolean; detail: string; hint?: string }>
      /** 配额/用量（经 gateway facade） */
      quota: () => Promise<{ ok: boolean; detail: string }>
      launchHarness: () => Promise<HarnessLaunchResult>
      getHarnessState: () => Promise<HarnessState>
      stopHarness: () => Promise<boolean>
      onHarnessState: (cb: (state: HarnessState) => void) => () => void
      /** 网关状态事件（W2.5；脱敏：无认证查询串） */
      onGatewayStatus: (cb: (status: GatewayStatusEvent) => void) => () => void
      /** 控制台生命周期事件（W2.5；不含认证 URL） */
      onConsoleStatus: (cb: (status: ConsoleStatusEvent) => void) => () => void
    }
  }
}

export const api = window.innate
