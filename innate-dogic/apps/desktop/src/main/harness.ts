import { spawn, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { EventEmitter } from 'node:events'
import { commandExists, readMode, redactLaunchSecrets, resolveDshEntry } from '@dogic/core'
import type { HarnessLaunchResult, HarnessState } from '@dogic/core'

/** 找到真正可 spawn 的 Node；Windows 上排除 npm/宿主提供的扩展名无关 shim 和 .cmd。 */
async function resolveNodeRuntime(): Promise<string | undefined> {
  const isWin = process.platform === 'win32'
  const command = await commandExists('node')
  const candidates = [
    process.env.INNATE_NODE_PATH,
    command && (!isWin || /\.exe$/i.test(command)) ? command : undefined,
    ...(isWin
      ? [
          path.join(os.homedir(), '.local', 'opt', 'node', 'node.exe'),
          process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'nodejs', 'node.exe') : undefined,
          process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs', 'nodejs', 'node.exe') : undefined,
        ]
      : []),
  ]
  return candidates.find((candidate): candidate is string => candidate !== undefined && existsSync(candidate))
}

/** simple 模式 overlay 路径：打包资源优先，开发取 apps/desktop/resources（out/main 上溯两级） */
function simpleOverlayPath(): string | undefined {
  const packed = path.join(process.resourcesPath ?? '', 'innate-simple.patch.yml')
  if (existsSync(packed)) return packed
  const dev = path.resolve(__dirname, '../../resources/innate-simple.patch.yml')
  return existsSync(dev) ? dev : undefined
}

/** 从 stdout 解析 "dsh web: <url>"（含 token），对齐 dsh-desktop extractLaunchToken */
function extractLaunchUrl(line: string): string | undefined {
  const match = /\bdsh web:\s*(\S+)/u.exec(line)
  return match?.[1]
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as { port: number }
      srv.close(() => resolve(port))
    })
  })
}

/**
 * Harness 运行时：以 dsh-desktop 同款机制拉起 `dsh web`。
 *
 * 与 dsh-desktop 的一个刻意差异：不隔离 DSH_HOME——使用用户真实的 ~/.dsh，
 * 使 magpie 写入的接线（cordis.patch.yml 的 llm-pi-ai 路由 + .env 凭据）直接生效。
 */
export class HarnessRuntime extends EventEmitter {
  private child?: ChildProcess
  private state: HarnessState = { phase: 'idle', message: 'Harness 未运行' }
  private logBuffer: string[] = []

  getState(): HarnessState {
    return { ...this.state }
  }

  private setState(patch: Partial<HarnessState>): void {
    this.state = { ...this.state, ...patch }
    this.emit('state', this.getState())
  }

  private log(line: string): void {
    // 认证 URL 只进运行态（extractLaunchUrl 在上游拿真实值）；内存缓冲、log 事件与落盘共用此边界
    const safe = redactLaunchSecrets(line)
    this.logBuffer.push(safe)
    if (this.logBuffer.length > 2000) this.logBuffer.splice(0, this.logBuffer.length - 2000)
    this.emit('log', safe)
  }

  async launch(userDataDir: string): Promise<HarnessLaunchResult> {
    if (this.state.phase === 'running' || this.state.phase === 'starting') {
      return { ok: true, url: this.state.url, port: this.state.port, detail: '已在运行' }
    }
    const resolved = await resolveDshEntry()
    if (!resolved.entry) {
      return {
        ok: false,
        detail: `未解析到 dsh 入口（${resolved.via}）。请先 npm install -g @deepseek-ai/dsh`,
      }
    }

    const port = await freePort()
    const launchDir = path.join(userDataDir, 'harness-launch')
    await mkdir(launchDir, { recursive: true })
    const logFile = path.join(userDataDir, 'logs', 'harness.log')
    await mkdir(path.dirname(logFile), { recursive: true })

    // M2 T2.5：simple 模式注入裁剪 overlay（--patch 是 launcher 级选项，须走 --profile 形式）
    const overlay = simpleOverlayPath()
    const simple = readMode(userDataDir) === 'simple' && overlay !== undefined
    const args = simple
      ? [resolved.entry, '--profile', 'web', '--patch', overlay!, '--no-open', '--host', '127.0.0.1', '--port', String(port)]
      : [resolved.entry, 'web', '--no-open', '--host', '127.0.0.1', '--port', String(port)]
    // 优先使用系统 Node：当前 dsh 的原生加载器会校验运行时，Electron 内置 Node 可能被拒绝。
    // 仅在找不到 Node 时保留 Electron 兜底；不设 DSH_HOME，继承用户真实 ~/.dsh。
    const isWin = process.platform === 'win32'
    const nodeRuntime = await resolveNodeRuntime()
    const runtime = nodeRuntime ?? process.execPath
    const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: '1' }
    if (!nodeRuntime && process.platform !== 'darwin') env.ELECTRON_RUN_AS_NODE = '1'
    else delete env.ELECTRON_RUN_AS_NODE
    delete env.ELECTRON_RUN_AS_NODE_CHILD

    this.setState({ phase: 'starting', message: `启动 Harness (${resolved.via})，端口 ${port}…` })
    this.log(`[innateos] spawn: ${runtime} ${args.join(' ')}`)

    const child = spawn(runtime, args, {
      cwd: launchDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      detached: isWin,
    })
    this.child = child

    child.stdout?.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString('utf8').split(/\r?\n/)) {
        if (!line) continue
        this.log(line)
        const url = extractLaunchUrl(line)
        if (url) void this.awaitReady(url, port, logFile)
      }
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString('utf8').split(/\r?\n/)) {
        if (line) this.log(`[stderr] ${line}`)
      }
    })
    child.on('error', (error) => {
      this.child = undefined
      this.log(`[spawn-error] ${String(error)}`)
      this.setState({ phase: 'failed', message: `Harness 进程启动失败：${String(error)}`, url: undefined })
      void writeFile(logFile, this.logBuffer.join('\n'), 'utf8').catch(() => {})
    })
    child.on('exit', (code) => {
      const wasRunning = this.state.phase === 'running'
      this.child = undefined
      this.setState({
        phase: wasRunning ? 'stopped' : 'failed',
        message: wasRunning ? `Harness 已退出 (code ${code})` : `Harness 启动失败 (code ${code})，见日志`,
        url: undefined,
      })
      void writeFile(logFile, this.logBuffer.join('\n'), 'utf8').catch(() => {})
    })

    // 超时兜底：60s 内未见 "dsh web:" 行则判失败
    setTimeout(() => {
      if (this.state.phase === 'starting') {
        this.setState({ phase: 'failed', message: '60s 内未获得 Harness 启动 URL，见日志' })
        void writeFile(logFile, this.logBuffer.join('\n'), 'utf8').catch(() => {})
      }
    }, 60_000).unref()

    // 等待 running/failed（由 awaitReady 或 exit 回调置位）
    return new Promise((resolve) => {
      const onState = (s: HarnessState): void => {
        if (s.phase === 'running') {
          this.off('state', onState)
          resolve({ ok: true, url: s.url, port: s.port, detail: 'Harness 就绪' })
        } else if (s.phase === 'failed') {
          this.off('state', onState)
          resolve({ ok: false, detail: s.message })
        }
      }
      this.on('state', onState)
    })
  }

  /** dsh-desktop 语义：有 token 且探针返回 <500（未认证 401 也算端口就绪） */
  private async awaitReady(url: string, port: number, logFile: string): Promise<void> {
    if (this.state.url !== undefined) return
    this.setState({ phase: 'starting', message: 'Harness 端口已开，等待就绪…', url, port })
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
        if (res.status < 500) {
          this.setState({ phase: 'running', message: `Harness 运行中 (${url})`, url, port })
          void writeFile(logFile, this.logBuffer.join('\n'), 'utf8').catch(() => {})
          return
        }
      } catch {
        /* 继续等 */
      }
      await new Promise((r) => setTimeout(r, 500))
    }
    this.setState({ phase: 'failed', message: '就绪探测超时，见日志' })
  }

  async stop(): Promise<void> {
    const child = this.child
    this.child = undefined
    if (!child || child.pid === undefined) {
      this.setState({ phase: 'idle', message: 'Harness 未运行', url: undefined })
      return
    }
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true })
    } else {
      child.kill('SIGTERM')
    }
    this.setState({ phase: 'stopped', message: '已请求停止 Harness', url: undefined })
  }
}
