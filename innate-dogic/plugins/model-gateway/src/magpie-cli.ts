/**
 * magpie CLI 封装层。
 *
 * 将 T-005 契约覆盖的命令全部封装为类型化函数。
 * 输出解析集中在此文件。
 */
import { spawn, execFile } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'

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
   */
  async run(args: string[], options?: { timeout?: number }): Promise<CliResult> {
    return new Promise((resolve, reject) => {
      const timeout = options?.timeout ?? this.timeout
      const child = execFile(this.binaryPath, args, {
        env: { ...process.env, ...this.env },
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      }, (error, stdout, stderr) => {
        if (error && !('killed' in error)) {
          // 非超时/非 kill 错误，仍返回结果（让调用方处理 exitCode）
          resolve({
            stdout: stdout ?? '',
            stderr: stderr ?? '',
            exitCode: (error as NodeJS.ErrnoException).code ? 1 : (error as any).status ?? 1,
          })
          return
        }
        if (error) {
          reject(error)
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
    return this.run(['provider', 'add', preset, key])
  }

  /**
   * 测试 provider 连通性。
   */
  async providerTest(providerId: string): Promise<{ latency?: number; ok: boolean }> {
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
    return this.run([agent, model])
  }

  /**
   * 还原 agent 接线。
   * 例：magpie claude default
   */
  async unwireAgent(agent: string): Promise<CliResult> {
    return this.run([agent, 'default'])
  }

  /**
   * 查看 agent 当前接线状态。
   */
  async agentStatus(agent: string): Promise<CliResult> {
    return this.run([agent])
  }

  /**
   * 列出所有可用模型。
   */
  async models(agent?: string): Promise<CliResult> {
    return agent ? this.run(['models', agent]) : this.run(['models'])
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
    return this.run(['save', name])
  }

  /**
   * 应用配置快照。
   */
  async use(name: string): Promise<CliResult> {
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
