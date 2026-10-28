/**
 * 插件注册表 — 安装/开关/状态存储。
 *
 * 开关唯一权威文件（仿 .dsh-market/state.json#disabled）。
 * 安装 pending 标记 + 重试。
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

export interface PluginMeta {
  id: string
  name: string
  version: string
  path: string
  enabled: boolean
  installedAt: number
}

export interface RegistryState {
  disabled: string[]
  pending: Array<{
    id: string
    status: 'installing' | 'uninstalling' | 'error'
    retries: number
    error?: string
  }>
  plugins: Record<string, PluginMeta>
}

export class Registry {
  private state: RegistryState
  private statePath: string

  constructor(stateDir: string) {
    this.statePath = path.join(stateDir, 'state.json')
    this.state = this.loadState()
  }

  /**
   * 安装插件。
   */
  async install(pluginPath: string): Promise<PluginMeta> {
    const manifest = this.readManifest(pluginPath)
    const id = manifest.id

    // 标记 pending
    this.state.pending.push({ id, status: 'installing', retries: 0 })
    this.saveState()

    try {
      const meta: PluginMeta = {
        id,
        name: manifest.name ?? id,
        version: manifest.version ?? '0.0.0',
        path: pluginPath,
        enabled: !this.state.disabled.includes(id),
        installedAt: Date.now(),
      }
      this.state.plugins[id] = meta
      this.state.pending = this.state.pending.filter((p) => p.id !== id)
      this.saveState()
      return meta
    } catch (err) {
      // 更新 pending 状态
      const pending = this.state.pending.find((p) => p.id === id)
      if (pending) {
        pending.status = 'error'
        pending.error = err instanceof Error ? err.message : String(err)
        this.saveState()
      }
      throw err
    }
  }

  /**
   * 卸载插件。
   */
  async uninstall(id: string): Promise<void> {
    if (!this.state.plugins[id]) {
      throw new Error(`Plugin not found: ${id}`)
    }

    this.state.pending.push({ id, status: 'uninstalling', retries: 0 })
    this.saveState()

    try {
      delete this.state.plugins[id]
      this.state.disabled = this.state.disabled.filter((d) => d !== id)
      this.state.pending = this.state.pending.filter((p) => p.id !== id)
      this.saveState()
    } catch (err) {
      const pending = this.state.pending.find((p) => p.id === id)
      if (pending) {
        pending.status = 'error'
        pending.error = err instanceof Error ? err.message : String(err)
        this.saveState()
      }
      throw err
    }
  }

  /**
   * 启用插件。
   */
  enable(id: string): void {
    this.state.disabled = this.state.disabled.filter((d) => d !== id)
    const meta = this.state.plugins[id]
    if (meta) meta.enabled = true
    this.saveState()
  }

  /**
   * 禁用插件（开关唯一权威：disabled 数组）。
   */
  disable(id: string): void {
    if (!this.state.disabled.includes(id)) {
      this.state.disabled.push(id)
    }
    const meta = this.state.plugins[id]
    if (meta) meta.enabled = false
    this.saveState()
  }

  isEnabled(id: string): boolean {
    return !this.state.disabled.includes(id)
  }

  list(): PluginMeta[] {
    return Object.values(this.state.plugins).map((meta) => ({
      ...meta,
      enabled: !this.state.disabled.includes(meta.id),
    }))
  }

  get(id: string): PluginMeta | undefined {
    const meta = this.state.plugins[id]
    if (!meta) return undefined
    return { ...meta, enabled: !this.state.disabled.includes(id) }
  }

  private loadState(): RegistryState {
    try {
      if (fs.existsSync(this.statePath)) {
        const raw = fs.readFileSync(this.statePath, 'utf-8')
        return JSON.parse(raw) as RegistryState
      }
    } catch {
      // 忽略损坏的状态文件
    }
    return { disabled: [], pending: [], plugins: {} }
  }

  private saveState(): void {
    const dir = path.dirname(this.statePath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2), 'utf-8')
  }

  private readManifest(pluginPath: string): { id: string; name?: string; version?: string } {
    const pkgPath = path.join(pluginPath, 'package.json')
    if (!fs.existsSync(pkgPath)) {
      throw new Error(`package.json not found in ${pluginPath}`)
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    const innate = pkg.innate?.plugin ?? {}
    return {
      id: innate.id ?? pkg.name,
      name: pkg.name,
      version: pkg.version,
    }
  }
}
