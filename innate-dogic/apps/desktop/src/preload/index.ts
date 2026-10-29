import { contextBridge, ipcRenderer } from 'electron'
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
import type { WorkspaceApi, WorkspaceRoot } from '@dogic/plugin-workspace'
import type { TerminalApi, TerminalDescriptor, TerminalEvent, TerminalShowResult } from '@dogic/plugin-terminal'
import type { ProcessExecuteAck, ProcessProfile, ProcessRequest, ProcessResult } from '@dogic/plugin-terminal'

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
  disconnectDsh: (): Promise<{ ok: boolean; detail: string }> =>
    ipcRenderer.invoke('innate:disconnectDsh'),
  launchHarness: (): Promise<HarnessLaunchResult> => ipcRenderer.invoke('innate:launchHarness'),
  getHarnessState: (): Promise<HarnessState> => ipcRenderer.invoke('innate:harnessState'),
  stopHarness: (): Promise<boolean> => ipcRenderer.invoke('innate:stopHarness'),
  onHarnessState: (cb: (state: HarnessState) => void): (() => void) => {
    const listener = (_e: unknown, state: HarnessState): void => cb(state)
    ipcRenderer.on('innate:harness-state', listener)
    return () => ipcRenderer.removeListener('innate:harness-state', listener)
  },
  workspaceGetRoot: (): Promise<WorkspaceRoot | null> => ipcRenderer.invoke('innate:workspaceGetRoot'),
  workspacePickRoot: (): Promise<WorkspaceRoot | null> => ipcRenderer.invoke('innate:workspacePickRoot'),
  workspaceList: (root: string, relative?: string) => ipcRenderer.invoke('innate:workspaceList', root, relative),
  workspaceRead: (root: string, relative: string) => ipcRenderer.invoke('innate:workspaceRead', root, relative),
  workspaceGitStatus: (root: string) => ipcRenderer.invoke('innate:workspaceGitStatus', root),
  workspaceGitDiff: (root: string, relative: string) => ipcRenderer.invoke('innate:workspaceGitDiff', root, relative),
  // 主进程 PTY Terminal 窄通道（W4.3）：只提交安全字段，事件由主进程推送。
  terminalCreate: (descriptor: TerminalDescriptor): Promise<TerminalShowResult> =>
    ipcRenderer.invoke('innate:terminalCreate', descriptor),
  terminalInput: (terminalId: string, data: string): Promise<boolean> =>
    ipcRenderer.invoke('innate:terminalInput', terminalId, data),
  terminalResize: (terminalId: string, size: { cols: number; rows: number }): Promise<boolean> =>
    ipcRenderer.invoke('innate:terminalResize', terminalId, size),
  terminalClose: (terminalId: string): Promise<boolean> => ipcRenderer.invoke('innate:terminalClose', terminalId),
  terminalOnEvent: (cb: (event: TerminalEvent) => void): (() => void) => {
    const listener = (_e: unknown, event: TerminalEvent): void => cb(event)
    ipcRenderer.on('innate:terminal-event', listener)
    return () => ipcRenderer.removeListener('innate:terminal-event', listener)
  },
  // 受控 process:execute 窄通道（W4.6）：profile 白名单 + 结构化请求；
  // 受理即返回执行 id，结果经 processResult 取回，simple 模式由主进程门控拒绝。
  processProfileRegister: (profile: ProcessProfile): Promise<TerminalShowResult> =>
    ipcRenderer.invoke('innate:processProfileRegister', profile),
  processProfiles: (): Promise<string[]> => ipcRenderer.invoke('innate:processProfiles'),
  processExecute: (request: ProcessRequest): Promise<ProcessExecuteAck> =>
    ipcRenderer.invoke('innate:processExecute', request),
  processResult: (executionId: string): Promise<ProcessResult> =>
    ipcRenderer.invoke('innate:processResult', executionId),
  processCancel: (executionId: string): Promise<boolean> =>
    ipcRenderer.invoke('innate:processCancel', executionId),
} satisfies WorkspaceApi & TerminalApi & Record<string, unknown>

contextBridge.exposeInMainWorld('innate', api)
export type InnateApi = typeof api
