/** 跨 WebContents 与文档页共用的 Surface 描述；不得包含 URL token、进程或 webContents。 */
export type SurfaceKind = 'webcontents' | 'document' | 'terminal' | 'canvas' | 'agentic'
export type SurfaceCapability =
  | 'workspace:read'
  | 'process:execute'
  | 'network:navigate'
  | 'canvas:write'
  | 'agent:tools'

export interface SurfaceDescriptor {
  id: string
  providerId: string
  kind: SurfaceKind
  title: string
  workspaceId?: string
  capabilities?: SurfaceCapability[]
}

export interface SurfaceRecord extends SurfaceDescriptor {
  status: 'open' | 'closed'
}

export interface SurfaceSnapshot {
  version: 1
  activeId?: string
  surfaces: SurfaceDescriptor[]
}

/** 主进程与 renderer 共用的窄结果；失败只返回可展示文本，不回传运行时 URL。 */
export interface SurfaceShowResult {
  ok: boolean
  detail?: string
}

const kinds = new Set<SurfaceKind>(['webcontents', 'document', 'terminal', 'canvas', 'agentic'])
const capabilities = new Set<SurfaceCapability>([
  'workspace:read', 'process:execute', 'network:navigate', 'canvas:write', 'agent:tools',
])

/**
 * 白名单解析不可信输入（IPC / localStorage）。只复制安全字段，
 * 因而调用方即使传入 url/webContents/ChildProcess 也不会进入标签状态或快照。
 */
export function parseSurfaceDescriptor(input: unknown): SurfaceDescriptor {
  if (!input || typeof input !== 'object') throw new Error('Surface descriptor 必须是对象')
  const value = input as Partial<SurfaceDescriptor>
  if (typeof value.id !== 'string' || value.id.length === 0) throw new Error('Surface id 必须是非空字符串')
  if (typeof value.providerId !== 'string' || value.providerId.length === 0) {
    throw new Error('Surface providerId 必须是非空字符串')
  }
  if (typeof value.title !== 'string' || value.title.length === 0) throw new Error('Surface title 必须是非空字符串')
  if (!value.kind || !kinds.has(value.kind)) throw new Error('Surface kind 不受支持')
  if (value.workspaceId !== undefined && typeof value.workspaceId !== 'string') {
    throw new Error('Surface workspaceId 必须是字符串')
  }
  if (value.capabilities !== undefined) {
    if (!Array.isArray(value.capabilities) || value.capabilities.some((item) => !capabilities.has(item))) {
      throw new Error('Surface capability 不受支持')
    }
  }
  return {
    id: value.id,
    providerId: value.providerId,
    kind: value.kind,
    title: value.title,
    ...(value.workspaceId ? { workspaceId: value.workspaceId } : {}),
    ...(value.capabilities ? { capabilities: [...value.capabilities] } : {}),
  }
}

const normalizeDescriptor = parseSurfaceDescriptor

function copyRecord(record: SurfaceRecord): SurfaceRecord {
  return { ...normalizeDescriptor(record), status: record.status }
}

/** 同一生命周期模型供主进程 WebContents 和 renderer 文档页使用；持久化由调用方选择。 */
export class SurfaceRegistry {
  private readonly records = new Map<string, SurfaceRecord>()
  private activeId?: string

  open(input: SurfaceDescriptor): SurfaceRecord {
    const descriptor = normalizeDescriptor(input)
    const existing = this.records.get(descriptor.id)
    if (existing && (existing.providerId !== descriptor.providerId || existing.kind !== descriptor.kind)) {
      throw new Error(`Surface id 已被其他 provider 占用: ${descriptor.id}`)
    }
    const record: SurfaceRecord = { ...descriptor, status: 'open' }
    this.records.set(descriptor.id, record)
    return copyRecord(record)
  }

  activate(id: string): SurfaceRecord {
    const record = this.records.get(id)
    if (!record || record.status !== 'open') throw new Error(`Surface 未打开: ${id}`)
    this.activeId = id
    return copyRecord(record)
  }

  deactivate(id?: string): void {
    if (id === undefined || this.activeId === id) this.activeId = undefined
  }

  close(id: string): void {
    const record = this.records.get(id)
    if (!record) return
    record.status = 'closed'
    if (this.activeId === id) {
      this.activeId = undefined
      const remaining = this.list()
      this.activeId = remaining.at(-1)?.id
    }
  }

  get(id: string): SurfaceRecord | undefined {
    const record = this.records.get(id)
    return record ? copyRecord(record) : undefined
  }

  has(id: string): boolean {
    const record = this.records.get(id)
    return record !== undefined && record.status === 'open'
  }

  active(): SurfaceRecord | undefined {
    return this.activeId ? this.get(this.activeId) : undefined
  }

  list(): SurfaceRecord[] {
    return [...this.records.values()].filter((record) => record.status === 'open').map(copyRecord)
  }

  clear(): void {
    this.records.clear()
    this.activeId = undefined
  }

  snapshot(): SurfaceSnapshot {
    const surfaces = this.list().map((record) => normalizeDescriptor(record))
    return {
      version: 1,
      ...(this.activeId && surfaces.some((surface) => surface.id === this.activeId)
        ? { activeId: this.activeId }
        : {}),
      surfaces,
    }
  }

  restore(input: unknown): void {
    if (!input || typeof input !== 'object') throw new Error('Surface snapshot 版本或结构无效')
    const snapshot = input as Partial<SurfaceSnapshot>
    if (snapshot.version !== 1 || !Array.isArray(snapshot.surfaces)) {
      throw new Error('Surface snapshot 版本或结构无效')
    }
    if (snapshot.activeId !== undefined && typeof snapshot.activeId !== 'string') {
      throw new Error('Surface snapshot activeId 无效')
    }
    const descriptors = snapshot.surfaces.map(normalizeDescriptor)
    if (new Set(descriptors.map((surface) => surface.id)).size !== descriptors.length) {
      throw new Error('Surface snapshot 包含重复 id')
    }
    if (snapshot.activeId && !descriptors.some((surface) => surface.id === snapshot.activeId)) {
      throw new Error('Surface snapshot activeId 无效')
    }
    this.clear()
    for (const descriptor of descriptors) this.open(descriptor)
    if (snapshot.activeId) this.activate(snapshot.activeId)
  }
}
