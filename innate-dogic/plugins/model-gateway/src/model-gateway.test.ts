/**
 * model-gateway 适配器测试。
 *
 * 使用真实 magpie binary 测试 CLI 封装层。
 */
import { describe, it, expect, vi } from 'vitest'
import * as path from 'node:path'
import { MagpieCli } from './magpie-cli.js'
import { compareVersions } from './detect.js'
import { DirectModelGateway } from './direct.js'

const MAGPIE_BINARY = path.resolve(__dirname, '../../../bin/magpie.exe')

describe('MagpieCli (real binary)', () => {
  const cli = new MagpieCli({ binaryPath: MAGPIE_BINARY, timeout: 30_000 })

  it('version() returns version string', async () => {
    const version = await cli.version()
    expect(version).toBeTruthy()
    expect(version.length).toBeGreaterThan(0)
  })

  it('healthcheck() returns true when gateway is running', async () => {
    const healthy = await cli.healthcheck()
    // 网关应该在运行中（之前已启动）
    expect(healthy).toBe(true)
  })

  it('providers() returns output', async () => {
    const result = await cli.providers()
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBeTruthy()
  })

  it('ls() returns agent list', async () => {
    const result = await cli.ls()
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Claude')
  })

  it('models() returns model list', async () => {
    const result = await cli.models()
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBeTruthy()
  })

  it('quota() returns quota info', async () => {
    const result = await cli.quota()
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBeTruthy()
  })

})

describe('MagpieCli mutating command contracts', () => {
  // 绝不对真实 ~/.dsh 执行 wire/default；真实 binary 仅运行只读命令。
  const cli = new MagpieCli({ binaryPath: MAGPIE_BINARY })

  it('wireAgent() maps to the agent model command without touching real config', async () => {
    const run = vi.spyOn(cli, 'run').mockResolvedValue({ stdout: '✓', stderr: '', exitCode: 0 })
    const result = await cli.wireAgent('dsh', 'zcode/GLM-5.3')
    expect(run).toHaveBeenCalledWith(['dsh', 'zcode/GLM-5.3'])
    expect(result.exitCode).toBe(0)
  })

  it('unwireAgent() maps to the agent default command without touching real config', async () => {
    const run = vi.spyOn(cli, 'run').mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    const result = await cli.unwireAgent('dsh')
    expect(run).toHaveBeenCalledWith(['dsh', 'default'])
    expect(result.exitCode).toBe(0)
  })
})

describe('compareVersions', () => {
  it('compares equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
  })

  it('detects newer version', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0)
  })

  it('detects older version', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0)
  })

  it('handles v prefix', () => {
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0)
  })
})

describe('DirectModelGateway', () => {
  it('starts in running state', async () => {
    const gw = new DirectModelGateway()
    expect(gw.status().state).toBe('running')
  })

  it('ensureRunning resolves immediately', async () => {
    const gw = new DirectModelGateway()
    await gw.ensureRunning()
    expect(gw.status().state).toBe('running')
  })

  it('wireAgent writes agent config', async () => {
    const gw = new DirectModelGateway([
      {
        id: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'sk-test',
        models: ['deepseek-chat'],
      },
    ])
    await gw.wireAgent('claude', { provider: 'deepseek', model: 'deepseek-chat' })
    const agents = await gw.listAgents()
    const claude = agents.find((a) => a.agentId === 'claude')
    expect(claude?.wired).toBe(true)
    expect(claude?.mode).toBe('direct')
  })

  it('unwireAgent sets wired to false', async () => {
    const gw = new DirectModelGateway([
      {
        id: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'sk-test',
        models: ['deepseek-chat'],
      },
    ])
    await gw.wireAgent('codex', { provider: 'deepseek', model: 'deepseek-chat' })
    await gw.unwireAgent('codex')
    const agents = await gw.listAgents()
    const codex = agents.find((a) => a.agentId === 'codex')
    expect(codex?.wired).toBe(false)
  })

  it('listProviders returns configured providers', async () => {
    const gw = new DirectModelGateway([
      {
        id: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'sk-test',
        models: ['deepseek-chat', 'deepseek-coder'],
      },
    ])
    const providers = await gw.listProviders()
    expect(providers).toHaveLength(1)
    expect(providers[0].id).toBe('deepseek')
    expect(providers[0].models).toHaveLength(2)
  })

  it('wireAgent throws for unknown provider', async () => {
    const gw = new DirectModelGateway()
    await expect(
      gw.wireAgent('claude', { provider: 'unknown', model: 'model' }),
    ).rejects.toThrow()
  })
})
