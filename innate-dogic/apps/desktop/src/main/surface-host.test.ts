import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow, Rectangle } from 'electron'
import type { SurfaceDescriptor } from '@dogic/core/surface'

const electron = vi.hoisted(() => {
  const views: Array<{
    webContents: {
      loadURL: ReturnType<typeof vi.fn>
      close: ReturnType<typeof vi.fn>
      setWindowOpenHandler: ReturnType<typeof vi.fn>
    }
    setBounds: ReturnType<typeof vi.fn>
  }> = []
  return { views, openExternal: vi.fn() }
})

vi.mock('electron', () => ({
  WebContentsView: class {
    webContents = {
      loadURL: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
      setWindowOpenHandler: vi.fn(),
    }
    setBounds = vi.fn()
    constructor() {
      electron.views.push(this)
    }
  },
  shell: { openExternal: electron.openExternal },
}))

import { SurfaceHost } from './surface-host'

const bounds: Rectangle = { x: 72, y: 48, width: 960, height: 640 }
const harness: SurfaceDescriptor = {
  id: 'harness', providerId: 'dsh', kind: 'webcontents', title: 'Harness',
}
const consoleSurface: SurfaceDescriptor = {
  id: 'console', providerId: 'magpie', kind: 'webcontents', title: '控制台',
}

function setup() {
  const contentView = { addChildView: vi.fn(), removeChildView: vi.fn() }
  const host = new SurfaceHost({ contentView } as unknown as BrowserWindow)
  return { host, contentView }
}

describe('W1a SurfaceHost 生命周期基线', () => {
  beforeEach(() => {
    electron.views.length = 0
    electron.openExternal.mockReset()
  })

  it('相同 URL 重复 show 不 reload，bounds 始终更新', async () => {
    const { host, contentView } = setup()
    await host.show(harness, 'http://127.0.0.1:4100/', bounds)
    await host.show(harness, 'http://127.0.0.1:4100/', { ...bounds, width: 800 })

    expect(electron.views).toHaveLength(1)
    expect(electron.views[0]?.webContents.loadURL).toHaveBeenCalledTimes(1)
    expect(contentView.addChildView).toHaveBeenCalledTimes(1)
    expect(electron.views[0]?.setBounds).toHaveBeenLastCalledWith({ ...bounds, width: 800 })
    expect(electron.views[0]?.webContents.close).not.toHaveBeenCalled()
  })

  it('切换与 hide 只 detach，显式 close 才销毁指定 Surface', async () => {
    const { host, contentView } = setup()
    await host.show(harness, 'http://127.0.0.1:4100/', bounds)
    await host.show(consoleSurface, 'http://127.0.0.1:4200/', bounds)

    expect(electron.views).toHaveLength(2)
    expect(contentView.removeChildView).toHaveBeenCalledWith(electron.views[0])
    expect(electron.views[0]?.webContents.close).not.toHaveBeenCalled()
    expect(electron.views[1]?.webContents.close).not.toHaveBeenCalled()

    host.hide('console')
    expect(electron.views[1]?.webContents.close).not.toHaveBeenCalled()
    host.close('harness')
    expect(electron.views[0]?.webContents.close).toHaveBeenCalledTimes(1)
    expect(electron.views[1]?.webContents.close).not.toHaveBeenCalled()
  })

  it('两个 Surface 可交替复用且关闭一个不影响另一个', async () => {
    const { host, contentView } = setup()
    await host.show(harness, 'http://127.0.0.1:4100/', bounds)
    await host.show(consoleSurface, 'http://127.0.0.1:4200/', bounds)
    await host.show(harness, 'http://127.0.0.1:4100/', bounds)

    expect(electron.views[0]?.webContents.loadURL).toHaveBeenCalledTimes(1)
    expect(electron.views[1]?.webContents.loadURL).toHaveBeenCalledTimes(1)
    expect(contentView.addChildView).toHaveBeenCalledTimes(3)
    host.close('console')
    await host.show(harness, 'http://127.0.0.1:4100/', bounds)
    expect(electron.views[0]?.webContents.close).not.toHaveBeenCalled()
    expect(electron.views[1]?.webContents.close).toHaveBeenCalledTimes(1)
  })

  it('URL 确实变化才重新加载，dispose 关闭全部 Surface', async () => {
    const { host } = setup()
    await host.show(harness, 'http://127.0.0.1:4100/', bounds)
    await host.show(harness, 'http://127.0.0.1:4100/next', bounds)
    await host.show(consoleSurface, 'http://127.0.0.1:4200/', bounds)
    expect(electron.views[0]?.webContents.loadURL).toHaveBeenCalledTimes(2)

    host.dispose()
    expect(electron.views[0]?.webContents.close).toHaveBeenCalledTimes(1)
    expect(electron.views[1]?.webContents.close).toHaveBeenCalledTimes(1)
  })
})
