import { contextBridge, ipcRenderer } from 'electron'
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
import type { WorkspaceApi, WorkspaceRoot } from '@dogic/plugin-workspace'

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
  consoleShow: (bounds: ViewBounds): Promise<ConsoleReadyResult> =>
    ipcRenderer.invoke('innate:consoleShow', bounds),
  consoleHide: (): Promise<boolean> => ipcRenderer.invoke('innate:consoleHide'),
  consoleBounds: (bounds: ViewBounds): Promise<boolean> =>
    ipcRenderer.invoke('innate:consoleBounds', bounds),
  revealDshHome: (): Promise<string> => ipcRenderer.invoke('innate:revealDshHome'),
  openLogs: (): Promise<string> => ipcRenderer.invoke('innate:openLogs'),
  disconnectDsh: (): Promise<{ ok: boolean; detail: string }> =>
    ipcRenderer.invoke('innate:disconnectDsh'),
  launchHarness: (): Promise<HarnessLaunchResult> => ipcRenderer.invoke('innate:launchHarness'),
  harnessShow: (bounds: ViewBounds): Promise<HarnessLaunchResult> => ipcRenderer.invoke('innate:harnessShow', bounds),
  harnessHide: (): Promise<boolean> => ipcRenderer.invoke('innate:harnessHide'),
  harnessBounds: (bounds: ViewBounds): Promise<boolean> => ipcRenderer.invoke('innate:harnessBounds', bounds),
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
} satisfies WorkspaceApi & Record<string, unknown>

contextBridge.exposeInMainWorld('innate', api)
export type InnateApi = typeof api
