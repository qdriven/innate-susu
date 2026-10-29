import { describe, expect, it } from 'vitest'
import {
  MAX_INPUT_CHARS,
  parseProcessProfile,
  parseProcessRequest,
  parseTerminalDescriptor,
  parseTerminalInput,
  parseTerminalProfile,
  parseTerminalSize,
} from './index.js'

const baseProfile = { id: 'default', shell: 'cmd.exe', args: [] }

function descriptorInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 'term-1', providerId: 'terminal', kind: 'terminal', title: '终端', cols: 80, rows: 24, profile: baseProfile, ...overrides }
}

describe('parseTerminalDescriptor（W4.2 契约）', () => {
  it('只复制安全字段，缺省可选字段省略', () => {
    const parsed = parseTerminalDescriptor(descriptorInput())
    expect(parsed).toEqual({
      id: 'term-1',
      providerId: 'terminal',
      kind: 'terminal',
      title: '终端',
      cols: 80,
      rows: 24,
      profile: baseProfile,
    })
    expect('workspaceId' in parsed).toBe(false)
  })

  it('接受合法 workspaceId 与 profile 环境变量', () => {
    const parsed = parseTerminalDescriptor(descriptorInput({ workspaceId: 'ws-1', profile: { ...baseProfile, env: { TERM: 'xterm-256color' } } }))
    expect(parsed.workspaceId).toBe('ws-1')
    expect(parsed.profile.env).toEqual({ TERM: 'xterm-256color' })
  })

  it('非法 id 拒绝', () => {
    expect(() => parseTerminalDescriptor(descriptorInput({ id: 'bad id!' }))).toThrow(/terminal id/)
    expect(() => parseTerminalDescriptor(descriptorInput({ id: 'a'.repeat(65) }))).toThrow(/terminal id/)
    expect(() => parseTerminalDescriptor(descriptorInput({ id: 42 }))).toThrow(/terminal id/)
  })

  it('伪造 providerId/kind（伪造 capability）拒绝', () => {
    expect(() => parseTerminalDescriptor(descriptorInput({ providerId: 'browser' }))).toThrow(/providerId/)
    expect(() => parseTerminalDescriptor(descriptorInput({ kind: 'browser' }))).toThrow(/kind/)
  })

  it('非法尺寸拒绝', () => {
    expect(() => parseTerminalDescriptor(descriptorInput({ cols: 1 }))).toThrow(/cols/)
    expect(() => parseTerminalDescriptor(descriptorInput({ rows: 501 }))).toThrow(/rows/)
    expect(() => parseTerminalDescriptor(descriptorInput({ cols: 80.5 }))).toThrow(/cols/)
    expect(() => parseTerminalDescriptor(descriptorInput({ rows: '24' }))).toThrow(/rows/)
  })

  it('未知 shell profile 拒绝', () => {
    expect(() => parseTerminalDescriptor(descriptorInput({ profile: { id: 'evil', shell: 'cmd.exe /c rm -rf', args: [] } }))).toThrow(/未知 shell profile/)
    expect(() => parseTerminalDescriptor(descriptorInput({ profile: undefined }))).toThrow(/profile/)
  })

  it('非对象/字符串输入拒绝', () => {
    expect(() => parseTerminalDescriptor(null)).toThrow()
    expect(() => parseTerminalDescriptor('terminal')).toThrow()
    expect(() => parseTerminalDescriptor(descriptorInput({ title: '' }))).toThrow(/title/)
  })
})

describe('parseTerminalSize / parseTerminalInput', () => {
  it('尺寸越界拒绝，合法接受', () => {
    expect(parseTerminalSize({ cols: 80, rows: 24 })).toEqual({ cols: 80, rows: 24 })
    expect(() => parseTerminalSize({ cols: 0, rows: 24 })).toThrow(/cols/)
    expect(() => parseTerminalSize({ cols: 80, rows: -1 })).toThrow(/rows/)
  })

  it('输入必须是字符串且有上限', () => {
    expect(parseTerminalInput('ls -la\r\n')).toBe('ls -la\r\n')
    expect(() => parseTerminalInput(123)).toThrow(/字符串/)
    expect(() => parseTerminalInput('a'.repeat(MAX_INPUT_CHARS + 1))).toThrow(/上限/)
  })
})

describe('parseTerminalProfile（shell 白名单）', () => {
  it('内置 default 可接受', () => {
    expect(parseTerminalProfile(baseProfile)).toEqual(baseProfile)
  })

  it('未知 profile id 拒绝；非字符串参数过滤', () => {
    expect(() => parseTerminalProfile({ id: 'custom', shell: 'bash', args: [] })).toThrow(/未知 shell profile/)
    const parsed = parseTerminalProfile({ id: 'default', shell: 'cmd.exe', args: [1, '-v', null, 'flag'] })
    expect(parsed.args).toEqual(['-v', 'flag'])
  })
})

describe('process:execute 契约', () => {
  const known = new Set(['git', 'npm'])

  it('profile 白名单校验：非法字符/绝对路径/元字符拒绝', () => {
    expect(parseProcessProfile({ id: 'git', command: 'git', args: [] })).toEqual({ id: 'git', command: 'git', args: [] })
    expect(() => parseProcessProfile({ id: 'git', command: 'git; rm -rf /', args: [] })).toThrow(/非法字符/)
    expect(() => parseProcessProfile({ id: 'git', command: 'C:/Windows/System32/cmd.exe', args: [] })).toThrow(/非法字符/)
    expect(() => parseProcessProfile({ id: 'git', command: 'git', args: ['--flag', 5] })).toThrow(/args/)
    expect(() => parseProcessProfile({ id: 'bad id', command: 'git', args: [] })).toThrow(/profile id/)
  })

  it('请求必须命中白名单且 args 为字符串数组', () => {
    const request = parseProcessRequest({ profileId: 'git', args: ['status'] }, known)
    expect(request).toEqual({ profileId: 'git', args: ['status'] })
    expect(() => parseProcessRequest({ profileId: 'evil', args: [] }, known)).toThrow(/未注册/)
    expect(() => parseProcessRequest({ profileId: 'git', args: 'status' }, known)).toThrow(/args/)
    expect(() => parseProcessRequest({ profileId: 'git', args: ['ok', {}], }, known)).toThrow(/args/)
  })

  it('cwdRelative 必须是工作区相对路径', () => {
    expect(parseProcessRequest({ profileId: 'git', args: ['-C', 'sub'] }, known).cwdRelative).toBeUndefined()
    expect(() => parseProcessRequest({ profileId: 'git', args: [], cwdRelative: 'C:/abs' }, known)).toThrow(/工作区相对路径/)
    expect(() => parseProcessRequest({ profileId: 'git', args: [], cwdRelative: '../escape' }, known)).not.toThrow()
  })

  it('timeoutMs 必须在上限内', () => {
    expect(() => parseProcessRequest({ profileId: 'git', args: [], timeoutMs: 0 }, known)).toThrow(/timeoutMs/)
    expect(() => parseProcessRequest({ profileId: 'git', args: [], timeoutMs: 600_001 }, known)).toThrow(/timeoutMs/)
    expect(parseProcessRequest({ profileId: 'git', args: [], timeoutMs: 30_000 }, known).timeoutMs).toBe(30_000)
  })
})
