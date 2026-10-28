/**
 * 一键启动 innate-dogic 的两个运行形态：
 * - web:     @dogic/shell（内核 + model-gateway 插件的 HTTP 工作台）→ http://127.0.0.1:8787
 * - desktop: @dogic/desktop（electron-vite dev，真实 Electron 窗口）
 *
 * 行为：
 * 1. shell 产物缺失时先构建；启动时自动带上仓内 magpie 二进制（存在才传）。
 * 2. 等待 shell 就绪后再拉起 desktop，两个子进程输出分别带 [web] / [desktop] 前缀。
 * 3. 任一子进程退出或 Ctrl+C 都会回收全部进程树（Windows 用 taskkill /T /F）。
 *
 * 用法：pnpm start [--port 8787] [--no-desktop] [--no-web]
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const isWin = process.platform === 'win32'

const shellDist = path.join(root, 'innate-dogic', 'apps', 'shell', 'dist', 'index.js')
const magpieBin = path.join(root, 'innate-dogic', 'bin', 'magpie.exe')

const args = process.argv.slice(2)
const portIdx = args.indexOf('--port')
const shellPort = portIdx >= 0 && args[portIdx + 1] ? Number(args[portIdx + 1]) : 8787
const withDesktop = !args.includes('--no-desktop')
const withWeb = !args.includes('--no-web')

function sh(command: string, args: string[], opts: { cwd?: string } = {}): ChildProcess {
  // Windows 上 pnpm 是 .cmd shim，Node 直接 spawn 会被 EINVAL 拒绝，走 shell:true；
  // 参数全部是仓内常量，无注入面。
  if (isWin) {
    return spawn(`${command} ${args.join(' ')}`, { shell: true, cwd: opts.cwd, env: process.env })
  }
  return spawn(command, args, { cwd: opts.cwd, env: process.env })
}

function pipe(child: ChildProcess, label: string): void {
  const on = (chunk: Buffer): void => { process.stdout.write(`[${label}] ${chunk}`) }
  child.stdout?.on('data', on)
  child.stderr?.on('data', on)
}

function killTree(child: ChildProcess | undefined): void {
  if (!child?.pid) return
  if (isWin) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
  }
}

let shuttingDown = false
function shutdown(code: number): void {
  if (shuttingDown) return
  shuttingDown = true
  console.log('\n[start] 正在回收全部子进程…')
  killTree(desktopProc)
  killTree(shellProc)
  process.exit(code)
}

async function ensureShellBuilt(): Promise<void> {
  if (fs.existsSync(shellDist)) return
  console.log('[start] shell 产物缺失，先构建 @dogic/shell …')
  const built = spawnSync('pnpm', ['--filter', '@dogic/shell', 'run', 'build'], {
    stdio: 'inherit', shell: isWin, cwd: root,
  })
  if (built.status !== 0) throw new Error('@dogic/shell 构建失败')
}

async function waitShellReady(): Promise<void> {
  const url = `http://127.0.0.1:${shellPort}/api/status`
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) })
      if (res.ok) return
    } catch { /* 未就绪，继续等待 */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`web 未在 20s 内就绪（${url}），请查看 [web] 日志`)
}

let shellProc: ChildProcess | undefined
let desktopProc: ChildProcess | undefined

async function main(): Promise<void> {
  console.log(`[start] innate-labs 一键启动（web=${withWeb ? shellPort : 'off'}，desktop=${withDesktop ? 'on' : 'off'}）`)

  if (withWeb) {
    await ensureShellBuilt()
    const shellArgs = [shellDist, '--port', String(shellPort)]
    if (fs.existsSync(magpieBin)) shellArgs.push('--binary', magpieBin)
    shellProc = spawn(process.execPath, shellArgs, { cwd: root, env: process.env })
    pipe(shellProc, 'web')
    shellProc.on('exit', (code) => {
      console.log(`[start] web 进程退出（code=${code ?? 'signal'}）`)
      shutdown(code ?? 1)
    })
    await waitShellReady()
    console.log(`[start] web 就绪 → http://127.0.0.1:${shellPort}（配置向导 / 模型管理 / 网关状态 / 用量）`)
  }

  if (withDesktop) {
    desktopProc = sh('pnpm', ['--filter', '@dogic/desktop', 'run', 'dev'], { cwd: root })
    pipe(desktopProc, 'desktop')
    desktopProc.on('exit', (code) => {
      console.log(`[start] desktop 进程退出（code=${code ?? 'signal'}）`)
      shutdown(code ?? 0)
    })
    console.log('[start] desktop 启动中（electron-vite dev，窗口将自动打开）')
  }

  console.log('[start] Ctrl+C 一次性回收 web 与 desktop。')

  const stop = (): void => shutdown(0)
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
  if (isWin) process.on('SIGBREAK', stop)
}

main().catch((err: unknown) => {
  console.error('[start] 启动失败:', err instanceof Error ? err.message : err)
  shutdown(1)
})
