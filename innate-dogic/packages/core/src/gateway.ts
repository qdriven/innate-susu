import { readFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import type { GatewayInfo, ModelInfo, SmokeResult, WebUiInfo } from './types'

export const DEFAULT_GATEWAY_PORT = 3425
export const DEFAULT_WEB_PORT = 3430
/** 冒烟/自用调用约定 key，便于在 magpie Usage 页归账 */
export const APP_KEY = 'magpie-dsh-innateos'

export function magpieSettingsPath(): string {
  return path.join(os.homedir(), '.config', 'magpie', 'settings.json')
}

async function fetchJson(url: string, timeoutMs = 4000): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** 端口发现：显式 MAGPIE_PORT -> 默认 3425 探活 -> settings.json 的 port */
export async function discoverGatewayPort(explicit?: number): Promise<number | undefined> {
  if (explicit && explicit > 0) return explicit
  const fromEnv = Number(process.env.MAGPIE_PORT)
  if (Number.isInteger(fromEnv) && fromEnv > 0) return fromEnv
  if (await probeHello(DEFAULT_GATEWAY_PORT)) return DEFAULT_GATEWAY_PORT
  try {
    const raw = await readFile(magpieSettingsPath(), 'utf8')
    const port = JSON.parse(raw)?.port
    if (Number.isInteger(port) && port > 0) return port
  } catch {
    /* 无配置文件 */
  }
  return undefined
}

async function probeHello(port: number): Promise<string | undefined> {
  try {
    const data = (await fetchJson(`http://127.0.0.1:${port}/api/hello`, 2500)) as {
      name?: string
      version?: string
    }
    if (data?.name === 'magpie') return data.version
    return undefined
  } catch {
    return undefined
  }
}

/** 网关状态汇总 */
export async function readGateway(): Promise<GatewayInfo> {
  const port = await discoverGatewayPort()
  if (port === undefined) {
    return { running: false, error: '未发现运行中的 magpie 网关（默认 3425，可设 MAGPIE_PORT）' }
  }
  const version = await probeHello(port)
  if (version === undefined) {
    return { running: false, port, error: `端口 ${port} 应答异常` }
  }
  let modelsCount: number | undefined
  try {
    const models = await fetchModels(port)
    modelsCount = models.length
  } catch {
    /* 目录不可读不阻塞状态 */
  }
  return { running: true, port, version, baseUrl: `http://127.0.0.1:${port}`, modelsCount }
}

/** /v1/models 模型目录 */
export async function fetchModels(port: number): Promise<ModelInfo[]> {
  const data = (await fetchJson(`http://127.0.0.1:${port}/v1/models`, 5000)) as {
    data?: Array<Record<string, unknown>>
  }
  const list = Array.isArray(data?.data) ? data.data : []
  return list.map((m) => {
    const levels = m.supported_reasoning_levels as Array<{ effort?: string }> | undefined
    return {
      id: String(m.id ?? ''),
      displayName: (m.display_name as string) ?? (m.magpie_label as string) ?? undefined,
      ownedBy: (m.owned_by as string) ?? undefined,
      contextWindow: (m.context_window as number) ?? undefined,
      maxOutputTokens: (m.max_output_tokens as number) ?? undefined,
      reasoning: Boolean(m.reasoning),
      reasoningLevels: levels?.map((l) => l.effort).filter((e): e is string => Boolean(e)),
      nativeEndpoints: (m.native_endpoints as string[]) ?? undefined,
      inputModalities: ((m.modalities as { input?: string[] })?.input) ?? undefined,
    }
  }).filter((m) => m.id.length > 0)
}

/** magpie web 管理界面（默认 3430，"beside the gateway"） */
export async function readWebUi(): Promise<WebUiInfo> {
  const port = Number(process.env.MAGPIE_WEB_PORT) || DEFAULT_WEB_PORT
  const url = `http://127.0.0.1:${port}`
  try {
    const res = await fetch(`${url}/api/agents/`, { signal: AbortSignal.timeout(2000) })
    if (res.status < 500) return { running: true, url }
  } catch {
    /* not running */
  }
  return { running: false }
}

/** 冒烟测试：经网关发起一次最小补全（默认取目录第一个模型） */
export async function smokeTest(modelId?: string, port?: number): Promise<SmokeResult> {
  const gwPort = port ?? (await discoverGatewayPort())
  if (gwPort === undefined) return { ok: false, detail: '网关未运行' }
  let model = modelId ?? process.env.INNATE_SMOKE_MODEL
  if (!model) {
    try {
      const models = await fetchModels(gwPort)
      model = models[0]?.id
    } catch {
      return { ok: false, detail: '模型目录不可读' }
    }
  }
  if (!model) return { ok: false, detail: '目录为空（magpie 中未配置 Provider）' }
  try {
    const res = await fetch(`http://127.0.0.1:${gwPort}/v1/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(60_000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${APP_KEY}` },
      body: JSON.stringify({
        model,
        max_tokens: 16,
        messages: [{ role: 'user', content: 'Say OK' }],
      }),
    })
    const text = await res.text()
    if (!res.ok) return { ok: false, model, detail: `HTTP ${res.status}: ${text.slice(0, 200)}` }
    if (!text.includes('"content"')) return { ok: false, model, detail: `响应异常: ${text.slice(0, 200)}` }
    return { ok: true, model, detail: `补全成功，用量归账 ${APP_KEY}` }
  } catch (e) {
    return { ok: false, model, detail: `请求失败: ${String(e)}` }
  }
}
