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
  id: 'harness', providerId: 'harness', kind: 'webcontents', title: 'Harness',
}
const consoleSurface: SurfaceDescriptor = {
  id: 'console', providerId: 'console', kind: 'webcontents', title: '控制台',
}

const urls: Record<string, string> = {
  harness: 'http://127.0.0.1:4100/',
  console: 'http://127.0.0.1:4200/',
}

function setup() {
  const contentView = { addChildView: vi.fn(), removeChildView: vi.fn() }
  const host = new SurfaceHost({ contentView } as unknown as BrowserWindow)
  host.registerProvider({
    id: 'harness',
    kind: 'webcontents',
    resolve: async () => ({ ok: true, url: urls.harness }),
  })
  host.registerProvider({
    id: 'console',
    kind: 'webcontents',
    resolve: async () => ({ ok: true, url: urls.console }),
  })
  return { host, contentView }
}

describe('W1c SurfaceHost 生命周期基线', () => {
  beforeEach(() => {
    electron.views.length = 0
    electron.openExternal.mockReset()
    urls.harness = 'http://127.0.0.1:4100/'
    urls.console = 'http://127.0.0.1:4200/'
  })

  it('相同 URL 重复 show 不 reload，bounds 始终更新', async () => {
    const { host, contentView } = setup()
    expect(await host.show(harness, bounds)).toEqual({ ok: true })
    expect(await host.show(harness, { ...bounds, width: 800 })).toEqual({ ok: true })

    expect(electron.views).toHaveLength(1)
    expect(electron.views[0]?.webContents.loadURL).toHaveBeenCalledTimes(1)
    expect(contentView.addChildView).toHaveBeenCalledTimes(1)
    expect(electron.views[0]?.setBounds).toHaveBeenLastCalledWith({ ...bounds, width: 800 })
    expect(electron.views[0]?.webContents.close).not.toHaveBeenCalled()
  })

  it('切换与 hide 只 detach，显式 close 才销毁指定 Surface', async () => {
    const { host, contentView } = setup()
    await host.show(harness, bounds)
    await host.show(consoleSurface, bounds)

    expect(electron.views).toHaveLength(2)
    expect(contentView.removeChildView).toHaveBeenCalledWith(electron.views[0])
    expect(electron.views[0]?.webContents.close).not.toHaveBeenCalled()
    expect(electron.views[1]?.webContents.close).not.toHaveBeenCalled()

    expect(host.hide('console')).toBe(true)
    expect(electron.views[1]?.webContents.close).not.toHaveBeenCalled()
    expect(host.close('harness')).toBe(true)
    expect(electron.views[0]?.webContents.close).toHaveBeenCalledTimes(1)
    expect(electron.views[1]?.webContents.close).not.toHaveBeenCalled()
  })

  it('两个 Surface 可交替复用且关闭一个不影响另一个', async () => {
    const { host, contentView } = setup()
    await host.show(harness, bounds)
    await host.show(consoleSurface, bounds)
    await host.show(harness, bounds)

    expect(electron.views[0]?.webContents.loadURL).toHaveBeenCalledTimes(1)
    expect(electron.views[1]?.webContents.loadURL).toHaveBeenCalledTimes(1)
    expect(contentView.addChildView).toHaveBeenCalledTimes(3)
    host.close('console')
    await host.show(harness, bounds)
    expect(electron.views[0]?.webContents.close).not.toHaveBeenCalled()
    expect(electron.views[1]?.webContents.close).toHaveBeenCalledTimes(1)
  })

  it('URL 确实变化才重新加载，dispose 关闭全部 Surface', async () => {
    const { host } = setup()
    await host.show(harness, bounds)
    urls.harness = 'http://127.0.0.1:4100/next'
    await host.show(harness, bounds)
    await host.show(consoleSurface, bounds)
    expect(electron.views[0]?.webContents.loadURL).toHaveBeenCalledTimes(2)

    host.dispose()
    expect(electron.views[0]?.webContents.close).toHaveBeenCalledTimes(1)
    expect(electron.views[1]?.webContents.close).toHaveBeenCalledTimes(1)
  })
})

describe('W1c SurfaceHost 安全负路径', () => {
  beforeEach(() => {
    electron.views.length = 0
    electron.openExternal.mockReset()
    urls.harness = 'http://127.0.0.1:4100/'
    urls.console = 'http://127.0.0.1:4200/'
  })

  it('伪造 providerId 被拒，不创建任何视图', async () => {
    const { host } = setup()
    const result = await host.show({
      id: 'forged', providerId: 'forged', kind: 'webcontents', title: '伪造',
    }, bounds)
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('provider')
    expect(electron.views).toHaveLength(0)
  })

  it('id 与 provider 不匹配、kind 不匹配都被拒', async () => {
    const { host } = setup()
    expect((await host.show({ ...harness, id: 'other' }, bounds)).ok).toBe(false)
    expect((await host.show({ ...harness, kind: 'document' }, bounds)).ok).toBe(false)
    expect(electron.views).toHaveLength(0)
  })

  it('renderer 提交的 URL 被忽略，实际加载的是 provider 解析出的地址', async () => {
    const { host } = setup()
    const result = await host.show({
      ...harness,
      url: 'http://evil/?token=leak',
    } as unknown as SurfaceDescriptor, bounds)
    expect(result.ok).toBe(true)
    expect(electron.views[0]?.webContents.loadURL).toHaveBeenCalledWith('http://127.0.0.1:4100/')
    const loaded = String(electron.views[0]?.webContents.loadURL.mock.calls[0]?.[0])
    expect(loaded).not.toContain('token')
  })

  it('非法 descriptor 与非法 bounds 被拒', async () => {
    const { host } = setup()
    expect((await host.show({ id: '', providerId: 'harness', kind: 'webcontents', title: 'x' }, bounds)).ok).toBe(false)
    expect((await host.show(harness, { x: 0, y: 0, width: Number.NaN, height: 10 })).ok).toBe(false)
    expect((await host.show(harness, 'not-bounds')).ok).toBe(false)
    expect(electron.views).toHaveLength(0)
  })

  it('provider 未就绪时返回可展示错误，不创建视图', async () => {
    const contentView = { addChildView: vi.fn(), removeChildView: vi.fn() }
    const host = new SurfaceHost({ contentView } as unknown as BrowserWindow)
    host.registerProvider({
      id: 'harness',
      kind: 'webcontents',
      resolve: async () => ({ ok: false, detail: 'Harness 尚未运行，请先启动对话' }),
    })
    const result = await host.show(harness, bounds)
    expect(result).toEqual({ ok: false, detail: 'Harness 尚未运行，请先启动对话' })
    expect(electron.views).toHaveLength(0)
  })

  it('伪造 id 的 hide/bounds/close 全部无效', async () => {
    const { host } = setup()
    await host.show(harness, bounds)
    expect(host.hide('forged')).toBe(false)
    expect(host.setBounds('forged', bounds)).toBe(false)
    expect(host.close('forged')).toBe(false)
    expect(electron.views[0]?.webContents.close).not.toHaveBeenCalled()
    expect(electron.views[0]?.setBounds).toHaveBeenCalledTimes(1)
  })

  it('同一 provider 重复注册显式失败', () => {
    const { host } = setup()
    expect(() => host.registerProvider({
      id: 'harness', kind: 'webcontents', resolve: async () => ({ ok: true, url: 'http://x/' }),
    })).toThrow('重复注册')
  })
})
