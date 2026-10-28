import { readDshState } from './dsh'
import { commandExists } from './env'
import { discoverGatewayPort, fetchModels } from './gateway'
import type { CheckResult, StatusSnapshot } from './types'
import { readGateway, readWebUi } from './gateway'

/** 总览快照：网关 + web 界面 + dsh 状态 + CLI 可用性 */
export async function readStatus(): Promise<StatusSnapshot> {
  const [gateway, webUi, dsh, magpiePath] = await Promise.all([
    readGateway(),
    readWebUi(),
    readDshState(),
    commandExists('magpie'),
  ])
  return {
    gateway,
    webUi,
    dsh,
    magpieCli: { available: magpiePath !== undefined, path: magpiePath },
    timestamp: new Date().toISOString(),
  }
}

/** 集成向导检查（对应 scripts/04-verify.sh） */
export async function runChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  const port = await discoverGatewayPort()
  const gatewayOk = port !== undefined
  results.push({
    id: 'gateway',
    title: 'magpie 网关运行中',
    passed: gatewayOk,
    detail: gatewayOk ? `127.0.0.1:${port} 应答正常` : '未发现网关（默认 3425；可设 MAGPIE_PORT）',
    hint: gatewayOk ? undefined : '启动 magpie 桌面版，或运行 magpie serve',
  })

  let models = 0
  if (gatewayOk && port !== undefined) {
    try {
      models = (await fetchModels(port)).length
    } catch {
      models = 0
    }
  }
  results.push({
    id: 'models',
    title: '模型目录非空',
    passed: models > 0,
    detail: models > 0 ? `${models} 个可用模型` : '目录为空或不可读',
    hint: models > 0 ? undefined : '在 magpie Providers 页配置至少一个 key/订阅',
  })

  const dsh = await readDshState()
  results.push({
    id: 'dsh-installed',
    title: 'dsh 已安装',
    passed: dsh.installed,
    detail: dsh.installed ? `DSH_HOME: ${dsh.dshHome}` : 'PATH 上未找到 dsh',
    hint: dsh.installed ? undefined : 'npm install -g @deepseek-ai/dsh',
  })
  results.push({
    id: 'dsh-wired',
    title: 'dsh 已接线 magpie',
    passed: dsh.wiredFiles.length > 0,
    detail:
      dsh.wiredFiles.length > 0
        ? dsh.wiredFiles.join('; ')
        : `${dsh.dshHome} 下未发现含 magpie 的 llm-pi-ai patch`,
    hint:
      dsh.wiredFiles.length > 0
        ? undefined
        : '在 magpie Agents 页对 DeepSeek Harness (dsh) 点击连接/Apply',
  })
  results.push({
    id: 'gateway-key',
    title: 'MAGPIE_GATEWAY_KEY 已写入',
    passed: dsh.hasGatewayKey,
    detail: dsh.hasGatewayKey ? `${dsh.dshHome}/.env` : '未发现（重新 Apply 会写入）',
  })
  results.push({
    id: 'default-model',
    title: '默认模型已设置',
    passed: dsh.defaultModel !== undefined,
    detail: dsh.defaultModel ?? 'settings.yaml 无 agent-default-model',
    hint:
      dsh.defaultModel !== undefined
        ? undefined
        : '在 magpie 中为 dsh 选择模型，或在 dsh Models 页选择 magpie/<model>',
  })
  return results
}
