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
  redactLaunchSecrets,
} from '@dogic/core'
import type {
  AppMode,
  GatewayStatusEvent,
  GatewayStatusState,
  HarnessLaunchResult,
  HarnessState,
} from '@dogic/core'
import { WorkspaceService } from '@dogic/plugin-workspace/main'
import { HarnessRuntime } from './harness'
import { SurfaceHost } from './surface-host'
import { ensureMagpieConsole, getConsole, getGateway, startMagpie } from './launcher'

export const harness = new HarnessRuntime()

/** renderer 可见的 Harness 状态：不含认证 URL，message 里的 URL 也已脱敏。 */
function publicHarnessState(state: HarnessState): HarnessState {
  const safe = { ...state }
  delete safe.url
  safe.message = redactLaunchSecrets(safe.message)
  return safe
}

/** 启动结果同理：URL 只留在主进程，renderer 只拿到端口与可展示文本。 */
function publicLaunchResult(result: HarnessLaunchResult): HarnessLaunchResult {
  const safe = { ...result }
  delete safe.url
  return safe
}

export function registerIpc(mainWindow: BrowserWindow): void {
  const surfaces = new SurfaceHost(mainWindow)
  const workspace = new WorkspaceService(path.join(app.getPath('userData'), 'workspace.json'))
  // root 变更事件转发：service 内监听器异常隔离，单个订阅者不阻断主流程。
  const unsubscribeRoot = workspace.onRootChanged((changed) => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('innate:workspace-root-changed', changed)
  })
  mainWindow.on('closed', () => {
    unsubscribeRoot()
    surfaces.dispose()
  })

  // 认证 URL 只在对应 runtime provider 内解析；renderer 只提交安全 descriptor。
  surfaces.registerProvider({
    id: 'harness',
    kind: 'webcontents',
    resolve: async () => {
      const state = harness.getState()
      if (state.phase !== 'running' || !state.url) {
        return { ok: false, detail: 'Harness 尚未运行，请先启动对话' }
      }
      return { ok: true, url: state.url }
    },
  })
  surfaces.registerProvider({
    id: 'magpie-console',
    kind: 'webcontents',
    resolve: async () => {
      const ready = await ensureMagpieConsole()
      if (!ready.ok || !ready.url) return { ok: false, detail: ready.detail }
      return { ok: true, url: ready.url }
    },
  })

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

  // provider 中立的 Surface 窄接口：安全 descriptor + bounds，无 URL、无进程句柄。
  ipcMain.handle('innate:surfaceShow', (_e, descriptor: unknown, bounds: unknown) =>
    surfaces.show(descriptor, bounds))
  ipcMain.handle('innate:surfaceHide', (_e, id: unknown) => surfaces.hide(id))
  ipcMain.handle('innate:surfaceBounds', (_e, id: unknown, bounds: unknown) => surfaces.setBounds(id, bounds))
  ipcMain.handle('innate:surfaceClose', (_e, id: unknown) => surfaces.close(id))

  ipcMain.handle('innate:revealDshHome', () => shell.openPath(dshHome()))
  ipcMain.handle('innate:openLogs', () => shell.openPath(path.join(app.getPath('userData'), 'logs')))

  // 接线/配额操作全部经类型化 gateway facade（execFile 参数数组 + 超时 + 参数白名单），
  // 不新增第二套直调；断开结果显式返回恢复结果/失败原因/下一步 hint。
  ipcMain.handle('innate:disconnectDsh', async () => {
    try {
      await getGateway().unwireDsh(dshHome())
      return {
        ok: true as const,
        detail: '已请求断开（magpie 将恢复 dsh 原配置）',
        hint: '断开后 dsh 使用其原默认模型；重新接线请在 magpie 控制台操作',
      }
    } catch (e) {
      return {
        ok: false as const,
        detail: `CLI 执行失败: ${String(e)}`,
        hint: '可在 magpie Agents 页对 dsh 手动 Disconnect',
      }
    }
  })

  ipcMain.handle('innate:wireDsh', async (_e, model: string) => {
    try {
      const stdout = await getGateway().wireDsh(model, dshHome())
      return { ok: true as const, detail: `已接线 ${model}：${stdout.trim() || '无输出'}` }
    } catch (e) {
      return {
        ok: false as const,
        detail: `接线失败: ${String(e)}`,
        hint: '模型名需为 <provider>/<model> 白名单字符',
      }
    }
  })

  ipcMain.handle('innate:quota', async () => {
    const quota = await getGateway().quota()
    return { ok: quota !== null, detail: quota?.trim() ?? '配额不可用（magpie CLI 未响应）' }
  })

  ipcMain.handle('innate:harnessState', () => publicHarnessState(harness.getState()))
  ipcMain.handle('innate:launchHarness', async () =>
    publicLaunchResult(await harness.launch(app.getPath('userData'))))
  ipcMain.handle('innate:stopHarness', () => {
    surfaces.close('harness')
    void harness.stop()
    return true
  })

  ipcMain.handle('innate:workspaceGetRoot', async () => {
    const saved = await workspace.getRoot()
    if (saved || !process.env.INNATE_WORKSPACE_ROOT) return saved
    // env 回退：以 env 为 source 设 root，触发 root-changed 事件
    return await workspace.setRoot(process.env.INNATE_WORKSPACE_ROOT, 'env')
  })
  ipcMain.handle('innate:workspacePickRoot', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择工作区目录',
      properties: ['openDirectory'],
    })
    const selected = result.filePaths[0]
    return result.canceled || !selected ? null : await workspace.setRoot(selected, 'picker')
  })
  ipcMain.handle('innate:workspaceSetRoot', async (_e, root: string, source?: 'saved' | 'env' | 'picker') =>
    workspace.setRoot(root, source ?? 'picker'))
  ipcMain.handle('innate:workspaceList', (_e, root: string, relative?: string) => workspace.list(root, relative))
  ipcMain.handle('innate:workspaceRead', (_e, root: string, relative: string) => workspace.read(root, relative))
  ipcMain.handle('innate:workspaceGitStatus', (_e, root: string) => workspace.gitStatus(root))
  ipcMain.handle('innate:workspaceGitDiff', (_e, root: string, relative: string) => workspace.gitDiff(root, relative))

  harness.on('state', (state) => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('innate:harness-state', publicHarnessState(state))
  })

  // 网关/控制台状态事件 → renderer 状态 pill（W2.5：事件驱动 + 低频 reconcile，替代无意义重复轮询）。
  // 事件脱敏：认证查询串不进事件；url 仅 running 时为回环地址；message 过 redactLaunchSecrets。
  const sendGatewayStatus = (): void => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('innate:gateway-status', publicGatewayStatus(getGateway().status()))
    }
  }
  getGateway().onStatusChange(sendGatewayStatus)
  sendGatewayStatus()

  const sendConsoleStatus = (): void => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('innate:console-status', getConsole().getState())
    }
  }
  getConsole().on('state', sendConsoleStatus)
  sendConsoleStatus()
}

/** renderer 可见的网关状态事件：脱敏（认证查询串不进事件；url 仅 running 时为回环地址）。 */
function publicGatewayStatus(status: {
  state: string
  url?: string
  message?: string
  recoverable?: boolean
}): GatewayStatusEvent {
  const event: GatewayStatusEvent = {
    state: status.state as GatewayStatusState,
    recoverable: status.recoverable ?? true,
  }
  if (status.state === 'running') event.url = status.url
  if (status.message) event.message = redactLaunchSecrets(status.message)
  return event
}

