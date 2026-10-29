/**
 * MagpieCli / MagpieModelGateway 契约与负路径测试。
 *
 * 使用 fake magpie 二进制（fake.js + fake.cmd shim，Windows 经 cmd.exe 执行，
 * 与生产 run()/serve() 的 shell 模式一致）覆盖：
 * ModelGateway 契约套件、CLI 输出解析、超时/非零退出负路径、
 * 伪造 agent/model 参数注入守卫、隔离 DSH_HOME 写操作（真实用户配置零修改）。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MagpieCli, MagpieModelGateway, parseAgents, parseProviders, parseQuota } from './index.js'
import { runModelGatewayContractTests } from '@dogic/sdk'

const FAKE_JS = `
const fs = require('node:fs')
const path = require('node:path')
const dir = __dirname
const args = process.argv.slice(2)
const mode = process.env.FAKE_CLI_MODE ?? 'ok'
const cmd = args[0]
const write = (name, content) => fs.writeFileSync(path.join(dir, name), String(content))

if (cmd === 'healthcheck') {
  if (mode === 'slow') { setTimeout(() => process.exit(0), 10000); return }
  process.exit(fs.existsSync(path.join(dir, 'running.marker')) ? 0 : 1)
}

if (mode === 'fail') {
  console.error('fake-magpie: forced failure')
  process.exit(3)
}

if (cmd === 'serve') {
  fs.appendFileSync(path.join(dir, 'serve-pids.txt'), process.pid + '\\n')
  write('running.marker', process.pid)
  console.log('[fake-magpie] serve ready')
  setInterval(() => {}, 60000)
  return
}

if (cmd === 'ls') {
  const home = process.env.DSH_HOME
  for (const agent of ['claude', 'codex', 'dsh', 'gemini']) {
    const f = path.join(home, 'wired-' + agent + '.txt')
    if (fs.existsSync(f)) console.log(agent + '  ' + fs.readFileSync(f, 'utf8'))
    else console.log(agent)
  }
  process.exit(0)
}

if (cmd === 'providers') {
  console.log('zcode  ZCode')
  process.exit(0)
}

if (cmd === 'quota') {
  console.log('test  1234 tokens')
  process.exit(0)
}

if (args.length >= 2) {
  // 任意首参视为 agent：magpie <agent> <model|default>，写操作只落 DSH_HOME
  const home = process.env.DSH_HOME
  const agent = args[0]
  const model = args[1]
  const f = path.join(home, 'wired-' + agent + '.txt')
  if (model === 'default') {
    if (fs.existsSync(f)) fs.unlinkSync(f)
  } else {
    fs.writeFileSync(f, model)
    fs.writeFileSync(path.join(home, 'env-record.json'), JSON.stringify({ DSH_HOME: home }))
  }
  console.log(model === 'default' ? agent + ' default' : 'wired ' + agent + ' → ' + model)
  process.exit(0)
}

if (args.length === 1) {
  const f = path.join(process.env.DSH_HOME, 'wired-' + args[0] + '.txt')
  console.log(fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : 'default')
  process.exit(0)
}

console.error('unknown command: ' + JSON.stringify(args))
process.exit(2)
`

const FAKE_CMD = '@echo off\r\n@node "%~dp0fake.js" %*\r\n'

describe('W2.3 MagpieCli facade 契约与负路径', () => {
  let dir: string
  let fakeBin: string
  let dshHome: string

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'magpie-cli-fake-'))
    writeFileSync(path.join(dir, 'fake.js'), FAKE_JS)
    writeFileSync(path.join(dir, 'fake.cmd'), FAKE_CMD)
    fakeBin = path.join(dir, 'fake.cmd')
    dshHome = mkdtempSync(path.join(tmpdir(), 'dsh-home-'))
  })

  afterAll(() => {
    try {
      const pidsFile = path.join(dir, 'serve-pids.txt')
      if (existsSync(pidsFile)) {
        for (const pid of readFileSync(pidsFile, 'utf8').split('\n')) {
          if (pid.trim()) execFile('taskkill', ['/pid', pid.trim(), '/T', '/F'], () => {})
        }
      }
    } catch {
      /* 清理尽力而为 */
    }
    rmSync(dir, { recursive: true, force: true })
    rmSync(dshHome, { recursive: true, force: true })
  })

  runModelGatewayContractTests(() => new MagpieModelGateway({ binaryPath: fakeBin, env: { DSH_HOME: dshHome } }))

  describe('CLI 输出解析', () => {
    it('parseProviders 解析双列空白输出', () => {
      expect(parseProviders('zcode  ZCode\nanthropic  Claude\n\n')).toEqual([
        { id: 'zcode', name: 'ZCode', type: 'api-key', models: [], enabled: true },
        { id: 'anthropic', name: 'Claude', type: 'api-key', models: [], enabled: true },
      ])
    })

    it('parseAgents 双列视为已接线、单列未接线', () => {
      expect(parseAgents('claude  zcode/GLM-5.3\ncodex')).toEqual([
        { agentId: 'claude', wired: true, mode: 'gateway' },
        { agentId: 'codex', wired: false, mode: 'gateway' },
      ])
    })

    it('parseQuota 提取 provider 与用量', () => {
      const [quota] = parseQuota('zcode  1234 tokens')
      expect(quota.provider).toBe('zcode')
      expect(quota.used).toBe(1234)
      expect(quota.stale).toBe(false)
    })
  })

  describe('超时与非零退出负路径', () => {
    it('超时：run rejects，healthcheck 返回 false', async () => {
      const cli = new MagpieCli({ binaryPath: fakeBin, env: { FAKE_CLI_MODE: 'slow' }, timeout: 400 })
      await expect(cli.run(['healthcheck'])).rejects.toThrow()
      expect(await cli.healthcheck()).toBe(false)
    })

    it('非零退出：run resolves exitCode；gateway 写操作抛错', async () => {
      const cli = new MagpieCli({ binaryPath: fakeBin, env: { FAKE_CLI_MODE: 'fail' } })
      const result = await cli.run(['ls'])
      expect(result.exitCode).toBe(3)

      const gw = new MagpieModelGateway({ cli: new MagpieCli({ binaryPath: fakeBin, env: { FAKE_CLI_MODE: 'fail' } }) })
      await expect(gw.wireAgent('dsh', { provider: 'p', model: 'm' })).rejects.toThrow(/wireAgent failed/)
    })
  })

  describe('伪造 agent/model 参数守卫', () => {
    it('agent 含 shell 元字符被拒绝且不执行', async () => {
      const cli = new MagpieCli({ binaryPath: fakeBin })
      await expect(cli.wireAgent('bad;rm -rf', 'x')).rejects.toThrow(/参数非法/)
      await expect(cli.unwireAgent('x|y')).rejects.toThrow(/参数非法/)
      await expect(cli.agentStatus('a b')).rejects.toThrow(/参数非法/)
    })

    it('model 含 shell 元字符被拒绝', async () => {
      const cli = new MagpieCli({ binaryPath: fakeBin })
      await expect(cli.wireAgent('dsh', 'bad&cmd')).rejects.toThrow(/参数非法/)
      const gw = new MagpieModelGateway({ cli })
      await expect(gw.wireAgent('dsh', { provider: 'p', model: ';rm' })).rejects.toThrow(/参数非法/)
    })
  })

  describe('F1-V2 隔离 DSH_HOME 写操作', () => {
    it('接线/断开只落隔离 HOME，真实用户配置零修改', async () => {
      const realDsh = path.join(os.homedir(), '.dsh')
      const realBefore = existsSync(realDsh) ? new Set(readdirSync(realDsh)) : new Set<string>()

      const gw = new MagpieModelGateway({ binaryPath: fakeBin, env: { DSH_HOME: dshHome } })
      await gw.ensureRunning()
      await gw.wireAgent('dsh', { provider: 'zcode', model: 'GLM-5.3' })
      expect(readFileSync(path.join(dshHome, 'wired-dsh.txt'), 'utf8')).toBe('zcode/GLM-5.3')

      const recorded = JSON.parse(readFileSync(path.join(dshHome, 'env-record.json'), 'utf8')) as { DSH_HOME: string }
      expect(recorded.DSH_HOME).toBe(dshHome)

      await gw.unwireAgent('dsh')
      expect(existsSync(path.join(dshHome, 'wired-dsh.txt'))).toBe(false)

      const realAfter = existsSync(realDsh) ? new Set(readdirSync(realDsh)) : new Set<string>()
      const escaped = [...realAfter].filter((f) => !realBefore.has(f) && f.startsWith('wired-'))
      expect(escaped).toEqual([])

      await gw.stop()
    })
  })
})
