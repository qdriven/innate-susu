/**
 * Innate Workspace 宿主（shell）。
 *
 * 启动内核容器 + model-gateway 插件，暴露 HTTP API 与极简 workbench UI。
 * 这是 Sprint 01 垂直切片的"桌面外壳"（M0 骨架 + M1 magpie 集成的可运行形态）。
 */
import * as http from 'node:http'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { fileURLToPath } from 'node:url'
import { Container, LifecycleManager, Registry, WorkbenchHost, SettingsHost } from '@dogic/kernel'
import type { PluginContext } from '@dogic/kernel'
import { apply as applyModelGateway } from '@dogic/plugin-model-gateway'
import type { ModelGateway, ModelRef } from '@dogic/sdk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 宿主启动选项 */
export interface ShellOptions {
  /** magpie 二进制路径（跳过探测） */
  binaryPath?: string
  /** 强制直连模式 */
  forceDirect?: boolean
  /** 状态存储目录 */
  stateDir?: string
  /** HTTP 监听端口 */
  port?: number
}

export interface ShellInstance {
  container: Container
  lifecycle: LifecycleManager
  registry: Registry
  workbench: WorkbenchHost
  settings: SettingsHost
  gateway: ModelGateway
  server: http.Server
  close(): Promise<void>
}

/** 启动宿主。 */
export async function startShell(options: ShellOptions = {}): Promise<ShellInstance> {
  const stateDir = options.stateDir ?? path.join(os.homedir(), '.innate-dogic')
  const port = options.port ?? 8787

  // —— 内核 ——
  const container = new Container()
  const lifecycle = new LifecycleManager(container)
  const registry = new Registry(stateDir)
  const workbench = new WorkbenchHost()
  const settings = new SettingsHost()

  // —— 激活 model-gateway 插件 ——
  const pluginCtx: PluginContext = {
    service: container,
    effect: (dispose) => {
      container.onDispose(dispose)
    },
    on: () => {},
    emit: () => {},
    meta: { id: 'model-gateway', name: 'Model Gateway', version: '0.1.0' },
  }

  await applyModelGateway(pluginCtx, {
    binaryPath: options.binaryPath,
    forceDirect: options.forceDirect,
  })

  const gateway = container.resolve<ModelGateway>('model-gateway')

  // —— HTTP API + UI ——
  const server = http.createServer((req, res) => {
    void handleRequest(req, res, gateway)
  })

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))

  return {
    container,
    lifecycle,
    registry,
    workbench,
    settings,
    gateway,
    server,
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()))
      await container.dispose()
    },
  }
}

async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  gateway: ModelGateway,
): Promise<void> {
  const url = req.url ?? '/'
  const method = req.method ?? 'GET'

  const sendJson = (code: number, body: unknown): void => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(body, null, 2))
  }

  const readBody = (): Promise<string> =>
    new Promise((resolve) => {
      let data = ''
      req.on('data', (chunk) => { data += chunk })
      req.on('end', () => resolve(data))
    })

  try {
    // —— API ——
    if (url === '/api/status') {
      sendJson(200, gateway.status())
      return
    }
    if (url === '/api/providers') {
      sendJson(200, await gateway.listProviders())
      return
    }
    if (url === '/api/agents') {
      sendJson(200, await gateway.listAgents())
      return
    }
    if (url === '/api/quota') {
      sendJson(200, await gateway.quota())
      return
    }
    if (url === '/api/ensure-running') {
      await gateway.ensureRunning()
      sendJson(200, gateway.status())
      return
    }
    if (url === '/api/wire' && method === 'POST') {
      const body = JSON.parse(await readBody()) as { agent: string; provider: string; model: string }
      const model: ModelRef = { provider: body.provider, model: body.model }
      await gateway.wireAgent(body.agent, model)
      sendJson(200, { ok: true })
      return
    }
    if (url === '/api/unwire' && method === 'POST') {
      const body = JSON.parse(await readBody()) as { agent: string }
      await gateway.unwireAgent(body.agent)
      sendJson(200, { ok: true })
      return
    }

    // —— 静态 UI ——
    const indexPath = path.join(__dirname, '..', 'public', 'index.html')
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(fs.readFileSync(indexPath, 'utf-8'))
      return
    }

    sendJson(404, { error: 'not found' })
  } catch (err) {
    sendJson(500, { error: err instanceof Error ? err.message : String(err) })
  }
}

/** CLI 入口：`node dist/index.js [--direct] [--binary <path>] [--port <n>]` */
export async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const options: ShellOptions = {
    forceDirect: args.includes('--direct'),
    port: 8787,
  }
  const binaryIdx = args.indexOf('--binary')
  if (binaryIdx >= 0 && args[binaryIdx + 1]) {
    options.binaryPath = args[binaryIdx + 1]
  }
  const portIdx = args.indexOf('--port')
  if (portIdx >= 0 && args[portIdx + 1]) {
    options.port = parseInt(args[portIdx + 1], 10)
  }

  const shell = await startShell(options)
  const status = shell.gateway.status()
  const mode = shell.gateway.gatewayUrl() === 'direct' ? 'direct' : 'magpie'

  // eslint-disable-next-line no-console
  console.log(`Innate Workspace shell running:
  mode:    ${mode}
  gateway: ${status.state}${'url' in status ? ` @ ${status.url}` : ''}
  ui/api:  http://127.0.0.1:${options.port}
`)
}

// 直接运行时启动
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  void main()
}
