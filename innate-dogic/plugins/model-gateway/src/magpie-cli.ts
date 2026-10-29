/**
 * magpie CLI 封装层。
 *
 * 将 T-005 契约覆盖的命令全部封装为类型化函数。
 * 输出解析集中在此文件；agent/model 参数经白名单校验，
 * 杜绝 renderer 传入的命令行注入面（win32 execFile 走 shell 时参数会拼接进命令行）。
 */
import { spawn, execFile } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import type { AgentWiring, Provider, QuotaInfo } from '@dogic/sdk'

export interface CliOptions {
  /** magpie 二进制路径 */
  binaryPath: string
  /** 环境变量 */
  env?: Record<string, string>
  /** 命令超时（毫秒） */
  timeout?: number
}

export interface CliResult {
  stdout: string
  stderr: string
  exitCode: number
}

/** 参数白名单：杜绝 shell 元字符（; & | > < ^ % ! $ 等）进入命令行拼接。 */
function assertSafeArg(value: string, label: string, pattern: RegExp): void {
  if (!pattern.test(value)) {
    throw new Error(`magpie ${label} 参数非法: ${value}`)
  }
}

const AGENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const MODEL_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/

/** 非超时错误的退出码：status/数值 code 即真实退出码，其余（ENOENT 等）记 1。 */
function exitCodeOf(error: Error): number {
  const e = error as NodeJS.ErrnoException & { status?: number }
  return typeof e.status === 'number' ? e.status : typeof e.code === 'number' ? e.code : 1
}

export class MagpieCli {
  private binaryPath: string
  private env: Record<string, string>
  private timeout: number

  constructor(options: CliOptions) {
    this.binaryPath = options.binaryPath
    this.env = options.env ?? {}
    // 实测 magpie CLI 单次调用（providers/models/quota）常耗时 10–13s，默认超时必须覆盖它
    this.timeout = options.timeout ?? 30_000
  }

  /**
   * 执行一条 magpie 命令并返回结果。
   *
   * 超时 reject；非零退出 resolve（exitCode 交给调用方判定）。
   */
  async run(args: string[], options?: { timeout?: number }): Promise<CliResult> {
    return new Promise((resolve, reject) => {
      const timeout = options?.timeout ?? this.timeout
      const child = execFile(this.binaryPath, args, {
        env: { ...process.env, ...this.env },
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        shell: process.platform === 'win32',
      }, (error, stdout, stderr) => {
        if (error) {
          const killed = 'killed' in error && error.killed
          if (killed) {
            reject(error)
            return
          }
          // 非超时/非 kill 错误（如非零退出），仍返回结果让调用方处理 exitCode
          resolve({
            stdout: stdout ?? '',
            stderr: stderr ?? '',
            exitCode: exitCodeOf(error),
          })
          return
        }
        resolve({
          stdout: stdout ?? '',
          stderr: stderr ?? '',
          exitCode: 0,
        })
      })
      child.on('error', reject)
    })
  }

  /**
   * 启动 `magpie serve`（长驻进程）。
   */
  serve(): ChildProcess {
    return spawn(this.binaryPath, ['serve'], {
      env: { ...process.env, ...this.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      shell: process.platform === 'win32',
    })
  }

  /**
   * 健康检查：退出码 0 表示网关健康。
   */
  async healthcheck(): Promise<boolean> {
    try {
      const result = await this.run(['healthcheck'], { timeout: 5000 })
      return result.exitCode === 0
    } catch {
      return false
    }
  }

  /**
   * 添加 provider。
   */
  async providerAdd(preset: string, key: string): Promise<CliResult> {
    assertSafeArg(preset, 'provider preset', AGENT_RE)
    return this.run(['provider', 'add', preset, key])
  }

  /**
   * 测试 provider 连通性。
   */
  async providerTest(providerId: string): Promise<{ latency?: number; ok: boolean }> {
    assertSafeArg(providerId, 'provider id', AGENT_RE)
    const result = await this.run(['provider', 'test', providerId])
    if (result.exitCode !== 0) return { ok: false }
    // 尝试从输出解析延迟
    const match = result.stdout.match(/(\d+(?:\.\d+)?)\s*ms/)
    return {
      ok: true,
      latency: match ? parseFloat(match[1]) : undefined,
    }
  }

  /**
   * 列出 providers。
   */
  async providers(): Promise<CliResult> {
    return this.run(['providers'])
  }

  /**
   * 列出可用 presets。
   */
  async presets(): Promise<CliResult> {
    return this.run(['presets'])
  }

  /**
   * 列出检测到的 agents。
   */
  async ls(): Promise<CliResult> {
    return this.run(['ls'])
  }

  /**
   * 为 agent 接线到模型。
   * 例：magpie claude deepseek/deepseek-chat
   */
  async wireAgent(agent: string, model: string): Promise<CliResult> {
    assertSafeArg(agent, 'agent', AGENT_RE)
    assertSafeArg(model, 'model', MODEL_RE)
    return this.run([agent, model])
  }

  /**
   * 还原 agent 接线。
   * 例：magpie claude default
   */
  async unwireAgent(agent: string): Promise<CliResult> {
    assertSafeArg(agent, 'agent', AGENT_RE)
    return this.run([agent, 'default'])
  }

  /**
   * 查看 agent 当前接线状态。
   */
  async agentStatus(agent: string): Promise<CliResult> {
    assertSafeArg(agent, 'agent', AGENT_RE)
    return this.run([agent])
  }

  /**
   * 列出所有可用模型。
   */
  async models(agent?: string): Promise<CliResult> {
    if (agent) {
      assertSafeArg(agent, 'agent', AGENT_RE)
      return this.run(['models', agent])
    }
    return this.run(['models'])
  }

  /**
   * 查看配额/用量。
   */
  async quota(): Promise<CliResult> {
    return this.run(['quota'])
  }

  /**
   * 保存配置快照。
   */
  async save(name: string): Promise<CliResult> {
    assertSafeArg(name, 'snapshot name', AGENT_RE)
    return this.run(['save', name])
  }

  /**
   * 应用配置快照。
   */
  async use(name: string): Promise<CliResult> {
    assertSafeArg(name, 'snapshot name', AGENT_RE)
    return this.run(['use', name])
  }

  /**
   * 获取版本号。
   */
  async version(): Promise<string> {
    const result = await this.run(['--version'])
    return result.stdout.trim()
  }
}

// —— 输出解析（集中于此文件，供 MagpieModelGateway 与测试共用）——

/** 解析 `magpie providers` 输出为 Provider[]（简化版：`id  name` 双列空白分隔）。 */
export function parseProviders(stdout: string): Provider[] {
  const providers: Provider[] = []
  const lines = stdout.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split(/\s{2,}/)
    if (parts.length >= 2) {
      providers.push({
        id: parts[0],
        name: parts[1] ?? parts[0],
        type: 'api-key',
        models: [],
        enabled: true,
      })
    }
  }
  return providers
}

/** 解析 `magpie ls` 输出为 AgentWiring[]（简化版：首列为 agentId，双列以上视为已接线）。 */
export function parseAgents(stdout: string): AgentWiring[] {
  const agents: AgentWiring[] = []
  const lines = stdout.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split(/\s{2,}/)
    if (parts.length >= 1) {
      agents.push({
        agentId: parts[0],
        wired: parts.length > 1,
        mode: 'gateway',
      })
    }
  }
  return agents
}

/** 解析 `magpie quota` 输出为 QuotaInfo[]（简化版：`provider  used-tokens` 双列）。 */
export function parseQuota(stdout: string): QuotaInfo[] {
  const quotas: QuotaInfo[] = []
  const lines = stdout.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split(/\s{2,}/)
    if (parts.length >= 2) {
      const match = parts[1]?.match(/(\d+(?:\.\d+)?)/)
      quotas.push({
        provider: parts[0],
        used: match ? parseFloat(match[1]) : 0,
        unit: 'tokens',
        stale: false,
        updatedAt: Date.now(),
      })
    }
  }
  return quotas
}
