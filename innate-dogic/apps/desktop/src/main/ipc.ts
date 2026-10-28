import path from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import {
  dshHome,
  discoverGatewayPort,
  fetchModels,
  readMode,
  readStatus,
  runChecks,
  smokeTest,
  writeMode,
} from '@dogic/core'
import type { AppMode, HarnessLaunchResult, ViewBounds } from '@dogic/core'
import { WorkspaceService } from '@dogic/plugin-workspace/main'
import { HarnessRuntime } from './harness'
import { SurfaceHost } from './surface-host'
import { disconnectDsh, ensureMagpieConsole, startMagpie } from './launcher'

export const harness = new HarnessRuntime()

export function registerIpc(mainWindow: BrowserWindow): void {
  const surfaces = new SurfaceHost(mainWindow)
  const workspace = new WorkspaceService(path.join(app.getPath('userData'), 'workspace.json'))
  mainWindow.on('closed', () => surfaces.dispose())

  ipcMain.handle('innate:status', () => readStatus())

  ipcMain.handle('innate:winMin', () => mainWindow.minimize())
  ipcMain.handle('innate:winToggleMax', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.handle('innate:winClose', () => mainWindow.close())
  ipcMain.handle('innate:winIsMaximized', () => mainWindow.isMaximized())
  const sendMaximizeState = (): void => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('innate:win-maximized', mainWindow.isMaximized())
    }
  }
  mainWindow.on('maximize', sendMaximizeState)
  mainWindow.on('unmaximize', sendMaximizeState)

  ipcMain.handle('innate:getMode', () => readMode(app.getPath('userData')))
  ipcMain.handle('innate:setMode', (_e, mode: AppMode) => {
    writeMode(app.getPath('userData'), mode)
    return true
  })

  ipcMain.handle('innate:models', async () => {
    const port = await discoverGatewayPort()
    if (port === undefined) return { ok: false as const, models: [], detail: '网关未运行' }
    try {
      const models = await fetchModels(port)
      return { ok: true as const, models, detail: `${models.length} 个模型` }
    } catch (e) {
      return { ok: false as const, models: [], detail: String(e) }
    }
  })

  ipcMain.handle('innate:checks', () => runChecks())
  ipcMain.handle('innate:smoke', (_e, model?: string) => smokeTest(model))

  ipcMain.handle('innate:openMagpieWeb', async () => {
    const ready = await ensureMagpieConsole()
    if (!ready.ok || !ready.url) return ready
    await shell.openExternal(ready.url)
    return { ok: true, detail: '已在浏览器打开受管控制台' }
  })

  ipcMain.handle('innate:startMagpie', () => startMagpie())

  ipcMain.handle('innate:consoleShow', async (_e, bounds: ViewBounds) => {
    const ready = await ensureMagpieConsole()
    if (!ready.ok || !ready.url) return ready
    await surfaces.show({
      id: 'magpie-console',
      providerId: 'magpie-console',
      kind: 'webcontents',
      title: 'magpie 控制台',
      capabilities: ['network:navigate'],
    }, ready.url, bounds)
    return ready
  })
  ipcMain.handle('innate:consoleHide', () => {
    surfaces.hide('magpie-console')
    return true
  })
  ipcMain.handle('innate:consoleBounds', (_e, bounds: ViewBounds) => {
    surfaces.setBounds('magpie-console', bounds)
    return true
  })

  ipcMain.handle('innate:revealDshHome', () => shell.openPath(dshHome()))
  ipcMain.handle('innate:openLogs', () => shell.openPath(path.join(app.getPath('userData'), 'logs')))
  ipcMain.handle('innate:disconnectDsh', () => disconnectDsh())

  ipcMain.handle('innate:harnessState', () => harness.getState())
  ipcMain.handle('innate:launchHarness', () => harness.launch(app.getPath('userData')))
  ipcMain.handle('innate:harnessShow', async (_e, bounds: ViewBounds): Promise<HarnessLaunchResult> => {
    const state = harness.getState()
    if (state.phase !== 'running' || !state.url) {
      return { ok: false, detail: 'Harness 尚未运行，请先启动对话' }
    }
    await surfaces.show({
      id: 'harness',
      providerId: 'harness',
      kind: 'webcontents',
      title: 'DeepSeek Harness',
      capabilities: ['agent:tools'],
    }, state.url, bounds)
    return { ok: true, url: state.url, port: state.port, detail: 'Harness 已嵌入当前标签页' }
  })
  ipcMain.handle('innate:harnessHide', () => {
    surfaces.hide('harness')
    return true
  })
  ipcMain.handle('innate:harnessBounds', (_e, bounds: ViewBounds) => {
    surfaces.setBounds('harness', bounds)
    return true
  })
  ipcMain.handle('innate:stopHarness', () => {
    surfaces.close('harness')
    void harness.stop()
    return true
  })

  ipcMain.handle('innate:workspaceGetRoot', async () => {
    const saved = await workspace.getRoot()
    if (saved || !process.env.INNATE_WORKSPACE_ROOT) return saved
    return await workspace.setRoot(process.env.INNATE_WORKSPACE_ROOT)
  })
  ipcMain.handle('innate:workspacePickRoot', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择工作区目录',
      properties: ['openDirectory'],
    })
    const selected = result.filePaths[0]
    return result.canceled || !selected ? null : await workspace.setRoot(selected)
  })
  ipcMain.handle('innate:workspaceList', (_e, root: string, relative?: string) => workspace.list(root, relative))
  ipcMain.handle('innate:workspaceRead', (_e, root: string, relative: string) => workspace.read(root, relative))
  ipcMain.handle('innate:workspaceGitStatus', (_e, root: string) => workspace.gitStatus(root))
  ipcMain.handle('innate:workspaceGitDiff', (_e, root: string, relative: string) => workspace.gitDiff(root, relative))

  harness.on('state', (state) => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('innate:harness-state', state)
  })
}

