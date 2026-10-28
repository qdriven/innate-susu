/**
 * ModelGateway 契约测试套件。
 *
 * 同一套测试同时跑 mock 与真实适配器（后者 CI 可选）。
 * DoD#6：用 mock 替换 magpie 适配器，全部插件单测通过。
 */
import { describe, it, expect } from 'vitest'
import type { ModelGateway, ModelRef } from './model-gateway.js'

/**
 * 运行 ModelGateway 契约测试。
 * @param factory 工厂函数，返回被测实现实例
 */
export function runModelGatewayContractTests(factory: () => ModelGateway): void {
  describe('ModelGateway contract', () => {
    it('status() returns a valid GatewayStatus object', () => {
      const gw = factory()
      const status = gw.status()
      expect(status).toBeDefined()
      expect(typeof status.state).toBe('string')
      const validStates = [
        'not-installed',
        'not-running',
        'starting',
        'running',
        'error',
      ]
      expect(validStates).toContain(status.state)
    })

    it('ensureRunning() resolves and transitions to running', async () => {
      const gw = factory()
      await gw.ensureRunning()
      const status = gw.status()
      expect(status.state).toBe('running')
      if (status.state === 'running') {
        expect(status.url).toBeTruthy()
      }
    })

    it('ensureRunning() is idempotent', async () => {
      const gw = factory()
      await gw.ensureRunning()
      const before = gw.status()
      await gw.ensureRunning()
      const after = gw.status()
      expect(after.state).toBe(before.state)
    })

    it('listProviders() returns an array', async () => {
      const gw = factory()
      const providers = await gw.listProviders()
      expect(Array.isArray(providers)).toBe(true)
    })

    it('listAgents() returns an array', async () => {
      const gw = factory()
      const agents = await gw.listAgents()
      expect(Array.isArray(agents)).toBe(true)
    })

    it('wireAgent() is idempotent for the same model', async () => {
      const gw = factory()
      const model: ModelRef = { provider: 'test', model: 'test-model' }
      await gw.wireAgent('claude', model)
      await gw.wireAgent('claude', model) // 重复调用
      const agents = await gw.listAgents()
      const wired = agents.filter((a) => a.agentId === 'claude')
      expect(wired.length).toBe(1)
      expect(wired[0].wired).toBe(true)
    })

    it('unwireAgent() sets wired to false', async () => {
      const gw = factory()
      const model: ModelRef = { provider: 'test', model: 'test-model' }
      await gw.wireAgent('codex', model)
      await gw.unwireAgent('codex')
      const agents = await gw.listAgents()
      const agent = agents.find((a) => a.agentId === 'codex')
      expect(agent?.wired).toBe(false)
    })

    it('gatewayUrl() returns a non-empty string when running', async () => {
      const gw = factory()
      await gw.ensureRunning()
      const url = gw.gatewayUrl()
      expect(typeof url).toBe('string')
      expect(url.length).toBeGreaterThan(0)
    })

    it('quota() returns an array', async () => {
      const gw = factory()
      const quota = await gw.quota()
      expect(Array.isArray(quota)).toBe(true)
    })
  })
}
