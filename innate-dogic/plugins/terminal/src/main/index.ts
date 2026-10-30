/**
 * 主进程 TerminalService（W4.3 + W4.6）：按 terminalId 管理 PTY 会话，
 * 并按 executionId 管理受控 process:execute 执行。
 *
 * 安全边界：
 * - renderer 只提交安全 descriptor（profile 引用/尺寸/workspaceId），
 *   shell 可执行与参数数组一律由服务端 profile 表解析；
 * - cwd 只接受宿主提供的当前工作区 root（canonical 校验，拒绝逃逸）；
 * - 环境变量按白名单注入（PATH/HOME/...），profile env 可追加，绝不输出 secret env；
 * - 输出缓冲环形截断（每会话上限），事件分片转发，渲染端断连不阻塞 PTY；
 * - close 才终止会话（Windows taskkill /T /F 进程树回收），deactivate 不杀会话；
 * - dispose 统一回收（应用退出路径）；
 * - process:execute（W4.6）：profile 白名单（userData 可编辑）+ 结构化请求，
 *   参数数组直接 spawn（无 shell 拼接），超时/取消走进程树回收，
 *   输出环形截断，终态发审计事件（脱敏：不含输出与 env）。
 */
import { execFile, spawn as spawnProcess } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
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
  parseProcessProfile,
  parseProcessRequest,
  DEFAULT_PROCESS_TIMEOUT_MS,
  MAX_PROCESS_OUTPUT_CHARS,
  ProcessExecuteAck,
  ProcessProfile,
  ProcessRequest,
  ProcessResult,
} from '../shared/index.js'

const execFileAsync = promisify(execFile)

/** 每会话输出环形缓冲上限（超出后丢弃最旧，保留尾部用于 scrollback）。 */
export const MAX_OUTPUT_CHARS = 1024 * 1024
/** 单次转发事件分片上限（大输出切分，避免单事件过大）。 */
export const EVENT_CHUNK_CHARS = 64 * 1024
/** 默认会话数上限。 */
export const MAX_SESSIONS = 8
/** process:execute 并发执行上限（资源受控）。 */
export const MAX_PROCESS_EXECUTIONS = 8
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

/** 一次受控 process 执行（W4.6）：node:child_process 直接 spawn（参数数组，无 shell 拼接）。 */
interface Execution {
  id: string
  profileId: string
  cwd: string
  startedAt: string
  process: ChildProcess
  stdout: RingBuffer
  stderr: RingBuffer
  finished: boolean
  timedOut: boolean
  cancelled: boolean
  exitCode: number | null
  signal: string | null
  spawnError?: string
  timer?: NodeJS.Timeout
  resolve: (result: ProcessResult) => void
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

/** root 包含性判定（防 .. 逃逸）：candidate 必须等于 root 或位于其内部。 */
function isPathInside(root: string, candidate: string): boolean {
  const rel = path.relative(root, candidate)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
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
  /** W4.6：process profile 白名单（userData 可编辑 + 显式注册）。 */
  private readonly processProfiles = new Map<string, ProcessProfile>()
  /** W4.6：执行中的 process（finish 后移除；结果保留在 results 供 processResult 取回）。 */
  private readonly executions = new Map<string, Execution>()
  private readonly results = new Map<string, Promise<ProcessResult>>()
  private executionCounter = 0
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

  /** 注册 process profile（W4.6 可信配置：userData 白名单可编辑；重复 id 显式失败）。 */
  registerProcessProfile(input: unknown): TerminalShowResult {
    let profile: ProcessProfile
    try {
      profile = parseProcessProfile(input)
    } catch (reason) {
      return { ok: false, detail: reason instanceof Error ? reason.message : String(reason) }
    }
    if (this.processProfiles.has(profile.id)) return { ok: false, detail: `process profile 重复注册: ${profile.id}` }
    this.processProfiles.set(profile.id, profile)
    return { ok: true }
  }

  /** 当前 process profile 白名单 id（renderer 只能引用其中之一）。 */
  processProfileIds(): string[] {
    return [...this.processProfiles.keys()]
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

  /**
   * process:execute（W4.6 受控执行）：
   * - profileId 必须命中白名单（renderer 无法指定可执行文件；绕 preload 的垃圾输入在解析层拒绝）；
   * - cwd 解析到当前 root 内（isPathInside 防 .. 逃逸），不存在即失败、不回退；
   * - 参数数组直接 spawn（无 shell 拼接）；超时/取消走 taskkill 进程树回收；
   * - stdout/stderr 各自环形截断；终态发审计事件（脱敏：不含输出与 env），结果经 processResult 取回。
   */
  async execute(input: unknown): Promise<ProcessExecuteAck> {
    const nextId = (): string => `exec-${++this.executionCounter}`
    const reject = (detail: string): ProcessExecuteAck => {
      const executionId = nextId()
      this.results.set(executionId, Promise.resolve(this.failedResult(executionId, detail)))
      return { executionId, ok: false, detail }
    }
    if (this.disposed) return reject('终端服务已关闭')
    let request: ProcessRequest
    try {
      request = parseProcessRequest(input, new Set(this.processProfileIds()))
    } catch (reason) {
      return reject(reason instanceof Error ? reason.message : String(reason))
    }
    const root = this.currentRoot
    if (!root) return reject('未选择工作区目录，请先选择工作区')
    if (this.executions.size >= MAX_PROCESS_EXECUTIONS) {
      return reject(`process 执行数超过上限 ${MAX_PROCESS_EXECUTIONS}`)
    }
    const profile = this.processProfiles.get(request.profileId)
    if (!profile) return reject(`未注册的 process profile: ${request.profileId}`)
    // cwd：请求级 cwdRelative 优先于 profile 级；解析后必须落在 root 内（防 .. 逃逸）。
    const cwdRelative = request.cwdRelative ?? profile.cwdRelative
    let cwd = root.path
    if (cwdRelative !== undefined && cwdRelative !== '') {
      const resolved = path.resolve(root.path, cwdRelative)
      if (!isPathInside(root.path, resolved)) return reject('process cwd 越出工作区 root')
      cwd = resolved
    }
    // spawn 前校验 cwd 存在（profile 默认 cwd 失效时不回退 root）。
    try {
      const metadata = await stat(cwd)
      if (!metadata.isDirectory()) return reject('process cwd 不存在或不是目录')
    } catch {
      return reject('process cwd 不存在或不是目录')
    }
    const timeoutMs = request.timeoutMs ?? profile.timeoutMs ?? DEFAULT_PROCESS_TIMEOUT_MS
    const executionId = nextId()
    let child: ChildProcess
    try {
      child = spawnProcess(profile.command, [...profile.args, ...request.args], {
        cwd,
        env: this.buildProcessEnv(profile, request),
        windowsHide: true,
      })
    } catch (reason) {
      return reject(`process spawn 失败: ${reason instanceof Error ? reason.message : String(reason)}`)
    }
    const execution: Execution = {
      id: executionId,
      profileId: profile.id,
      cwd,
      startedAt: new Date().toISOString(),
      process: child,
      stdout: new RingBuffer(MAX_PROCESS_OUTPUT_CHARS),
      stderr: new RingBuffer(MAX_PROCESS_OUTPUT_CHARS),
      finished: false,
      timedOut: false,
      cancelled: false,
      exitCode: null,
      signal: null,
      resolve: () => undefined,
    }
    const finishPromise = new Promise<ProcessResult>((resolve) => {
      execution.resolve = resolve
    })
    this.executions.set(executionId, execution)
    this.results.set(executionId, finishPromise)
    const timer = setTimeout(() => {
      if (execution.finished) return
      execution.timedOut = true
      void reclaimProcessTree(child.pid ?? 0).finally(() => this.finish(execution))
    }, timeoutMs)
    timer.unref()
    execution.timer = timer
    child.stdout?.on('data', (chunk: Buffer) => execution.stdout.append(chunk.toString('utf8')))
    child.stderr?.on('data', (chunk: Buffer) => execution.stderr.append(chunk.toString('utf8')))
    child.on('error', (reason: Error) => {
      if (execution.finished) return
      execution.spawnError = reason.message
      this.finish(execution)
    })
    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      if (execution.finished) return
      execution.exitCode = code
      execution.signal = signal
      this.finish(execution)
    })
    return { executionId, ok: true }
  }

  /** 结果通道：按执行 id 取回终态结果（不存在时显式失败）。 */
  async processResult(executionId: unknown): Promise<ProcessResult> {
    const id = typeof executionId === 'string' ? executionId : ''
    const pending = this.results.get(id)
    if (!pending) return this.failedResult(id, 'process 执行不存在')
    return pending
  }

  /** 取消执行：终止进程树；已结束/未知的执行显式失败。 */
  async cancel(executionId: unknown): Promise<boolean> {
    const id = typeof executionId === 'string' ? executionId : ''
    const execution = this.executions.get(id)
    if (!execution || execution.finished) return false
    execution.cancelled = true
    if (execution.finished) return false
    await reclaimProcessTree(execution.process.pid ?? 0)
    try {
      execution.process.kill()
    } catch {
      /* 已退出则忽略 */
    }
    return true
  }

  /** 执行终态：组装结果 + 审计事件（脱敏）；幂等（finished 守卫）。 */
  private finish(execution: Execution): void {
    if (execution.finished) return
    execution.finished = true
    if (execution.timer) {
      clearTimeout(execution.timer)
      execution.timer = undefined
    }
    this.executions.delete(execution.id)
    const finishedAt = new Date()
    const durationMs = finishedAt.getTime() - Date.parse(execution.startedAt)
    let detail: string | undefined
    if (execution.timedOut) detail = '执行超时'
    else if (execution.cancelled) detail = '执行已取消'
    else if (execution.spawnError !== undefined) detail = `process spawn 失败: ${execution.spawnError}`
    else if (execution.exitCode !== 0) detail = `进程以非零退出码 ${execution.exitCode ?? 'null'} 结束`
    const result: ProcessResult = {
      executionId: execution.id,
      ok: execution.exitCode === 0 && !execution.timedOut && !execution.cancelled,
      // 被超时/取消终止的进程没有自然退出码：taskkill 杀出的事件 code
      // （Windows 常报 1）无意义，一律归一为 null（与测试契约一致）。
      exitCode: execution.timedOut || execution.cancelled ? null : execution.exitCode,
      signal: execution.signal,
      durationMs,
      stdout: execution.stdout.snapshot(),
      stderr: execution.stderr.snapshot(),
      truncated: execution.stdout.truncated || execution.stderr.truncated,
      timedOut: execution.timedOut,
      cancelled: execution.cancelled,
      ...(detail ? { detail } : {}),
    }
    execution.resolve(result)
    // 审计事件：不含 stdout/stderr 与 env（脱敏）；结果保留在 results 供 processResult 取回。
    this.options.onEvent({
      executionId: execution.id,
      profileId: execution.profileId,
      cwd: execution.cwd,
      startedAt: execution.startedAt,
      finishedAt: finishedAt.toISOString(),
      durationMs,
      exitCode: execution.timedOut || execution.cancelled ? null : execution.exitCode,
      ok: result.ok,
      ...(detail ? { detail } : {}),
    })
  }

  private failedResult(executionId: string, detail: string): ProcessResult {
    return {
      executionId,
      ok: false,
      exitCode: null,
      signal: null,
      durationMs: 0,
      stdout: '',
      stderr: '',
      truncated: false,
      timedOut: false,
      cancelled: false,
      detail,
    }
  }

  /** 应用退出/卸载统一回收：终止执行中的 process 与全部会话（等待进程树回收完成）。 */
  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    // W4.6：执行中的 process 一并回收（取消标记 + 进程树终止，终态经 finish 落定）。
    const executionReclaims = [...this.executions.values()].map((execution) => {
      if (execution.finished) return Promise.resolve()
      execution.cancelled = true
      return reclaimProcessTree(execution.process.pid ?? 0).finally(() => {
        try {
          execution.process.kill()
        } catch {
          /* 已退出则忽略 */
        }
        this.finish(execution)
      })
    })
    this.executions.clear()
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
    await Promise.all([...executionReclaims, ...reclaims])
    // 回收完成后再清理结果表（执行中的终态仍可被已捕获的 promise 取回）。
    this.results.clear()
  }

  private buildEnv(profile: { env?: Record<string, string> }): Record<string, string> {
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

  /** process env（W4.6）：白名单基座 + profile env + 请求显式 env（后者覆盖）。 */
  private buildProcessEnv(profile: ProcessProfile, request: ProcessRequest): Record<string, string> {
    const env = this.buildEnv(profile)
    for (const [key, value] of Object.entries(request.env ?? {})) env[key] = value
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
