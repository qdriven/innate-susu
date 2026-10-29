/**
 * terminal 契约（W4.2）：主进程与 renderer 共用的窄类型。
 *
 * renderer 只提交安全字段：terminalId/profile 引用/初始尺寸/workspaceId；
 * 不提交拼接后的 shell 命令、绝对路径或环境变量值。
 * 非法 id、非法尺寸、未知 shell、伪造 capability 一律显式拒绝。
 */

export const TERMINAL_PROVIDER_ID = 'terminal'

/** 受控 shell profile：显式 shell 与参数数组，禁止字符串拼接。 */
export interface TerminalProfile {
  id: string
  shell: string
  args: string[]
  env?: Record<string, string>
}

export interface TerminalDescriptor {
  id: string
  providerId: string
  kind: 'terminal'
  title: string
  workspaceId?: string
  cols: number
  rows: number
  profile: TerminalProfile
}

export interface TerminalShowResult {
  ok: boolean
  detail?: string
}

export interface TerminalExitEvent {
  terminalId: string
  exitCode: number
  signal?: number
}

export interface TerminalOutputEvent {
  terminalId: string
  data: string
}

export interface TerminalErrorEvent {
  terminalId: string
  message: string
}

export type TerminalEvent = TerminalOutputEvent | TerminalExitEvent | TerminalErrorEvent

export const MIN_COLS = 2
export const MAX_COLS = 500
export const MIN_ROWS = 2
export const MAX_ROWS = 500

const terminalIdPattern = /^[A-Za-z0-9_-]{1,64}$/

function invalid(detail: string): never {
  throw new Error(detail)
}

/**
 * 解析不可信 renderer 输入。只复制安全字段；
 * 传入 shell 命令字符串/绝对 cwd/伪造 capability 会被白名单校验拒绝。
 */
export function parseTerminalDescriptor(input: unknown): TerminalDescriptor {
  if (!input || typeof input !== 'object') invalid('terminal descriptor 必须是对象')
  const value = input as Partial<TerminalDescriptor>
  if (typeof value.id !== 'string' || !terminalIdPattern.test(value.id)) {
    invalid('terminal id 必须是 1-64 位字母数字/下划线/连字符')
  }
  if (value.providerId !== TERMINAL_PROVIDER_ID) invalid('terminal providerId 不受支持')
  if (value.kind !== 'terminal') invalid('terminal kind 不受支持')
  if (typeof value.title !== 'string' || value.title.length === 0 || value.title.length > 120) {
    invalid('terminal title 必须是非空字符串（≤120）')
  }
  if (value.workspaceId !== undefined && typeof value.workspaceId !== 'string') {
    invalid('terminal workspaceId 必须是字符串')
  }
  if (typeof value.cols !== 'number' || !Number.isInteger(value.cols) ||
      value.cols < MIN_COLS || value.cols > MAX_COLS) {
    invalid(`terminal cols 必须是 ${MIN_COLS}-${MAX_COLS} 的整数`)
  }
  if (typeof value.rows !== 'number' || !Number.isInteger(value.rows) ||
      value.rows < MIN_ROWS || value.rows > MAX_ROWS) {
    invalid(`terminal rows 必须是 ${MIN_ROWS}-${MAX_ROWS} 的整数`)
  }
  const profile = parseTerminalProfile(value.profile)
  return {
    id: value.id,
    providerId: TERMINAL_PROVIDER_ID,
    kind: 'terminal',
    title: value.title,
    ...(value.workspaceId ? { workspaceId: value.workspaceId } : {}),
    cols: value.cols,
    rows: value.rows,
    profile,
  }
}

/** shell profile 白名单校验：只接受注册过的 profile id 或内置安全默认。 */
const BUILTIN_PROFILE_IDS = new Set(['default'])

export function isKnownProfileId(id: string): boolean {
  return BUILTIN_PROFILE_IDS.has(id)
}

export function parseTerminalProfile(input: unknown): TerminalProfile {
  if (!input || typeof input !== 'object') invalid('terminal profile 必须是对象')
  const value = input as Partial<TerminalProfile>
  if (typeof value.id !== 'string' || value.id.length === 0 || value.id.length > 64) {
    invalid('terminal profile id 必须是非空字符串（≤64）')
  }
  if (!isKnownProfileId(value.id)) invalid(`未知 shell profile: ${value.id}`)
  return {
    id: value.id,
    shell: typeof value.shell === 'string' && value.shell.length > 0 ? value.shell : '',
    args: Array.isArray(value.args) ? value.args.filter((item): item is string => typeof item === 'string') : [],
    ...(value.env && typeof value.env === 'object' && !Array.isArray(value.env)
      ? { env: Object.fromEntries(Object.entries(value.env).filter(([, v]) => typeof v === 'string')) }
      : {}),
  }
}

/** 尺寸校验（resize 通道复用）。 */
export function parseTerminalSize(input: unknown): { cols: number; rows: number } {
  if (!input || typeof input !== 'object') invalid('terminal 尺寸必须是对象')
  const value = input as Partial<{ cols: number; rows: number }>
  if (typeof value.cols !== 'number' || !Number.isInteger(value.cols) ||
      value.cols < MIN_COLS || value.cols > MAX_COLS) {
    invalid(`terminal cols 必须是 ${MIN_COLS}-${MAX_COLS} 的整数`)
  }
  if (typeof value.rows !== 'number' || !Number.isInteger(value.rows) ||
      value.rows < MIN_ROWS || value.rows > MAX_ROWS) {
    invalid(`terminal rows 必须是 ${MIN_ROWS}-${MAX_ROWS} 的整数`)
  }
  return { cols: value.cols, rows: value.rows }
}

/** 输入通道：字符串，单次写入上限。 */
export const MAX_INPUT_CHARS = 64 * 1024

export function parseTerminalInput(input: unknown): string {
  if (typeof input !== 'string') invalid('terminal 输入必须是字符串')
  if (input.length > MAX_INPUT_CHARS) invalid(`terminal 输入超过 ${MAX_INPUT_CHARS} 字符上限`)
  return input
}

// ---------------------------------------------------------------- process:execute

/**
 * process:execute 结构化请求（W4.6）：
 * - profileId 必须命中白名单（userData 可编辑）；
 * - cwdRelative 必须是工作区 root 下的相对路径（防 .. 逃逸）；
 * - 参数数组传递，禁止拼接字符串命令。
 */
export interface ProcessRequest {
  profileId: string
  args: string[]
  cwdRelative?: string
  timeoutMs?: number
  env?: Record<string, string>
}

export interface ProcessResult {
  ok: boolean
  exitCode: number | null
  signal: number | null
  durationMs: number
  stdout: string
  stderr: string
  truncated: boolean
  timedOut: boolean
  cancelled: boolean
  detail?: string
}

export const MAX_PROCESS_OUTPUT_CHARS = 256 * 1024
export const DEFAULT_PROCESS_TIMEOUT_MS = 60_000
export const MAX_PROCESS_TIMEOUT_MS = 600_000

export interface ProcessProfile {
  id: string
  command: string
  args: string[]
  cwdRelative?: string
  timeoutMs?: number
  env?: Record<string, string>
}

const processProfileIdPattern = /^[A-Za-z0-9_-]{1,64}$/

export function parseProcessProfile(input: unknown): ProcessProfile {
  if (!input || typeof input !== 'object') invalid('process profile 必须是对象')
  const value = input as Partial<ProcessProfile>
  if (typeof value.id !== 'string' || !processProfileIdPattern.test(value.id)) {
    invalid('process profile id 必须是 1-64 位字母数字/下划线/连字符')
  }
  if (typeof value.command !== 'string' || value.command.length === 0) {
    invalid('process profile command 必须是非空字符串')
  }
  // 命令白名单只允许可执行文件名/相对路径：禁止 shell 元字符、绝对路径与 .. 逃逸
  if (/[<>|&;`$]/.test(value.command) || value.command.includes('..') ||
      /^[A-Za-z]:[\\/]/.test(value.command) || value.command.startsWith('/') || value.command.startsWith('\\')) {
    invalid('process profile command 含非法字符或绝对路径')
  }
  if (value.args !== undefined && (!Array.isArray(value.args) || value.args.some((item) => typeof item !== 'string'))) {
    invalid('process profile args 必须是字符串数组')
  }
  if (value.cwdRelative !== undefined && (typeof value.cwdRelative !== 'string' || value.cwdRelative.includes('\0'))) {
    invalid('process profile cwdRelative 必须是字符串')
  }
  if (value.timeoutMs !== undefined && (typeof value.timeoutMs !== 'number' ||
      !Number.isInteger(value.timeoutMs) || value.timeoutMs <= 0 || value.timeoutMs > MAX_PROCESS_TIMEOUT_MS)) {
    invalid(`process profile timeoutMs 必须是 1-${MAX_PROCESS_TIMEOUT_MS} 的整数`)
  }
  return {
    id: value.id,
    command: value.command,
    args: Array.isArray(value.args) ? [...value.args] : [],
    ...(typeof value.cwdRelative === 'string' ? { cwdRelative: value.cwdRelative } : {}),
    ...(typeof value.timeoutMs === 'number' ? { timeoutMs: value.timeoutMs } : {}),
    ...(value.env && typeof value.env === 'object' && !Array.isArray(value.env)
      ? { env: Object.fromEntries(Object.entries(value.env).filter(([, v]) => typeof v === 'string')) }
      : {}),
  }
}

/** 执行请求校验：profileId 必须命中白名单；args 必须是字符串数组。 */
export function parseProcessRequest(input: unknown, knownProfileIds: ReadonlySet<string>): ProcessRequest {
  if (!input || typeof input !== 'object') invalid('process 请求必须是对象')
  const value = input as Partial<ProcessRequest>
  if (typeof value.profileId !== 'string' || value.profileId.length === 0) {
    invalid('process 请求 profileId 必须是非空字符串')
  }
  if (!knownProfileIds.has(value.profileId)) invalid(`未注册的 process profile: ${value.profileId}`)
  if (!Array.isArray(value.args) || value.args.some((item) => typeof item !== 'string')) {
    invalid('process 请求 args 必须是字符串数组（禁止拼接）')
  }
  if (value.cwdRelative !== undefined && (typeof value.cwdRelative !== 'string' ||
      value.cwdRelative.includes('\0') || /^[A-Za-z]:[\\/]/.test(value.cwdRelative))) {
    invalid('process 请求 cwdRelative 必须是工作区相对路径')
  }
  if (value.timeoutMs !== undefined && (typeof value.timeoutMs !== 'number' ||
      !Number.isInteger(value.timeoutMs) || value.timeoutMs <= 0 || value.timeoutMs > MAX_PROCESS_TIMEOUT_MS)) {
    invalid(`process 请求 timeoutMs 必须是 1-${MAX_PROCESS_TIMEOUT_MS} 的整数`)
  }
  return {
    profileId: value.profileId,
    args: [...value.args],
    ...(typeof value.cwdRelative === 'string' ? { cwdRelative: value.cwdRelative } : {}),
    ...(typeof value.timeoutMs === 'number' ? { timeoutMs: value.timeoutMs } : {}),
    ...(value.env && typeof value.env === 'object' && !Array.isArray(value.env)
      ? { env: Object.fromEntries(Object.entries(value.env).filter(([, v]) => typeof v === 'string')) }
      : {}),
  }
}

export interface AuditRecord {
  at: string
  profileId: string
  cwd: string
  exitCode: number | null
  durationMs: number
  ok: boolean
  detail?: string
}

// ---------------------------------------------------------------- preload 窄通道

/**
 * preload 暴露给 renderer 的唯一宿主契约（W4.2 窄通道）。
 * renderer 只能提交安全字段（terminalId/字符串/尺寸对象）；
 * 不暴露 shell 命令拼接、绝对路径、进程句柄或 Node 对象。
 * 事件通道（output/exit/error）由主进程主动推送，renderer 无法伪造来源。
 */
export interface TerminalApi {
  terminalCreate(descriptor: TerminalDescriptor): Promise<TerminalShowResult>
  terminalInput(terminalId: string, data: string): Promise<boolean>
  terminalResize(terminalId: string, size: { cols: number; rows: number }): Promise<boolean>
  terminalClose(terminalId: string): Promise<boolean>
  terminalOnEvent(cb: (event: TerminalEvent) => void): (() => void)
}

