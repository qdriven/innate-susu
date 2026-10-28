import { spawn, execFile } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { promisify } from 'node:util'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { app } from 'electron'

const execFileAsync = promisify(execFile)

/** 启动 magpie（desktop 优先；INNATE_MAGPIE_FORM=serve 走纯网关） */
export function startMagpie(): { ok: boolean; detail: string } {
  const form = process.env.INNATE_MAGPIE_FORM ?? 'desktop'
  const args = form === 'serve' ? ['serve'] : []
  try {
    const child = spawn(resolveMagpieBin(), args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: form === 'serve',
      shell: process.platform === 'win32',
    })
    child.unref()
    return { ok: true, detail: `已请求以 ${form} 形态启动 magpie（若 CLI 不在 PATH 请手动启动）` }
  } catch (e) {
    return { ok: false, detail: `启动失败: ${String(e)}（可手动打开 magpie 桌面版）` }
  }
}

/** 断开 dsh 接线：magpie dsh default（原子恢复 dsh 原配置） */
export async function disconnectDsh(): Promise<{ ok: boolean; detail: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(resolveMagpieBin(), ['dsh', 'default'], {
      timeout: 30_000,
      shell: process.platform === 'win32',
    })
    const out = `${stdout}${stderr}`.trim()
    return { ok: true, detail: out || '已请求断开（magpie 将恢复 dsh 原配置）' }
  } catch (e) {
    return {
      ok: false,
      detail: `CLI 执行失败: ${String(e)}。可在 magpie Agents 页对 dsh 手动 Disconnect`,
    }
  }
}

export const MAGPIE_WEB_FALLBACK = 'http://127.0.0.1:3430'

/** magpie 可执行文件解析：显式路径 → 打包资源 → 工作区/源码仓库 → PATH */
export function resolveMagpieBin(): string {
  if (process.env.INNATE_MAGPIE_BIN) return process.env.INNATE_MAGPIE_BIN
  const workspaceRoot = process.env.INNATE_WORKSPACE_ROOT
  const candidates = [
    path.join(process.resourcesPath ?? '', 'magpie.exe'),
    ...(workspaceRoot ? [path.join(workspaceRoot, 'innate-dogic', 'bin', 'magpie.exe')] : []),
    path.resolve(app.getAppPath(), '../../bin/magpie.exe'),
  ]
  for (const p of candidates) if (existsSync(p)) return p
  return 'magpie'
}

/** 每安装一次的稳定 web key（magpie web 的 ?k= 认证，见 M1 T1.0 侦察结论） */
function consoleKey(): string {
  if (process.env.MAGPIE_WEB_KEY) return process.env.MAGPIE_WEB_KEY
  const file = path.join(app.getPath('userData'), 'console-key.json')
  try {
    const saved = JSON.parse(readFileSync(file, 'utf-8')) as { key?: string }
    if (saved.key && saved.key.length >= 16) return saved.key
  } catch {
    /* 首次或损坏：重新生成 */
  }
  const key = `innate-${randomBytes(12).toString('hex')}`
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify({ key }))
  return key
}

export interface ConsoleReady {
  ok: boolean
  url?: string
  detail: string
}

let consoleChild: ChildProcess | undefined
let consoleUrl: string | undefined
let consoleStarting: Promise<ConsoleReady> | undefined

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number }
      server.close(() => resolve(port))
    })
  })
}

/** 使用独立端口与受管 key，绝不猜测已有 magpie desktop/web 实例的认证信息。 */
export async function ensureMagpieConsole(): Promise<ConsoleReady> {
  if (consoleChild && consoleUrl) return { ok: true, url: consoleUrl, detail: '控制台运行中' }
  if (consoleStarting) return consoleStarting

  consoleStarting = (async () => {
    const port = await freePort()
    return await new Promise<ConsoleReady>((resolve) => {
      const child = spawn(resolveMagpieBin(), ['web', '--no-open', '--addr', `127.0.0.1:${port}`], {
        env: { ...process.env, MAGPIE_WEB_KEY: consoleKey() },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        shell: process.platform === 'win32',
      })
      consoleChild = child
      let settled = false
      const finish = (result: ConsoleReady): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(result)
      }
      const timer = setTimeout(() => {
        child.kill()
        consoleChild = undefined
        consoleUrl = undefined
        finish({ ok: false, detail: '控制台启动超时（15s）。请检查 magpie 是否可用后重试。' })
      }, 15_000)

      const onData = (data: unknown): void => {
        const match = String(data).match(/magpie web on (http:\/\/\S+)/)
        if (!match) return
        const url = new URL(match[1])
        if (!url.searchParams.get('k')) {
          finish({ ok: false, detail: 'magpie 未返回控制台认证链接，请升级 magpie 后重试。' })
          return
        }
        consoleUrl = url.toString()
        finish({ ok: true, url: consoleUrl, detail: '受管控制台已启动' })
      }
      child.stdout?.on('data', onData)
      child.stderr?.on('data', onData)
      child.on('error', (error) => {
        consoleChild = undefined
        finish({ ok: false, detail: `控制台启动失败: ${error.message}（magpie CLI 不在 PATH？）` })
      })
      child.on('exit', (code) => {
        consoleChild = undefined
        consoleUrl = undefined
        finish({ ok: false, detail: `控制台进程已退出 (code ${code})，请重新连接。` })
      })
    })
  })().finally(() => {
    consoleStarting = undefined
  })
  return consoleStarting
}

/** 应用退出时回收托管的控制台进程 */
export function stopMagpieConsole(): void {
  consoleChild?.kill()
  consoleChild = undefined
  consoleUrl = undefined
}
