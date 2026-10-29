import { WebContentsView, shell } from 'electron'
import type { BrowserWindow, Rectangle } from 'electron'
import { SurfaceRegistry, parseSurfaceDescriptor } from '@dogic/core/surface'
import type { SurfaceDescriptor, SurfaceKind, SurfaceShowResult } from '@dogic/core/surface'

export interface SurfaceUrlResult {
  ok: boolean
  url?: string
  detail?: string
}

/**
 * 运行时 provider：认证 URL 只在这里解析。
 * renderer 永远拿不到、也提交不了带 token 的链接。
 */
export interface SurfaceRuntimeProvider {
  readonly id: string
  readonly kind: SurfaceKind
  resolve(): Promise<SurfaceUrlResult>
}

interface HostedSurface {
  view: WebContentsView
  url: string
}

function parseBounds(input: unknown): Rectangle {
  if (!input || typeof input !== 'object') throw new Error('Surface bounds 必须是对象')
  const value = input as Partial<Rectangle>
  const numbers = [value.x, value.y, value.width, value.height]
  if (numbers.some((item) => typeof item !== 'number' || !Number.isFinite(item))) {
    throw new Error('Surface bounds 必须是有限数字')
  }
  if ((value.width ?? 0) < 0 || (value.height ?? 0) < 0) throw new Error('Surface bounds 尺寸不能为负')
  return {
    x: value.x ?? 0,
    y: value.y ?? 0,
    width: value.width ?? 0,
    height: value.height ?? 0,
  }
}

/**
 * WebContents provider 宿主（W1c.2）。
 *
 * 对外只有 provider 中立的 show/hide/bounds/close：
 * - show 只接收安全 descriptor 与 bounds，URL 由注册的 runtime provider 提供；
 * - 切换标签只 detach（removeChildView），不销毁 WebContentsView；
 * - 只有显式 close 才销毁视图。
 */
export class SurfaceHost {
  private readonly registry = new SurfaceRegistry()
  private readonly surfaces = new Map<string, HostedSurface>()
  private readonly providers = new Map<string, SurfaceRuntimeProvider>()
  private attachedId?: string

  constructor(private readonly host: BrowserWindow) {}

  registerProvider(provider: SurfaceRuntimeProvider): void {
    if (this.providers.has(provider.id)) throw new Error(`Surface provider 重复注册: ${provider.id}`)
    this.providers.set(provider.id, provider)
  }

  unregisterProvider(id: string): void {
    this.providers.delete(id)
  }

  async show(input: unknown, rawBounds: unknown): Promise<SurfaceShowResult> {
    let descriptor: SurfaceDescriptor
    let bounds: Rectangle
    try {
      descriptor = parseSurfaceDescriptor(input)
      bounds = parseBounds(rawBounds)
    } catch (reason) {
      return { ok: false, detail: reason instanceof Error ? reason.message : String(reason) }
    }
    const provider = this.providers.get(descriptor.providerId)
    if (!provider) return { ok: false, detail: `未注册的 Surface provider: ${descriptor.providerId}` }
    if (provider.id !== descriptor.id) return { ok: false, detail: 'Surface id 与 provider 不匹配' }
    if (provider.kind !== descriptor.kind) return { ok: false, detail: 'Surface kind 与 provider 不匹配' }

    let resolved: SurfaceUrlResult
    try {
      resolved = await provider.resolve()
    } catch (reason) {
      return { ok: false, detail: reason instanceof Error ? reason.message : String(reason) }
    }
    if (!resolved.ok || !resolved.url) {
      return { ok: false, detail: resolved.detail ?? 'Surface provider 未就绪' }
    }

    try {
      this.registry.open(descriptor)
    } catch (reason) {
      return { ok: false, detail: reason instanceof Error ? reason.message : String(reason) }
    }
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
    if (record.url !== resolved.url) {
      record.url = resolved.url
      void record.view.webContents.loadURL(resolved.url)
    }
    if (this.attachedId !== descriptor.id) {
      this.hideAttached()
      this.host.contentView.addChildView(record.view)
      this.attachedId = descriptor.id
    }
    record.view.setBounds(bounds)
    return { ok: true }
  }

  hide(input: unknown): boolean {
    const id = typeof input === 'string' ? input : ''
    if (!id || !this.registry.has(id)) return false
    this.registry.deactivate(id)
    if (this.attachedId === id) this.hideAttached()
    return true
  }

  setBounds(input: unknown, rawBounds: unknown): boolean {
    const id = typeof input === 'string' ? input : ''
    if (!id || !this.registry.has(id)) return false
    let bounds: Rectangle
    try {
      bounds = parseBounds(rawBounds)
    } catch {
      return false
    }
    if (this.attachedId !== id) return false
    this.surfaces.get(id)?.view.setBounds(bounds)
    return true
  }

  close(input: unknown): boolean {
    const id = typeof input === 'string' ? input : ''
    if (!id) return false
    this.registry.close(id)
    if (this.attachedId === id) this.hideAttached()
    const record = this.surfaces.get(id)
    if (!record) return false
    record.view.webContents.close()
    this.surfaces.delete(id)
    return true
  }

  list(): string[] {
    return this.registry.list().map((surface) => surface.id)
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
