import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { registerIpc, harness } from './ipc'
import { stopMagpieConsole } from './launcher'

// Windows 遮挡检测会让 WebContentsView 被误判为不可见（黑屏/截图异常），参考 magpie-dsh 实测处理
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')

// 单实例：重复启动时聚焦已有窗口
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.isVisible()) {
        win.show()
        win.focus()
      }
    }
  })

  void app.whenReady().then(createWindow)

  app.on('window-all-closed', () => {
    void harness.stop()
    stopMagpieConsole()
    app.quit()
  })
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 880,
    minHeight: 600,
    title: 'DSH InnateOS',
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  win.once('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    void import('electron').then(({ shell }) => shell.openExternal(url))
    return { action: 'deny' }
  })

  registerIpc(win)

  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) {
    void win.loadURL(devUrl)
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}
