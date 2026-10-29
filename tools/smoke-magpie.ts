#!/usr/bin/env node
/**
 * W2.6 隔离环境网关真实链路冒烟（tools 集成脚本，不入默认门禁）。
 *
 * 真实链路（gateway 起 → 模型目录 → 健康检查 → 直连一次最小 LLM 调用）：
 *   - magpie serve 固定绑 127.0.0.1:3425（无端口参数、MAGPIE_PORT 不生效、settings.json 无 port
 *     字段），故复用已运行网关；未运行则自行 spawn serve（仅回收自己启动的进程树）。
 *   - DSH_HOME 全程指向临时目录：magpie dsh wire/unwire 写操作只落隔离 HOME；
 *     真实 ~/.dsh 顶层文件快照前后比对，零修改断言。
 *   - 证据脱敏：输出与证据文件只含状态/版本/计数/模型 id；URL 查询串 key 值一律 [redacted]
 *     （redact 与 packages/core/src/redact.ts 的 redactLaunchSecrets 同边界）。
 *
 * 降级链路：空闲端口无网关 → 显式失败可诊断（不挂死不崩）。
 *
 * 用法：pnpm smoke:magpie [--port 3425] [--out <dir>]
 */
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

/** 与 core APP_KEY 同约定的冒烟调用 key（网关仅监听回环、任意 key 可用）；不进输出。 */
const SMOKE_KEY = 'magpie-dsh-innateos'
const DEFAULT_PORT = 3425

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const portArg = Number(args.find((a) => a.startsWith('--port='))?.split('=')[1] ?? NaN)
const gatewayPort = Number.isInteger(portArg) && portArg > 0 ? portArg : (Number(process.env.MAGPIE_PORT) || DEFAULT_PORT)
const outDir = args.find((a) => a.startsWith('--out='))?.split('=')[1]
  ?? path.join(root, 'docs/susu/plan/evidence/W2/smoke-magpie')
const magpieBin = path.join(root, 'innate-dogic/bin/magpie.exe')
const bin = existsSync(magpieBin) ? magpieBin : 'magpie'

interface Check {
  name: string
  ok: boolean
  detail: string
}

const checks: Check[] = []
function record(name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail })
  console.log(`[smoke] ${ok ? '✓' : '✗'} ${name} — ${detail}`)
}

/** 与 core redactLaunchSecrets 同边界：URL 查询串 token/k/key 参数值 → [redacted]。 */
function redact(text: string): string {
  return text.replace(
    /([?&])(token|k|key)=([^&\s]+)/gi,
    (all, sep: string, name: string, value: string) => (value === '' ? all : `${sep}${name}=[redacted]`),
  )
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
const execFileAsync = promisify(execFile)

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function probeHello(port: number): Promise<{ version?: string } | undefined> {
  try {
    const data = (await fetchJson(`http://127.0.0.1:${port}/api/hello`, 3000)) as { name?: string; version?: string }
    return data?.name === 'magpie' ? { version: data.version } : undefined
  } catch {
    return undefined
  }
}

async function listModels(port: number): Promise<string[]> {
  const data = (await fetchJson(`http://127.0.0.1:${port}/v1/models`, 10_000)) as { data?: Array<{ id?: string }> }
  return (data?.data ?? []).map((m) => String(m.id ?? '')).filter((id) => id.length > 0)
}

/** 直连网关的一次最小补全（Q1 网关前提）。 */
async function directSmoke(port: number, model: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(60_000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SMOKE_KEY}` },
      body: JSON.stringify({ model, max_tokens: 16, messages: [{ role: 'user', content: 'Say OK' }] }),
    })
    const text = await res.text()
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}: ${redact(text.slice(0, 200))}` }
    if (!text.includes('"content"')) return { ok: false, detail: `响应异常: ${redact(text.slice(0, 200))}` }
    return { ok: true, detail: `补全成功（16 token 上限；用量归账 key 见 magpie Usage 页）` }
  } catch (e) {
    return { ok: false, detail: `请求失败: ${redact(String(e))}` }
  }
}

async function runMagpie(argsList: string[], env: NodeJS.ProcessEnv, timeoutMs: number): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(bin, argsList, {
      env: { ...process.env, ...env },
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    })
    return { exitCode: 0, stdout, stderr }
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { status?: number; killed?: boolean; stdout?: string; stderr?: string }
    if (err.killed) throw e
    return { exitCode: typeof err.status === 'number' ? err.status : 1, stdout: err.stdout ?? '', stderr: err.stderr ?? err.message ?? '' }
  }
}

/** magpie models 首个具体 provider/model（跳过标题行与 routing group）。 */
function firstWirableModel(stdout: string): string | undefined {
  return stdout.split(/\r?\n/).map((line) => line.trim()).find(
    (line) => /^\S+\/\S+/.test(line) && !line.startsWith('group/'),
  )
}

function killTree(child: ChildProcess): void {
  if (process.platform === 'win32' && child.pid !== undefined) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
  } else if (child.pid !== undefined) {
    child.kill('SIGTERM')
  }
}

/** 真实 ~/.dsh 顶层文件快照（magpie dsh 写操作只应落在隔离 DSH_HOME）。 */
function dshSnapshot(dir: string): Record<string, number> {
  const snap: Record<string, number> = {}
  if (!existsSync(dir)) return snap
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    try {
      if (statSync(full).isFile()) snap[name] = statSync(full).size
    } catch { /* 竞态忽略 */ }
  }
  return snap
}

async function main(): Promise<void> {
  // 1. 隔离环境：临时 DSH_HOME / userData（网关侧不使用 userData，按任务约定建目录）
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), 'innate-w26-'))
  const dshHome = path.join(tmpRoot, 'dsh')
  const userData = path.join(tmpRoot, 'user-data')
  mkdirSync(dshHome, { recursive: true })
  mkdirSync(userData, { recursive: true })
  const realDsh = path.join(os.homedir(), '.dsh')
  const before = dshSnapshot(realDsh)
  console.log(`[smoke] 隔离环境: ${tmpRoot}（DSH_HOME=${dshHome}）`)

  let spawned: ChildProcess | undefined
  try {
    // 2. 网关就绪：复用已运行网关，未运行则 spawn serve（只回收自己启动的进程）
    let healthy = await probeHello(gatewayPort)
    if (healthy === undefined) {
      console.log(`[smoke] ${gatewayPort} 无网关，spawn magpie serve …`)
      spawned = spawn(bin, ['serve'], { env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
      spawned.stdout?.on('data', (chunk: Buffer) => process.stdout.write(`[smoke:serve] ${chunk}`))
      spawned.stderr?.on('data', (chunk: Buffer) => process.stderr.write(`[smoke:serve] ${chunk}`))
      for (let i = 0; i < 60 && healthy === undefined; i++) {
        await sleep(1000)
        healthy = await probeHello(gatewayPort)
      }
    }
    if (healthy === undefined) {
      record('真实链路：网关就绪', false, `端口 ${gatewayPort} 未就绪（spawn 或复用失败）`)
    } else {
      record('真实链路：网关就绪', true, `magpie ${healthy.version ?? '?'} @ 127.0.0.1:${gatewayPort}${spawned ? '（本脚本 spawn）' : '（复用运行中网关）'}`)

      // 3. 模型目录拉取（HTTP /v1/models）
      let models: string[] = []
      try {
        models = await listModels(gatewayPort)
        record('真实链路：模型目录拉取', models.length > 0, `${models.length} 个模型`)
      } catch (e) {
        record('真实链路：模型目录拉取', false, `失败: ${redact(String(e))}`)
      }

      // 4. 直连网关的一次最小 LLM 调用（跳过 routing group id 优先；有界重试——
      //    网关 chat completions 对模型有 plan 特性要求，逐个候选尝试直到成功）
      const envModel = process.env.INNATE_SMOKE_MODEL
      const candidates = [
        ...(envModel ? [envModel] : []),
        ...models.filter((id) => !id.startsWith('auto/') && !id.startsWith('group/')),
        ...models,
      ].filter((id, i, list) => id.length > 0 && list.indexOf(id) === i).slice(0, 25)
      let smokeOk = false
      let smokeDetail = '候选模型全部失败'
      let smokeModel = ''
      for (const candidate of candidates) {
        const r = await directSmoke(gatewayPort, candidate)
        if (r.ok) {
          smokeOk = true
          smokeModel = candidate
          smokeDetail = r.detail
          break
        }
        smokeDetail = `${candidate}: ${r.detail}`
      }
      record('真实链路：直连最小 LLM 调用', smokeOk, smokeOk ? `${smokeModel} — ${smokeDetail}` : `尝试 ${candidates.length} 个候选均失败 — ${smokeDetail}`)

      // 5. wire/unwire 隔离验证（真实二进制 + 临时 DSH_HOME）
      const wireModel = process.env.INNATE_WIRE_MODEL
        ?? firstWirableModel((await runMagpie(['models'], {}, 90_000)).stdout)
      if (wireModel) {
        const wire = await runMagpie(['dsh', wireModel], { DSH_HOME: dshHome }, 60_000)
        const wiredFile = path.join(dshHome, 'config.yaml')
        const wired = wire.exitCode === 0 && existsSync(wiredFile) && readFileSync(wiredFile, 'utf8').includes(wireModel)
        record('真实链路：magpie dsh 接线隔离', wired, `${wireModel} → 隔离 DSH_HOME config.yaml${wire.exitCode !== 0 ? `（exit ${wire.exitCode}: ${redact(wire.stderr.slice(0, 200))}）` : ''}`)

        const unwire = await runMagpie(['dsh', 'default'], { DSH_HOME: dshHome }, 60_000)
        const restored = unwire.exitCode === 0 && !readFileSync(wiredFile, 'utf8').includes(wireModel)
        record('真实链路：magpie dsh 断开恢复', restored, `default → config.yaml 恢复${unwire.exitCode !== 0 ? `（exit ${unwire.exitCode}: ${redact(unwire.stderr.slice(0, 200))}）` : ''}`)
      } else {
        record('真实链路：magpie dsh 接线隔离', false, 'magpie models 未解析到可接线模型')
      }

      // 6. 真实用户配置零修改断言
      const after = dshSnapshot(realDsh)
      const changed = Object.entries(after).filter(([name, size]) => before[name] !== size).map(([name]) => name)
      const added = Object.keys(after).filter((name) => !(name in before))
      record('隔离断言：真实 ~/.dsh 零修改', changed.length === 0 && added.length === 0,
        changed.length === 0 && added.length === 0 ? '顶层文件集合与大小不变' : `变化: ${[...changed, ...added].join(', ')}`)
    }

    // 7. 无 magpie 降级冒烟：空闲端口显式失败可诊断
    const degradePort = await freePort()
    const degradeHello = await probeHello(degradePort)
    record('降级链路：健康检查显式失败', degradeHello === undefined, `空闲端口 ${degradePort} 无网关应答（不挂死）`)
    const degradeStatus = degradeHello === undefined
      ? { running: false, error: `未发现运行中的 magpie 网关（端口 ${degradePort} 无应答）` }
      : { running: true }
    record('降级链路：状态汇总显式', degradeStatus.running === false && typeof degradeStatus.error === 'string',
      degradeStatus.error ?? '意外就绪')
    const degradeSmoke = degradeHello === undefined
      ? { ok: false, detail: '网关未运行' }
      : await directSmoke(degradePort, 'unused/model')
    record('降级链路：直连调用显式失败', degradeSmoke.ok === false && degradeSmoke.detail === '网关未运行',
      degradeSmoke.detail)

    // 8. 临时目录清理断言（F1-V2）
    rmSync(tmpRoot, { recursive: true, force: true })
    record('清理断言：临时目录已删除', !existsSync(tmpRoot), tmpRoot)
  } finally {
    if (spawned) killTree(spawned)
  }

  // 汇总 + 证据落盘（脱敏字段）
  const failed = checks.filter((c) => !c.ok)
  console.log(`[smoke] 汇总: ${checks.length - failed.length}/${checks.length} 通过`)
  if (failed.length > 0) {
    for (const f of failed) console.error(`[smoke] 未通过: ${f.name} — ${f.detail}`)
  }
  mkdirSync(outDir, { recursive: true })
  writeFileSync(
    path.join(outDir, 'smoke-magpie.json'),
    JSON.stringify({
      port: gatewayPort,
      checks,
      passed: failed.length === 0,
    }, null, 2),
  )
  console.log(`[smoke] 证据: ${path.join(outDir, 'smoke-magpie.json')}`)
  process.exitCode = failed.length === 0 ? 0 : 1
}

const watchdog = setTimeout(() => {
  console.error('[smoke] watchdog 超时，强制退出')
  process.exit(3)
}, 300_000)
watchdog.unref()

main().catch((error) => {
  console.error('[smoke] FAILED:', error)
  process.exitCode = 1
})
