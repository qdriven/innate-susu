import { execFile } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { promisify } from 'node:util'
import { commandExists } from './env'
import type { DshState } from './types'

const execFileAsync = promisify(execFile)

export function dshHome(): string {
  return process.env.DSH_HOME ?? path.join(os.homedir(), '.dsh')
}

/** patch 文件中是否含 magpie 写入的 llm-pi-ai 路由 */
async function fileIsWired(file: string): Promise<boolean> {
  try {
    const raw = await readFile(file, 'utf8')
    return raw.includes('llm-pi-ai') && /magpie/i.test(raw)
  } catch {
    return false
  }
}

/** 当前 magpie 将默认模型写在 profile patch，而旧版使用根级 settings.yaml。 */
export function parseDshDefaultModel(raw: string): string | undefined {
  const block = /(?:^|\n)-\s+id:\s*agent-default-model\b[^\n]*\n((?:[ \t]+[^\n]*(?:\n|$))*)/.exec(raw)
  const model = /^[ \t]+model:\s*(.+?)\s*$/m.exec(block?.[1] ?? '')
  return model?.[1]?.trim().replace(/^['"]|['"]$/g, '') || undefined
}

/** dsh 侧集成状态（安装/接线/默认模型） */
export async function readDshState(): Promise<DshState> {
  const home = dshHome()
  const state: DshState = {
    installed: false,
    dshHome: home,
    wiredFiles: [],
    hasGatewayKey: false,
    profiles: [],
  }
  const cmdPath = await commandExists('dsh')
  state.installed = cmdPath !== undefined

  // home 层 + 各 profile 层 patch
  const candidates = [path.join(home, 'cordis.patch.yml')]
  try {
    const profilesDir = path.join(home, 'profiles')
    for (const name of await readdir(profilesDir, { withFileTypes: true })) {
      if (!name.isDirectory()) continue
      state.profiles.push(name.name)
      candidates.push(path.join(profilesDir, name.name, 'cordis.patch.yml'))
    }
  } catch {
    /* 无 profiles 目录 */
  }
  for (const file of candidates) {
    if (!(await fileIsWired(file))) continue
    state.wiredFiles.push(file)
    try {
      const model = parseDshDefaultModel(await readFile(file, 'utf8'))
      if (model) state.defaultModel = `magpie/${model}`
    } catch {
      /* patch 在探测期间被移除时保留其余状态 */
    }
  }

  // MAGPIE_GATEWAY_KEY
  try {
    const env = await readFile(path.join(home, '.env'), 'utf8')
    state.hasGatewayKey = /^MAGPIE_GATEWAY_KEY=/m.test(env)
  } catch {
    /* 无 .env */
  }

  // 旧版 magpie 使用根级 settings.yaml；仅在 patch 未提供模型时回退。
  if (!state.defaultModel) {
    try {
      const raw = await readFile(path.join(home, 'settings.yaml'), 'utf8')
      const m = /^agent-default-model:\s*(.+)$/m.exec(raw)
      if (m?.[1]) state.defaultModel = m[1].trim().replace(/^['"]|['"]$/g, '')
    } catch {
      /* 无 settings.yaml */
    }
  }
  return state
}

/** npm 全局 node_modules 根（用于把 dsh.cmd shim 解析回包入口） */
async function npmGlobalRoot(): Promise<string | undefined> {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  try {
    const { stdout } = await execFileAsync(npm, ['root', '-g'], { timeout: 15_000 })
    return stdout.trim().split(/\r?\n/)[0]
  } catch {
    return undefined
  }
}

export interface DshEntry {
  /** dsh 包入口 JS（可用 ELECTRON_RUN_AS_NODE 直接执行）；undefined 表示只能走 shell 兜底 */
  entry?: string
  /** 解析方式说明 */
  via: string
}

/** Windows 的 npm 扩展名无关 shim 是 shell 脚本，不能交给 Electron 当 Node 入口执行。 */
export function isDirectDshEntry(cmdPath: string, platform = process.platform): boolean {
  if (/\.(cmd|ps1|bat)$/i.test(cmdPath)) return false
  return platform !== 'win32' || /\.(js|mjs|cjs)$/i.test(cmdPath)
}

/** 标准 npm Windows 布局中，命令 shim 与 node_modules 同级，可直接推导而无需 spawn npm.cmd。 */
export function globalNodeModulesFromCommand(cmdPath: string, platform = process.platform): string | undefined {
  return platform === 'win32' ? path.join(path.dirname(cmdPath), 'node_modules') : undefined
}

/**
 * 解析 dsh 安装：
 * 1) PATH 上的 dsh 若是包入口 JS 本身（unix bin 链接场景）直接用；
 * 2) npm 全局 node_modules/@deepseek-ai/dsh 的 package.json bin 字段；
 * 3) 失败则由调用方以 shell 方式运行 dsh。
 */
export async function resolveDshEntry(): Promise<DshEntry> {
  const cmdPath = await commandExists('dsh')
  if (cmdPath && isDirectDshEntry(cmdPath)) {
    return { entry: cmdPath, via: `PATH: ${cmdPath}` }
  }
  const roots = [
    cmdPath ? globalNodeModulesFromCommand(cmdPath) : undefined,
    await npmGlobalRoot(),
  ].filter((root): root is string => root !== undefined)
  for (const root of new Set(roots)) {
    const pkgDir = path.join(root, '@deepseek-ai', 'dsh')
    try {
      const pkg = JSON.parse(await readFile(path.join(pkgDir, 'package.json'), 'utf8')) as {
        bin?: string | Record<string, string>
      }
      const rel = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.dsh
      if (rel) return { entry: path.join(pkgDir, rel), via: `npm global: ${pkgDir}` }
    } catch {
      /* 包不存在或无 bin，继续尝试下一个全局根 */
    }
  }
  return { via: cmdPath ? `仅 shell shim: ${cmdPath}` : '未安装' }
}
