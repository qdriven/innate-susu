import { contextBridge, ipcRenderer } from 'electron'
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
import type { WorkspaceApi, WorkspaceContext, WorkspaceRootChanged } from '@dogic/plugin-workspace'

const api = {
  getStatus: (): Promise<StatusSnapshot> => ipcRenderer.invoke('innate:status'),
  winMin: (): Promise<void> => ipcRenderer.invoke('innate:winMin'),
  winToggleMax: (): Promise<void> => ipcRenderer.invoke('innate:winToggleMax'),
  winClose: (): Promise<void> => ipcRenderer.invoke('innate:winClose'),
  winIsMaximized: (): Promise<boolean> => ipcRenderer.invoke('innate:winIsMaximized'),
  onWinMaximized: (cb: (maximized: boolean) => void): (() => void) => {
    const listener = (_e: unknown, maximized: boolean): void => cb(maximized)
    ipcRenderer.on('innate:win-maximized', listener)
    return () => ipcRenderer.removeListener('innate:win-maximized', listener)
  },
  getMode: (): Promise<AppMode | null> => ipcRenderer.invoke('innate:getMode'),
  setMode: (mode: AppMode): Promise<boolean> => ipcRenderer.invoke('innate:setMode', mode),
  getModels: (): Promise<{ ok: boolean; models: ModelInfo[]; detail: string }> =>
    ipcRenderer.invoke('innate:models'),
  runChecks: (): Promise<CheckResult[]> => ipcRenderer.invoke('innate:checks'),
  smokeTest: (model?: string): Promise<SmokeResult> => ipcRenderer.invoke('innate:smoke', model),
  openMagpieWeb: (): Promise<boolean> => ipcRenderer.invoke('innate:openMagpieWeb'),
  startMagpie: (): Promise<{ ok: boolean; detail: string }> =>
    ipcRenderer.invoke('innate:startMagpie'),
  // provider 中立的 Surface 窄接口（无认证 URL、无进程句柄）
  surfaceShow: (descriptor: SurfaceDescriptor, bounds: ViewBounds): Promise<SurfaceShowResult> =>
    ipcRenderer.invoke('innate:surfaceShow', descriptor, bounds),
  surfaceHide: (id: string): Promise<boolean> => ipcRenderer.invoke('innate:surfaceHide', id),
  surfaceBounds: (id: string, bounds: ViewBounds): Promise<boolean> =>
    ipcRenderer.invoke('innate:surfaceBounds', id, bounds),
  surfaceClose: (id: string): Promise<boolean> => ipcRenderer.invoke('innate:surfaceClose', id),
  revealDshHome: (): Promise<string> => ipcRenderer.invoke('innate:revealDshHome'),
  openLogs: (): Promise<string> => ipcRenderer.invoke('innate:openLogs'),
  /** 断开 dsh 接线（经 gateway facade；返回恢复结果/失败原因/下一步 hint） */
  disconnectDsh: (): Promise<{ ok: boolean; detail: string; hint?: string }> =>
    ipcRenderer.invoke('innate:disconnectDsh'),
  /** 接线 dsh（用户动作触发；模型名白名单校验在 facade 层） */
  wireDsh: (model: string): Promise<{ ok: boolean; detail: string; hint?: string }> =>
    ipcRenderer.invoke('innate:wireDsh', model),
  /** 配额/用量（经 gateway facade） */
  quota: (): Promise<{ ok: boolean; detail: string }> => ipcRenderer.invoke('innate:quota'),
  launchHarness: (): Promise<HarnessLaunchResult> => ipcRenderer.invoke('innate:launchHarness'),
  getHarnessState: (): Promise<HarnessState> => ipcRenderer.invoke('innate:harnessState'),
  stopHarness: (): Promise<boolean> => ipcRenderer.invoke('innate:stopHarness'),
  onHarnessState: (cb: (state: HarnessState) => void): (() => void) => {
    const listener = (_e: unknown, state: HarnessState): void => cb(state)
    ipcRenderer.on('innate:harness-state', listener)
    return () => ipcRenderer.removeListener('innate:harness-state', listener)
  },
  /** 网关状态事件（W2.5；脱敏：无认证查询串） */
  onGatewayStatus: (cb: (status: GatewayStatusEvent) => void): (() => void) => {
    const listener = (_e: unknown, status: GatewayStatusEvent): void => cb(status)
    ipcRenderer.on('innate:gateway-status', listener)
    return () => ipcRenderer.removeListener('innate:gateway-status', listener)
  },
  /** 控制台生命周期事件（W2.5；不含认证 URL） */
  onConsoleStatus: (cb: (status: ConsoleStatusEvent) => void): (() => void) => {
    const listener = (_e: unknown, status: ConsoleStatusEvent): void => cb(status)
    ipcRenderer.on('innate:console-status', listener)
    return () => ipcRenderer.removeListener('innate:console-status', listener)
  },
  workspaceGetRoot: (): Promise<WorkspaceContext | null> => ipcRenderer.invoke('innate:workspaceGetRoot'),
  workspacePickRoot: (): Promise<WorkspaceContext | null> => ipcRenderer.invoke('innate:workspacePickRoot'),
  workspaceList: (root: string, relative?: string) => ipcRenderer.invoke('innate:workspaceList', root, relative),
  workspaceRead: (root: string, relative: string) => ipcRenderer.invoke('innate:workspaceRead', root, relative),
  workspaceGitStatus: (root: string) => ipcRenderer.invoke('innate:workspaceGitStatus', root),
  workspaceGitDiff: (root: string, relative: string) => ipcRenderer.invoke('innate:workspaceGitDiff', root, relative),
  workspaceOnRootChanged: (cb: (changed: WorkspaceRootChanged) => void): (() => void) => {
    const listener = (_e: unknown, changed: WorkspaceRootChanged): void => cb(changed)
    ipcRenderer.on('innate:workspace-root-changed', listener)
    return () => ipcRenderer.removeListener('innate:workspace-root-changed', listener)
  },
} satisfies WorkspaceApi & Record<string, unknown>

contextBridge.exposeInMainWorld('innate', api)
export type InnateApi = typeof api
