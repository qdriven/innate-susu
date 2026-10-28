/**
 * 降级验收测试（T-051）。
 *
 * 验证：magpie 缺失/强制直连时，插件 apply() 优雅降级为 DirectModelGateway，
 * 全流程（ensureRunning / listProviders / wireAgent / unwireAgent）不崩。
 */
import { describe, it, expect } from 'vitest'
import { Container } from '@dogic/kernel'
import type { PluginContext } from '@dogic/kernel'
import { apply } from './index.js'
import { DirectModelGateway } from './direct.js'
import type { ModelGateway } from '@dogic/sdk'

/** 构造一个最小可用的 PluginContext（模拟内核注入） */
function makeContext(): {
  ctx: PluginContext
  container: Container
  events: string[]
} {
  const container = new Container()
  const events: string[] = []
  const ctx: PluginContext = {
    service: container,
    effect: () => {},
    on: () => {},
    emit: (event: string) => {
      events.push(event)
    },
    meta: { id: 'model-gateway', name: 'Model Gateway', version: '0.1.0' },
  }
  return { ctx, container, events }
}

describe('降级模式（T-051）', () => {
  it('forceDirect=true 时发布 DirectModelGateway', async () => {
    const { ctx, container } = makeContext()
    await apply(ctx, { forceDirect: true })

    const gateway = container.resolve<ModelGateway>('model-gateway')
    expect(gateway).toBeInstanceOf(DirectModelGateway)
    // 直连模式无需启动进程，状态即 running
    expect(gateway.status().state).toBe('running')
  })

  it('直连模式全流程不崩（ensureRunning → listProviders → wire → unwire）', async () => {
    const { ctx, container } = makeContext()
    await apply(ctx, { forceDirect: true })

    const gateway = container.resolve<ModelGateway>('model-gateway')

    // 1. ensureRunning 幂等且不抛
    await expect(gateway.ensureRunning()).resolves.toBeUndefined()
    expect(gateway.status().state).toBe('running')

    // 2. 未配置 provider 时列表为空
    await expect(gateway.listProviders()).resolves.toEqual([])

    // 3. wireAgent 对未知 provider 抛错（而非崩溃）
    await expect(
      gateway.wireAgent('claude', { provider: 'unknown', model: 'm' }),
    ).rejects.toThrow()

    // 4. unwireAgent 幂等
    await expect(gateway.unwireAgent('claude')).resolves.toBeUndefined()
  })

  it('降级后 gatewayUrl 返回 "direct"（不依赖 magpie 网关）', async () => {
    const { ctx, container } = makeContext()
    await apply(ctx, { forceDirect: true })
    const gateway = container.resolve<ModelGateway>('model-gateway')
    expect(gateway.gatewayUrl()).toBe('direct')
  })

  it('降级模式提供配置 provider 后 wireAgent 落库', async () => {
    const gateway = new DirectModelGateway([
      {
        id: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'sk-test',
        models: ['deepseek-chat'],
      },
    ])
    await gateway.wireAgent('codex', { provider: 'deepseek', model: 'deepseek-chat' })
    const agents = await gateway.listAgents()
    const codex = agents.find((a) => a.agentId === 'codex')
    expect(codex?.wired).toBe(true)
    expect(codex?.mode).toBe('direct')
  })
})
