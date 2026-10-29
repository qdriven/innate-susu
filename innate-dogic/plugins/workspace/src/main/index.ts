import { execFile } from 'node:child_process'
import { open, readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import type {
  GitChange,
  GitDiff,
  GitStatus,
  WorkspaceEntry,
  WorkspaceFile,
  WorkspaceFileKind,
  WorkspaceContext,
  WorkspaceRootChanged,
  WorkspaceRootSource,
} from '../shared/index.js'
import { WorkspaceSnapshotStore } from './snapshot-store.js'

const MAX_TEXT_BYTES = 2 * 1024 * 1024
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_DIFF_CHARS = 500_000

const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

export function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function assertRelative(relative: string): void {
  if (!relative || relative.includes('\0') || path.isAbsolute(relative)) {
    throw new Error('工作区路径必须是非空相对路径')
  }
}

async function canonicalRoot(root: string): Promise<string> {
  return await realpath(path.resolve(root))
}

async function resolveExisting(root: string, relative: string): Promise<{ root: string; target: string }> {
  assertRelative(relative)
  const canonical = await canonicalRoot(root)
  const target = await realpath(path.resolve(canonical, relative))
  if (!isPathInside(canonical, target)) throw new Error('拒绝访问工作区之外的文件')
  return { root: canonical, target }
}

async function resolveGitPath(root: string, relative: string): Promise<{ root: string; relative: string }> {
  assertRelative(relative)
  const canonical = await canonicalRoot(root)
  const target = path.resolve(canonical, relative)
  if (!isPathInside(canonical, target)) throw new Error('拒绝访问工作区之外的文件')
  return { root: canonical, relative: path.relative(canonical, target) }
}

function fileKind(filePath: string, buffer: Buffer): WorkspaceFileKind {
  const extension = path.extname(filePath).toLowerCase()
  if (IMAGE_MIME[extension]) return 'image'
  if (['.md', '.mdx', '.markdown'].includes(extension)) return 'markdown'
  if (buffer.subarray(0, 8_000).includes(0)) return 'unsupported'
  return 'text'
}

async function readPrefix(filePath: string, size: number): Promise<Buffer> {
  const length = Math.min(size, MAX_TEXT_BYTES)
  const handle = await open(filePath, 'r')
  try {
    const buffer = Buffer.alloc(length)
    await handle.read(buffer, 0, length, 0)
    return buffer
  } finally {
    await handle.close()
  }
}

export function parseGitStatus(output: string): GitChange[] {
  const records = output.split('\0')
  const changes: GitChange[] = []
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (record.length < 4) continue
    const xy = record.slice(0, 2)
    const relative = record.slice(3)
    if (!relative) continue
    const change: GitChange = { path: relative, index: xy[0] ?? ' ', workingTree: xy[1] ?? ' ' }
    if (xy.includes('R') || xy.includes('C')) {
      change.previousPath = records[index + 1]
      index += 1
    }
    changes.push(change)
  }
  return changes
}

function runGit(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      args,
      { encoding: 'utf8', windowsHide: true, timeout: 15_000, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) reject(new Error(stderr.trim() || error.message))
        else resolve(stdout)
      },
    )
  })
}

function truncateDiff(value: string): { value: string; truncated: boolean } {
  return value.length > MAX_DIFF_CHARS
    ? { value: `${value.slice(0, MAX_DIFF_CHARS)}\n\n… diff 已截断 …`, truncated: true }
    : { value, truncated: false }
}

/** 主进程工作区服务：只读文件系统与只读 Git，不暴露任意命令执行。 */
export class WorkspaceService {
  private readonly snapshotStore: WorkspaceSnapshotStore
  private readonly listeners = new Set<(changed: WorkspaceRootChanged) => void>()
  /** 当前选定的 canonical root；未设置时 assertContext 为 no-op（兼容直接调用测试）。 */
  private currentRoot?: string

  constructor(stateFile: string) {
    this.snapshotStore = new WorkspaceSnapshotStore(stateFile)
  }

  /**
   * 上下文守卫：currentRoot 未设时 no-op（向后兼容直接 service 调用测试）；
   * 已设时，任何 list/read/Git 必须传入同一 canonical root，否则抛「上下文不匹配」。
   * 该守卫不跳过既有的 canonical + containment 校验，只做二次错误隔离。
   */
  private assertContext(root: string): void {
    if (this.currentRoot === undefined) return
    if (root !== this.currentRoot) {
      throw new Error('工作区上下文不匹配：请求的 root 与当前选定工作区不一致')
    }
  }

  async getRoot(): Promise<WorkspaceContext | null> {
    const load = await this.snapshotStore.load()
    if (!load.ok || !load.snapshot.root) return null
    const canonical = await canonicalRoot(load.snapshot.root)
    // 加载持久化 root 时同步恢复内存上下文，使 assertContext 生效
    if (this.currentRoot !== canonical) {
      this.currentRoot = canonical
    }
    return this.toContext(canonical)
  }

  private toContext(canonical: string): WorkspaceContext {
    return { path: canonical, name: path.basename(canonical), workspaceId: canonical }
  }

  async setRoot(root: string, source: WorkspaceRootSource = 'picker'): Promise<WorkspaceContext> {
    const canonical = await canonicalRoot(root)
    if (!(await stat(canonical)).isDirectory()) throw new Error('工作区必须是目录')
    await this.snapshotStore.save({ version: 1, root: canonical })
    this.currentRoot = canonical
    const changed: WorkspaceRootChanged = { rootPath: canonical, source }
    for (const listener of this.listeners) {
      try {
        listener(changed)
      } catch {
        // 监听器异常隔离：单个订阅者不得阻断其他订阅者或主流程
      }
    }
    return this.toContext(canonical)
  }

  /** root 变更订阅：类型化事件，renderer 不持有 main 进程句柄。返回取消订阅函数。 */
  onRootChanged(cb: (changed: WorkspaceRootChanged) => void): () => void {
    this.listeners.add(cb)
    return () => {
      this.listeners.delete(cb)
    }
  }

  async list(root: string, relative = '.'): Promise<WorkspaceEntry[]> {
    this.assertContext(root)
    const { target } = await resolveExisting(root, relative)
    const { readdir } = await import('node:fs/promises')
    const entries = await readdir(target, { withFileTypes: true })
    const base = relative === '.' ? '' : relative
    return entries
      .filter((entry) => entry.isFile() || entry.isDirectory())
      .map((entry) => {
        const entryPath = base ? path.join(base, entry.name) : entry.name
        return {
          name: entry.name,
          path: entryPath.split(path.sep).join('/'),
          kind: entry.isDirectory() ? 'directory' : 'file',
          modifiedAt: '',
        } satisfies WorkspaceEntry
      })
      .sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1)
  }

  async read(root: string, relative: string): Promise<WorkspaceFile> {
    this.assertContext(root)
    const { target } = await resolveExisting(root, relative)
    const metadata = await stat(target)
    if (!metadata.isFile()) throw new Error('只能预览普通文件')
    const extension = path.extname(target).toLowerCase()
    const mime = IMAGE_MIME[extension]
    if (mime && metadata.size > MAX_IMAGE_BYTES) throw new Error('图片超过 5 MB 预览上限')

    const buffer = mime ? await readFile(target) : await readPrefix(target, metadata.size)
    const kind = fileKind(target, buffer)
    const truncated = !mime && metadata.size > MAX_TEXT_BYTES
    return {
      path: relative.split(path.sep).join('/'),
      name: path.basename(target),
      kind,
      content: mime ? buffer.toString('base64') : kind === 'unsupported' ? '' : buffer.toString('utf8'),
      mime,
      size: metadata.size,
      truncated,
    }
  }

  async gitStatus(root: string): Promise<GitStatus> {
    this.assertContext(root)
    const canonical = await canonicalRoot(root)
    try {
      await runGit(['-C', canonical, 'rev-parse', '--is-inside-work-tree'])
      const [branchOutput, statusOutput] = await Promise.all([
        runGit(['-C', canonical, 'branch', '--show-current']),
        runGit(['-C', canonical, 'status', '--porcelain=v1', '-z', '--untracked-files=all']),
      ])
      let branch = branchOutput.trim()
      if (!branch) branch = `detached @ ${(await runGit(['-C', canonical, 'rev-parse', '--short', 'HEAD'])).trim()}`
      return { isRepo: true, branch, changes: parseGitStatus(statusOutput).slice(0, 500) }
    } catch (error) {
      return { isRepo: false, changes: [], detail: error instanceof Error ? error.message : String(error) }
    }
  }

  async gitDiff(root: string, relative: string): Promise<GitDiff> {
    this.assertContext(root)
    const resolved = await resolveGitPath(root, relative)
    const [unstagedOutput, stagedOutput] = await Promise.all([
      runGit(['-C', resolved.root, 'diff', '--no-color', '--unified=3', '--', resolved.relative]),
      runGit(['-C', resolved.root, 'diff', '--cached', '--no-color', '--unified=3', '--', resolved.relative]),
    ])
    const unstaged = truncateDiff(unstagedOutput)
    const staged = truncateDiff(stagedOutput)
    return {
      path: relative,
      unstaged: unstaged.value,
      staged: staged.value,
      truncated: unstaged.truncated || staged.truncated,
    }
  }
}
