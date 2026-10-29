/**
 * 主进程 TerminalService（W4.3）：按 terminalId 管理 PTY 会话。
 *
 * 安全边界：
 * - renderer 只提交安全 descriptor（profile 引用/尺寸/workspaceId），
 *   shell 可执行与参数数组一律由服务端 profile 表解析；
 * - cwd 只接受宿主提供的当前工作区 root（canonical 校验，拒绝逃逸）；
 * - 环境变量按白名单注入（PATH/HOME/...），profile env 可追加，绝不输出 secret env；
 * - 输出缓冲环形截断（每会话上限），事件分片转发，渲染端断连不阻塞 PTY；
 * - close 才终止会话（Windows taskkill /T /F 进程树回收），deactivate 不杀会话；
 * - dispose 统一回收（应用退出路径）。
 */
import { execFile } from 'node:child_process'
import { realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { spawn } from 'node-pty'
import type { IPty } from 'node-pty'
import {
  parseTerminalDescriptor,
  parseTerminalInput,
  parseTerminalProfile,
  parseTerminalSize,
  TerminalDescriptor,
  TerminalEvent,
  TerminalProfile,
  TerminalShowResult,
} from '../shared/index.js'

const execFileAsync = promisify(execFile)

/** 每会话输出环形缓冲上限（超出后丢弃最旧，保留尾部用于 scrollback）。 */
export const MAX_OUTPUT_CHARS = 1024 * 1024
/** 单次转发事件分片上限（大输出切分，避免单事件过大）。 */
export const EVENT_CHUNK_CHARS = 64 * 1024
/** 默认会话数上限。 */
export const MAX_SESSIONS = 8
/** 环境变量注入白名单：只注入必要项，不注入 secret。 */
export const ENV_ALLOWLIST = [
  'PATH',
  'PATHEXT',
  'SYSTEMROOT',
  'SYSTEMDRIVE',
  'WINDIR',
  'COMSPEC',
  'HOME',
  'USERPROFILE',
  'USERNAME',
  'LOGNAME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'TERM',
] as const

/** 环形输出缓冲：容量固定，超出后保留尾部。 */
class RingBuffer {
  private data = ''
  private dropped = false

  constructor(private readonly capacity: number) {}

  append(chunk: string): void {
    if (chunk.length >= this.capacity) {
      this.data = chunk.slice(chunk.length - this.capacity)
      this.dropped = true
      return
    }
    if (this.data.length + chunk.length > this.capacity) {
      this.data = this.data.slice(this.data.length + chunk.length - this.capacity) + chunk
      this.dropped = true
      return
    }
    this.data += chunk
  }

  get truncated(): boolean {
    return this.dropped
  }

  snapshot(): string {
    return this.data
  }
}

interface Session {
  id: string
  descriptor: TerminalDescriptor
  process: IPty
  exited: boolean
  closed: boolean
  exitCode: number | null
  signal: number | null
  buffer: RingBuffer
}

export interface TerminalServiceLimits {
  maxSessions: number
  maxOutputChars: number
}

export interface TerminalServiceOptions {
  /** 事件出口（desktop 组合里为 webContents.send 的窄包装）。 */
  onEvent: (event: TerminalEvent) => void
  limits?: Partial<TerminalServiceLimits>
  /** 环境变量基座（默认 process.env；测试可注入）。 */
  env?: NodeJS.ProcessEnv
}

/** 内置 default profile：Windows 默认 shell 由 COMSPEC 决定（服务端解析）。 */
export function builtinDefaultProfile(env: NodeJS.ProcessEnv = process.env): TerminalProfile {
  const comspec = env.COMSPEC
  const systemRoot = env.SYSTEMROOT ?? 'C:\\Windows'
  return {
    id: 'default',
    shell: comspec ?? path.join(systemRoot, 'System32', 'cmd.exe'),
    args: [],
  }
}

function workspaceIdFor(rootPath: string): string {
  const canonical = path.resolve(rootPath)
  // FNV-1a 32 位散列：把 canonical 路径映射为稳定 id（不暴露路径本身）。
  let hash = 0x811c9dc5
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  const base = path.basename(canonical).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) || 'workspace'
  return `${base}-${(hash >>> 0).toString(16)}`
}

/** Windows 进程树回收：taskkill /T /F（与 W4.1 spike 验证一致）。 */
async function reclaimProcessTree(pid: number): Promise<void> {
  if (process.platform === 'win32' && pid > 0) {
    await execFileAsync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true }).catch(() => undefined)
    return
  }
  if (pid > 0) {
    try {
      process.kill(pid)
    } catch {
      /* 已退出则忽略 */
    }
  }
}

export class TerminalService {
  private readonly sessions = new Map<string, Session>()
  private readonly profiles = new Map<string, TerminalProfile>()
  private currentRoot: { id: string; path: string } | null = null
  private disposed = false

  constructor(private readonly options: TerminalServiceOptions) {
    const limits = options.limits ?? {}
    this.maxSessions = limits.maxSessions ?? MAX_SESSIONS
    this.maxOutputChars = limits.maxOutputChars ?? MAX_OUTPUT_CHARS
    const profile = builtinDefaultProfile(options.env ?? process.env)
    this.profiles.set(profile.id, profile)
  }

  private readonly maxSessions: number
  private readonly maxOutputChars: number

  /** 注册服务端 profile（可信配置；重复 id 显式失败）。 */
  registerProfile(input: unknown): TerminalShowResult {
    let profile: TerminalProfile
    try {
      profile = parseTerminalProfile(input)
    } catch (reason) {
      return { ok: false, detail: reason instanceof Error ? reason.message : String(reason) }
    }
    if (this.profiles.has(profile.id)) return { ok: false, detail: `shell profile 重复注册: ${profile.id}` }
    this.profiles.set(profile.id, profile)
    return { ok: true }
  }

  /** 当前 root（W4.5 订阅入口：root 变更时宿主调用）。 */
  async setRoot(rootPath: string): Promise<{ id: string; path: string } | null> {
    try {
      const canonical = await realpath(path.resolve(rootPath))
      const metadata = await stat(canonical)
      if (!metadata.isDirectory()) return null
      this.currentRoot = { id: workspaceIdFor(canonical), path: canonical }
      return { ...this.currentRoot }
    } catch {
      return null
    }
  }

  getRoot(): { id: string; path: string } | null {
    return this.currentRoot ? { ...this.currentRoot } : null
  }

  async create(input: unknown): Promise<TerminalShowResult> {
    if (this.disposed) return { ok: false, detail: '终端服务已关闭' }
    let descriptor: TerminalDescriptor
    try {
      descriptor = parseTerminalDescriptor(input)
    } catch (reason) {
      return { ok: false, detail: reason instanceof Error ? reason.message : String(reason) }
    }
    if (this.sessions.has(descriptor.id)) {
      return { ok: false, detail: `terminal 会话已存在: ${descriptor.id}` }
    }
    if (this.sessions.size >= this.maxSessions) {
      return { ok: false, detail: `会话数超过上限 ${this.maxSessions}` }
    }
    const root = this.currentRoot
    if (!root) return { ok: false, detail: '未选择工作区目录，请先选择工作区' }
    // renderer 提交的是它已知的工作区路径（或服务端派生 id）：
    // 两者都必须映射到当前 root，避免任意目录 cwd。
    if (descriptor.workspaceId !== undefined &&
        descriptor.workspaceId !== root.id &&
        workspaceIdFor(descriptor.workspaceId) !== root.id) {
      return { ok: false, detail: 'terminal workspaceId 与当前工作区不匹配' }
    }
    // spawn 前重新校验 root 仍存在（root 被删除/不可访问时不回退到任意目录）。
    try {
      const metadata = await stat(root.path)
      if (!metadata.isDirectory()) return { ok: false, detail: '工作区目录已失效，请重新选择' }
    } catch {
      return { ok: false, detail: '工作区目录已失效，请重新选择' }
    }
    const profile = this.profiles.get(descriptor.profile.id)
    if (!profile) return { ok: false, detail: `未知 shell profile: ${descriptor.profile.id}` }

    try {
      const process = spawn(profile.shell, profile.args, {
        name: 'xterm-256color',
        cols: descriptor.cols,
        rows: descriptor.rows,
        cwd: root.path,
        env: this.buildEnv(profile),
      })
      const session: Session = {
        id: descriptor.id,
        descriptor,
        process,
        exited: false,
        closed: false,
        exitCode: null,
        signal: null,
        buffer: new RingBuffer(this.maxOutputChars),
      }
      process.onData((data) => this.onOutput(session, data))
      process.onExit(({ exitCode, signal }) => this.onExit(session, exitCode, signal))
      this.sessions.set(descriptor.id, session)
      return { ok: true }
    } catch (reason) {
      return { ok: false, detail: reason instanceof Error ? reason.message : String(reason) }
    }
  }

  /** 输入通道：向 PTY 写入类型化输入。未知/已退出/已关闭会话显式拒绝。 */
  async input(terminalId: unknown, data: unknown): Promise<boolean> {
    const session = this.sessions.get(typeof terminalId === 'string' ? terminalId : '')
    if (!session || session.closed || session.exited) return false
    let input: string
    try {
      input = parseTerminalInput(data)
    } catch {
      return false
    }
    try {
      session.process.write(input)
      return true
    } catch {
      return false
    }
  }

  /** 尺寸通道：resize PTY。 */
  async resize(terminalId: unknown, size: unknown): Promise<boolean> {
    const session = this.sessions.get(typeof terminalId === 'string' ? terminalId : '')
    if (!session || session.closed || session.exited) return false
    let parsed: { cols: number; rows: number }
    try {
      parsed = parseTerminalSize(size)
    } catch {
      return false
    }
    try {
      session.process.resize(parsed.cols, parsed.rows)
      return true
    } catch {
      return false
    }
  }

  /** 关闭通道：终止会话并回收进程树。重复关闭显式失败。 */
  async close(terminalId: unknown): Promise<boolean> {
    const id = typeof terminalId === 'string' ? terminalId : ''
    const session = this.sessions.get(id)
    if (!session || session.closed) return false
    session.closed = true
    const pid = session.process.pid
    await reclaimProcessTree(pid)
    try {
      session.process.kill()
    } catch {
      /* 已退出则忽略 */
    }
    this.sessions.delete(id)
    return true
  }

  /** scrollback 快照（W4.4 标签切换恢复用）。 */
  snapshot(terminalId: unknown): { ok: boolean; scrollback?: string; truncated?: boolean; detail?: string } {
    const session = this.sessions.get(typeof terminalId === 'string' ? terminalId : '')
    if (!session) return { ok: false, detail: 'terminal 会话不存在' }
    return { ok: true, scrollback: session.buffer.snapshot(), truncated: session.buffer.truncated }
  }

  list(): string[] {
    return [...this.sessions.keys()]
  }

  /** 应用退出/卸载统一回收：关闭全部会话（等待进程树回收完成）。 */
  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    const reclaims = [...this.sessions.values()].map((session) => {
      session.closed = true
      return reclaimProcessTree(session.process.pid).finally(() => {
        try {
          session.process.kill()
        } catch {
          /* 已退出则忽略 */
        }
      })
    })
    this.sessions.clear()
    await Promise.all(reclaims)
  }

  private buildEnv(profile: TerminalProfile): Record<string, string> {
    const base = this.options.env ?? process.env
    const env: Record<string, string> = {}
    for (const key of ENV_ALLOWLIST) {
      const value = base[key]
      if (typeof value === 'string' && value.length > 0) env[key] = value
    }
    env.TERM = 'xterm-256color'
    for (const [key, value] of Object.entries(profile.env ?? {})) env[key] = value
    return env
  }

  /** 输出事件：环形缓冲 + 分片转发；终态（exited/closed）后忽略后续事件。 */
  private onOutput(session: Session, data: string): void {
    if (session.exited || session.closed) return
    session.buffer.append(data)
    for (let offset = 0; offset < data.length; offset += EVENT_CHUNK_CHARS) {
      this.options.onEvent({ terminalId: session.id, data: data.slice(offset, offset + EVENT_CHUNK_CHARS) })
    }
  }

  private onExit(session: Session, exitCode: number, signal: number | undefined): void {
    if (session.exited || session.closed) return
    session.exited = true
    session.exitCode = exitCode
    session.signal = signal ?? null
    this.options.onEvent({ terminalId: session.id, exitCode, signal })
  }
}
