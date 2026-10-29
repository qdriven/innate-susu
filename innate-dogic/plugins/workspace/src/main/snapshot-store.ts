import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * 工作区状态快照（W3.6）：版本化 JSON，原子写入，损坏/未来版本安全回退。
 *
 * 只存 root 引用与安全 UI 状态（展开目录、打开文档 descriptor、activeId）；
 * 不存文件内容或 diff 全文，不含认证信息。
 */
export const WORKSPACE_SNAPSHOT_VERSION = 1

export interface WorkspaceSnapshot {
  version: 1
  root?: string
}

export type WorkspaceSnapshotLoad =
  | { ok: true; snapshot: WorkspaceSnapshot }
  | { ok: false; reason: 'missing' | 'corrupt' | 'version'; detail?: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * 解析快照输入：接受当前版本 {version:1, root?} 与 legacy {root}（无版本）。
 * 未来版本/损坏/非对象安全回退（返回 null 语义由调用方决定）。
 */
export function parseWorkspaceSnapshot(input: unknown): WorkspaceSnapshot | null {
  if (!isRecord(input)) return null
  // 未来版本：version 存在但不是 1 → 不兼容，安全回退
  if ('version' in input && input.version !== WORKSPACE_SNAPSHOT_VERSION) return null
  const root = typeof input.root === 'string' ? input.root : undefined
  return { version: WORKSPACE_SNAPSHOT_VERSION, ...(root ? { root } : {}) }
}

/** 原子写入：先写临时文件再 rename，避免半写状态；同卷 rename 原子。 */
export async function writeSnapshotAtomic(file: string, snapshot: WorkspaceSnapshot): Promise<void> {
  const tmp = `${file}.${process.pid}.tmp`
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(tmp, JSON.stringify(snapshot, null, 2), 'utf8')
  await rename(tmp, file)
}

export class WorkspaceSnapshotStore {
  constructor(private readonly file: string) {}

  async load(): Promise<WorkspaceSnapshotLoad> {
    let text: string
    try {
      text = await readFile(this.file, 'utf8')
    } catch {
      return { ok: false, reason: 'missing' }
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (error) {
      return { ok: false, reason: 'corrupt', detail: error instanceof Error ? error.message : String(error) }
    }
    // 未来版本单独归类（parseWorkspaceSnapshot 对 version!==1 返回 null，无法区分损坏与版本）
    if (isRecord(parsed) && 'version' in parsed && parsed.version !== WORKSPACE_SNAPSHOT_VERSION) {
      return { ok: false, reason: 'version', detail: `不支持的快照版本: ${String(parsed.version)}` }
    }
    const snapshot = parseWorkspaceSnapshot(parsed)
    if (!snapshot) return { ok: false, reason: 'corrupt' }
    return { ok: true, snapshot }
  }

  async save(snapshot: WorkspaceSnapshot): Promise<void> {
    await writeSnapshotAtomic(this.file, snapshot)
  }
}
