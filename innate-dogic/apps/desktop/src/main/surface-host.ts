import { WebContentsView, shell } from 'electron'
import type { BrowserWindow, Rectangle } from 'electron'
import { SurfaceRegistry } from '@dogic/core/surface'
import type { SurfaceDescriptor } from '@dogic/core/surface'

interface HostedSurface {
  view: WebContentsView
  url: string
}

/** WebContents provider 适配器；描述与生命周期由共享 SurfaceRegistry 统一管理。 */
export class SurfaceHost {
  private readonly registry = new SurfaceRegistry()
  private readonly surfaces = new Map<string, HostedSurface>()
  private attachedId?: string

  constructor(private readonly host: BrowserWindow) {}

  async show(descriptor: SurfaceDescriptor, url: string, bounds: Rectangle): Promise<void> {
    this.registry.open(descriptor)
    this.registry.activate(descriptor.id)
    let record = this.surfaces.get(descriptor.id)
    if (!record) {
      const view = new WebContentsView({
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
      })
      view.webContents.setWindowOpenHandler(({ url: target }) => {
        if (/^https?:\/\//i.test(target)) void shell.openExternal(target)
        return { action: 'deny' }
      })
      record = { view, url: '' }
      this.surfaces.set(descriptor.id, record)
    }
    if (record.url !== url) {
      record.url = url
      void record.view.webContents.loadURL(url)
    }
    if (this.attachedId !== descriptor.id) {
      this.hideAttached()
      this.host.contentView.addChildView(record.view)
      this.attachedId = descriptor.id
    }
    record.view.setBounds(bounds)
  }

  hide(id: string): void {
    this.registry.deactivate(id)
    if (this.attachedId === id) this.hideAttached()
  }

  setBounds(id: string, bounds: Rectangle): void {
    if (this.attachedId === id) this.surfaces.get(id)?.view.setBounds(bounds)
  }

  close(id: string): void {
    this.registry.close(id)
    if (this.attachedId === id) this.hideAttached()
    const record = this.surfaces.get(id)
    record?.view.webContents.close()
    this.surfaces.delete(id)
  }

  dispose(): void {
    this.hideAttached()
    for (const record of this.surfaces.values()) record.view.webContents.close()
    this.surfaces.clear()
    this.registry.clear()
  }

  private hideAttached(): void {
    if (!this.attachedId) return
    const record = this.surfaces.get(this.attachedId)
    if (record) this.host.contentView.removeChildView(record.view)
    this.attachedId = undefined
  }
}
