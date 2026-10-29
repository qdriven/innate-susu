import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { TerminalService } from './index.js'
import { MAX_PROCESS_OUTPUT_CHARS } from '../shared/index.js'
import type { TerminalEvent } from '../shared/index.js'

const execFileAsync = promisify(execFile)

async function makeService(rootPath: string | null, events: TerminalEvent[]) {
  const service = new TerminalService({
    onEvent: (event) => {
      events.push(event)
    },
    limits: { maxOutputChars: 64 * 1024 },
  })
  if (rootPath) await service.setRoot(rootPath)
  return service
}

function descriptor(id: string, overrides: Record<string, unknown> = {}) {
  return { id, providerId: 'terminal', kind: 'terminal', title: id, cols: 80, rows: 24, profile: { id: 'default' }, ...overrides }
}

async function waitFor(predicate: () => boolean, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('waitFor 超时')
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

function outputOf(events: TerminalEvent[], terminalId: string): string {
  return events
    .filter((event): event is Extract<TerminalEvent, { terminalId: string; data: string }> =>
      'terminalId' in event && event.terminalId === terminalId && 'data' in event)
    .map((event) => event.data)
    .join('')
}

async function tempRoot(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), 'dogic-terminal-'))
}

describe('TerminalService（W4.3）', () => {
  it('真命令输出与退出码回收', async () => {
    const root = await tempRoot()
    try {
      const events: TerminalEvent[] = []
      const service = await makeService(root, events)
      expect(await service.create(descriptor('t1'))).toEqual({ ok: true })
      expect(await service.input('t1', 'echo hello-terminal\r\n')).toBe(true)
      await waitFor(() => outputOf(events, 't1').includes('hello-terminal'))
      expect(await service.input('t1', 'exit 0\r\n')).toBe(true)
      await waitFor(() => events.some((event) => 'terminalId' in event && event.terminalId === 't1' && 'exitCode' in event))
      const exit = events.find((event) => 'terminalId' in event && event.terminalId === 't1' && 'exitCode' in event)
      expect(exit).toEqual({ terminalId: 't1', exitCode: 0, signal: undefined })
      await service.close('t1')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('中文输出正常', async () => {
    const root = await tempRoot()
    try {
      const events: TerminalEvent[] = []
      const service = await makeService(root, events)
      await service.create(descriptor('t1'))
      await service.input('t1', 'echo 中文输出正常\r\n')
      await waitFor(() => outputOf(events, 't1').includes('中文输出正常'))
      await service.close('t1')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('大数据输出：环形截断 + scrollback 保留尾部', async () => {
    const root = await tempRoot()
    try {
      const events: TerminalEvent[] = []
      const service = new TerminalService({
        onEvent: (event) => {
          events.push(event)
        },
        limits: { maxOutputChars: 4096 },
      })
      await service.setRoot(root)
      await service.create(descriptor('big'))
      await service.input('big', 'for /L %i in (1,1,2000) do @echo ABCDEFGHIJ\r\n')
      await waitFor(() => outputOf(events, 'big').length > 0, 15_000)
      await service.input('big', 'echo TAIL-MARKER-9\r\n')
      await service.input('big', 'exit 0\r\n')
      await waitFor(() => events.some((event) => 'terminalId' in event && event.terminalId === 'big' && 'exitCode' in event), 15_000)
      const snapshot = service.snapshot('big')
      expect(snapshot.ok).toBe(true)
      expect(snapshot.truncated).toBe(true)
      expect((snapshot.scrollback ?? '').length).toBeLessThanOrEqual(4096)
      // 环形保留尾部：标记行位于缓冲尾部区域（说明丢弃的是最旧输出，而非最新）
      const tail = snapshot.scrollback ?? ''
      expect(tail.lastIndexOf('TAIL-MARKER-9')).toBeGreaterThan(tail.length - 200)
      await service.close('big')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('resize 通道：合法接受、未知会话拒绝', async () => {
    const root = await tempRoot()
    try {
      const service = await makeService(root, [])
      await service.create(descriptor('t1'))
      expect(await service.resize('t1', { cols: 100, rows: 30 })).toBe(true)
      expect(await service.resize('t1', { cols: 1, rows: 30 })).toBe(false)
      expect(await service.resize('missing', { cols: 80, rows: 24 })).toBe(false)
      await service.close('t1')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('重复 id 显式失败；非法 descriptor 失败', async () => {
    const root = await tempRoot()
    try {
      const service = await makeService(root, [])
      expect(await service.create(descriptor('dup'))).toEqual({ ok: true })
      const dup = await service.create(descriptor('dup'))
      expect(dup.ok).toBe(false)
      expect(dup.detail).toContain('已存在')
      expect((await service.create(descriptor('bad', { cols: 1 }))).ok).toBe(false)
      expect((await service.create(descriptor('bad2', { profile: { id: 'evil' } }))).ok).toBe(false)
      // 伪造 capability：未知 workspaceId 拒绝
      expect((await service.create(descriptor('bad3', { workspaceId: 'nope' }))).ok).toBe(false)
      await service.close('dup')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('无 root 时创建失败并给 hint', async () => {
    const service = await makeService(null, [])
    const result = await service.create(descriptor('t1'))
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('工作区')
    expect(service.list()).toEqual([])
  })

  it('root 被替换：旧会话保持原 cwd，新会话使用新 root', async () => {
    const rootA = await tempRoot()
    const rootB = await tempRoot()
    try {
      const events: TerminalEvent[] = []
      const service = await makeService(rootA, events)
      await service.create(descriptor('a'))
      await service.input('a', 'cd\r\n')
      await waitFor(() => outputOf(events, 'a').includes(rootA.split(path.sep).pop() ?? ''))
      await service.input('a', 'exit 0\r\n')
      await waitFor(() => events.some((event) => 'terminalId' in event && event.terminalId === 'a' && 'exitCode' in event))

      // root 替换：setRoot 到 B 后新会话用 B，旧会话（已退出但未关闭）仍保留
      expect(await service.setRoot(rootB)).not.toBeNull()
      expect(await service.create(descriptor('b'))).toEqual({ ok: true })
      expect(await service.input('b', 'cd\r\n')).toBe(true)
      await waitFor(() => outputOf(events, 'b').includes(rootB.split(path.sep).pop() ?? ''))
      // 旧会话仍在列表中（deactivate 不杀会话，close 才终止）
      expect(service.list()).toEqual(expect.arrayContaining(['a', 'b']))
      await service.close('a')
      await service.close('b')
    } finally {
      await rm(rootA, { recursive: true, force: true })
      await rm(rootB, { recursive: true, force: true })
    }
  })

  it('关闭语义：重复关闭失败、关闭后输入拒绝', async () => {
    const root = await tempRoot()
    try {
      const service = await makeService(root, [])
      await service.create(descriptor('t1'))
      expect(await service.close('t1')).toBe(true)
      // 重复关闭显式失败
      expect(await service.close('t1')).toBe(false)
      // 关闭后输入拒绝
      expect(await service.input('t1', 'echo after-close\r\n')).toBe(false)
      expect(service.list()).toEqual([])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('dispose 统一回收全部会话', async () => {
    const root = await tempRoot()
    try {
      const service = await makeService(root, [])
      await service.create(descriptor('t1'))
      await service.create(descriptor('t2'))
      await service.dispose()
      expect(service.list()).toEqual([])
      expect((await service.create(descriptor('t3'))).ok).toBe(false)
      expect(await service.input('t1', 'echo x\r\n')).toBe(false)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('TerminalService profile 注册表', () => {
  it('registerProfile：非法结构拒绝、重复注册失败、合法 profile 可注册', async () => {
    const root = await tempRoot()
    try {
      const service = await makeService(root, [])
      expect(service.registerProfile({ id: 'git-bash', shell: 'git-bash.exe', args: ['--login'] })).toEqual({ ok: true })
      const dup = service.registerProfile({ id: 'git-bash', shell: 'x.exe', args: [] })
      expect(dup.ok).toBe(false)
      expect(dup.detail).toContain('重复注册')
      expect(service.registerProfile({ id: 'bad id', shell: 'x.exe', args: [] }).ok).toBe(false)
      expect(service.registerProfile({ id: 'empty', shell: '', args: [] }).ok).toBe(false)
      // 渲染端只提交 profile 引用 id，shell 由服务端解析（git-bash.exe 不存在 → spawn 失败显式返回）
      const result = await service.create(descriptor('g', { profile: { id: 'git-bash' } }))
      expect(result.ok).toBe(false)
      await service.close('g')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('环境变量注入白名单：不注入 secret env', async () => {
    const root = await tempRoot()
    try {
      const events: TerminalEvent[] = []
      const service = new TerminalService({
        onEvent: (event) => {
          events.push(event)
        },
        env: { ...process.env, PATH: process.env.PATH ?? '', SECRET_TOKEN: 'super-secret', MY_CUSTOM: 'custom-value' },
      })
      await service.setRoot(root)
      await service.create(descriptor('env'))
      await service.input('env', 'echo [%SECRET_TOKEN%]\r\n')
      await service.input('env', 'echo [%MY_CUSTOM%]\r\n')
      await waitFor(() => outputOf(events, 'env').includes('echo [%MY_CUSTOM%]') || outputOf(events, 'env').includes('echo []'))
      const out = outputOf(events, 'env')
      // 白名单外的环境变量一律不注入：secret 与自定义值都不出现在输出里
      expect(out).not.toContain('super-secret')
      expect(out).not.toContain('custom-value')
      await service.close('env')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('孤儿进程回收（Windows）', () => {
  it('close 后 taskkill 回收的 ping 子进程不再存活', async () => {
    const root = await tempRoot()
    try {
      const service = await makeService(root, [])
      await service.create(descriptor('orphan'))
      // 派生可存活子进程（start cmd /c ping），验证关闭时进程树整体回收
      await service.input('orphan', 'start cmd.exe /c "ping -n 120 127.0.0.1 > nul"\r\n')
      await new Promise((resolve) => setTimeout(resolve, 600))
      expect(service.list()).toEqual(['orphan'])
      await service.close('orphan')
      await new Promise((resolve) => setTimeout(resolve, 400))
      const listed = await execFileAsync('tasklist', ['/FI', 'IMAGENAME eq ping.exe', '/NH'], { windowsHide: true })
      expect(listed.stdout).not.toMatch(/ping\.exe/i)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('TerminalService root 订阅语义（W4.5）', () => {
  it('root 切换：活会话保持原 cwd 且仍可交互，新会话使用新 root', async () => {
    const rootA = await tempRoot()
    const rootB = await tempRoot()
    try {
      await mkdir(path.join(rootA, 'marker-a'))
      await mkdir(path.join(rootB, 'marker-b'))
      const events: TerminalEvent[] = []
      const service = await makeService(rootA, events)
      await service.create(descriptor('a'))
      // a 的 cwd 进入 A 的标记子目录
      await service.input('a', 'cd marker-a\r\n')
      await service.input('a', 'cd\r\n')
      await waitFor(() => outputOf(events, 'a').includes('marker-a'))

      // root 切换：活会话 a 不受影响、仍可交互
      expect(await service.setRoot(rootB)).not.toBeNull()
      await service.input('a', 'echo ALIVE-AFTER-SWITCH\r\n')
      await waitFor(() => outputOf(events, 'a').includes('ALIVE-AFTER-SWITCH'))
      // a 的 cwd 仍是 A（不是 B）：cd 输出仍含 marker-a、不含 marker-b
      const before = outputOf(events, 'a').length
      await service.input('a', 'cd\r\n')
      await waitFor(() => outputOf(events, 'a').length > before)
      const afterSwitch = outputOf(events, 'a').slice(before)
      expect(afterSwitch).toContain('marker-a')
      expect(afterSwitch).not.toContain('marker-b')

      // 新会话 b 使用新 root B
      expect(await service.create(descriptor('b'))).toEqual({ ok: true })
      await service.input('b', 'cd marker-b\r\n')
      await service.input('b', 'cd\r\n')
      await waitFor(() => outputOf(events, 'b').includes('marker-b'))
      await service.close('a')
      await service.close('b')
    } finally {
      await rm(rootA, { recursive: true, force: true })
      await rm(rootB, { recursive: true, force: true })
    }
  })

  it('失效 root 负路径：root 被删除后创建失败给 hint，不回退系统目录', async () => {
    const rootA = await tempRoot()
    try {
      const events: TerminalEvent[] = []
      const service = await makeService(rootA, events)
      await service.create(descriptor('a'))
      // root 被删除：新会话创建必须失败且不 spawn（列表不变，无隐式回退）
      await rm(rootA, { recursive: true, force: true })
      const result = await service.create(descriptor('b'))
      expect(result.ok).toBe(false)
      expect(result.detail).toContain('失效')
      expect(service.list()).toEqual(['a'])
      // 活会话 a 仍保留（PTY 持有已删除 cwd 的句柄，不受 root 删除影响）
      expect(await service.input('a', 'echo KEEP-ALIVE\r\n')).toBe(true)
      await waitFor(() => outputOf(events, 'a').includes('KEEP-ALIVE'))
      await service.close('a')
    } finally {
      // rootA 已删，force 清理兜底
      await rm(rootA, { recursive: true, force: true })
    }
  })

  it('setRoot 无效路径：拒绝且不改变当前 root', async () => {
    const rootA = await tempRoot()
    try {
      const service = await makeService(rootA, [])
      const before = service.getRoot()
      expect(before).not.toBeNull()
      // 不存在的目录：setRoot 返回 null，当前 root 保持不变（不丢工作区）
      expect(await service.setRoot(path.join(rootA, 'ghost-dir'))).toBeNull()
      expect(service.getRoot()).toEqual(before)
      // 原 root 仍可正常创建会话
      expect(await service.create(descriptor('t1'))).toEqual({ ok: true })
      await service.close('t1')
    } finally {
      await rm(rootA, { recursive: true, force: true })
    }
  })

  it('workspaceId 必须映射当前 root：指向另一 root 的路径被拒绝', async () => {
    const rootA = await tempRoot()
    const rootB = await tempRoot()
    try {
      const service = await makeService(rootA, [])
      const canonicalA = service.getRoot()?.path
      // renderer 已知的另一 root 路径：映射不到当前 root → 拒绝（防 cwd 劫持）
      const steered = await service.create(descriptor('steer', { workspaceId: rootB }))
      expect(steered.ok).toBe(false)
      expect(steered.detail).toContain('不匹配')
      // renderer 已知的当前 root 路径（服务端 canonical）：接受
      expect(await service.create(descriptor('ok', { workspaceId: canonicalA }))).toEqual({ ok: true })
      await service.close('ok')
    } finally {
      await rm(rootA, { recursive: true, force: true })
      await rm(rootB, { recursive: true, force: true })
    }
  })
})

describe('TerminalService process:execute（W4.6）', () => {
  it('正路径真命令：受理回执 + 结果通道取回 + 审计事件（脱敏）', async () => {
    const root = await tempRoot()
    try {
      const events: TerminalEvent[] = []
      const service = await makeService(root, events)
      expect(service.registerProcessProfile({ id: 'echoer', command: 'cmd.exe', args: ['/c'] })).toEqual({ ok: true })
      const ack = await service.execute({ profileId: 'echoer', args: ['echo', 'process-ok-123'] })
      expect(ack.ok).toBe(true)
      expect(ack.executionId).toMatch(/^exec-\d+$/)
      const result = await service.processResult(ack.executionId)
      expect(result.ok).toBe(true)
      expect(result.exitCode).toBe(0)
      expect(result.timedOut).toBe(false)
      expect(result.cancelled).toBe(false)
      expect(result.truncated).toBe(false)
      expect(result.stdout).toContain('process-ok-123')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
      // 审计事件：字段齐全，脱敏（不含输出与 env）
      const audit = events.find((event): event is Extract<TerminalEvent, { executionId: string }> => 'executionId' in event)
      expect(audit).toBeDefined()
      expect(audit?.executionId).toBe(ack.executionId)
      expect(audit?.profileId).toBe('echoer')
      expect(audit?.cwd).toBe(service.getRoot()?.path)
      expect(audit?.ok).toBe(true)
      expect(audit?.exitCode).toBe(0)
      expect(audit?.durationMs).toBeGreaterThanOrEqual(0)
      expect(audit?.startedAt).toBeTruthy()
      expect(audit?.finishedAt).toBeTruthy()
      await service.dispose()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('未注册 profile / 绕 preload 垃圾输入全拒', async () => {
    const root = await tempRoot()
    try {
      const service = await makeService(root, [])
      expect(service.registerProcessProfile({ id: 'echoer', command: 'cmd.exe', args: ['/c'] })).toEqual({ ok: true })
      const ghost = await service.execute({ profileId: 'ghost', args: [] })
      expect(ghost.ok).toBe(false)
      expect(ghost.detail).toContain('未注册')
      const result = await service.processResult(ghost.executionId)
      expect(result.ok).toBe(false)
      expect(result.detail).toContain('未注册')
      // 绕 preload：非对象、args 字符串（命令拼接）在解析层拒绝
      expect((await service.execute('not-an-object')).ok).toBe(false)
      const badArgs = await service.execute({ profileId: 'echoer', args: 'rm -rf /' })
      expect(badArgs.ok).toBe(false)
      expect(badArgs.detail).toContain('args')
      // 未知执行 id 显式失败
      const missing = await service.processResult('exec-ghost')
      expect(missing.ok).toBe(false)
      expect(missing.detail).toContain('不存在')
      await service.dispose()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('cwd 逃逸拒绝：请求级与 profile 级 .. 越界、cwd 不存在', async () => {
    const root = await tempRoot()
    try {
      const service = await makeService(root, [])
      expect(service.registerProcessProfile({ id: 'escape', command: 'cmd.exe', args: ['/c'] })).toEqual({ ok: true })
      expect(service.registerProcessProfile({ id: 'esc-profile', command: 'cmd.exe', args: ['/c'], cwdRelative: '..' })).toEqual({ ok: true })
      const reqEscape = await service.execute({ profileId: 'escape', args: ['echo', 'x'], cwdRelative: '../outside' })
      expect(reqEscape.ok).toBe(false)
      expect(reqEscape.detail).toContain('越出')
      const profileEscape = await service.execute({ profileId: 'esc-profile', args: ['echo', 'x'] })
      expect(profileEscape.ok).toBe(false)
      expect(profileEscape.detail).toContain('越出')
      const missing = await service.execute({ profileId: 'escape', args: ['echo', 'x'], cwdRelative: 'ghost-dir' })
      expect(missing.ok).toBe(false)
      expect(missing.detail).toContain('不存在')
      await service.dispose()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('超时：显式 timedOut 状态，进程树回收', async () => {
    const root = await tempRoot()
    try {
      const service = await makeService(root, [])
      expect(service.registerProcessProfile({ id: 'sleeper', command: 'node', args: ['-e'] })).toEqual({ ok: true })
      const ack = await service.execute({
        profileId: 'sleeper',
        args: ['setTimeout(() => {}, 60000)'],
        timeoutMs: 800,
      })
      expect(ack.ok).toBe(true)
      const result = await service.processResult(ack.executionId)
      expect(result.timedOut).toBe(true)
      expect(result.ok).toBe(false)
      expect(result.exitCode).toBeNull()
      expect(result.detail).toContain('超时')
      await service.dispose()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('取消：cancel 后 cancelled 状态；重复/未知取消显式失败', async () => {
    const root = await tempRoot()
    try {
      const service = await makeService(root, [])
      expect(service.registerProcessProfile({ id: 'sleeper', command: 'node', args: ['-e'] })).toEqual({ ok: true })
      const ack = await service.execute({ profileId: 'sleeper', args: ['setTimeout(() => {}, 60000)'] })
      expect(ack.ok).toBe(true)
      expect(await service.cancel(ack.executionId)).toBe(true)
      const result = await service.processResult(ack.executionId)
      expect(result.cancelled).toBe(true)
      expect(result.ok).toBe(false)
      expect(result.detail).toContain('取消')
      expect(await service.cancel(ack.executionId)).toBe(false)
      expect(await service.cancel('exec-ghost')).toBe(false)
      await service.dispose()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('非零退出：显式 exitCode 与 detail', async () => {
    const root = await tempRoot()
    try {
      const service = await makeService(root, [])
      expect(service.registerProcessProfile({ id: 'exiter', command: 'cmd.exe', args: ['/c'] })).toEqual({ ok: true })
      const ack = await service.execute({ profileId: 'exiter', args: ['exit', '3'] })
      const result = await service.processResult(ack.executionId)
      expect(result.ok).toBe(false)
      expect(result.exitCode).toBe(3)
      expect(result.detail).toContain('3')
      await service.dispose()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('输出截断：超限环形保留尾部；secret env 不注入且审计脱敏', async () => {
    const root = await tempRoot()
    try {
      const events: TerminalEvent[] = []
      const service = new TerminalService({
        onEvent: (event) => {
          events.push(event)
        },
        env: { ...process.env, PATH: process.env.PATH ?? '', SECRET_TOKEN: 'super-secret' },
      })
      await service.setRoot(root)
      expect(service.registerProcessProfile({ id: 'big', command: 'node', args: ['-e'] })).toEqual({ ok: true })
      const ack = await service.execute({ profileId: 'big', args: ['process.stdout.write("X".repeat(300000))'] })
      const result = await service.processResult(ack.executionId)
      expect(result.ok).toBe(true)
      expect(result.truncated).toBe(true)
      expect(result.stdout.length).toBeLessThanOrEqual(MAX_PROCESS_OUTPUT_CHARS)
      // 白名单基座不注入 secret env：进程内读取为空
      const echoAck = await service.execute({
        profileId: 'big',
        args: ['process.stdout.write(process.env.SECRET_TOKEN ?? "NO-SECRET")'],
      })
      const echoResult = await service.processResult(echoAck.executionId)
      expect(echoResult.stdout).toContain('NO-SECRET')
      expect(echoResult.stdout).not.toContain('super-secret')
      // 事件流（审计）不含 secret 与输出内容
      const serialized = JSON.stringify(events)
      expect(serialized).not.toContain('super-secret')
      expect(serialized).not.toContain('XXXXX')
      await service.dispose()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('process profile 注册负路径：非法 command/绝对路径拒绝、重复注册失败', async () => {
    const root = await tempRoot()
    try {
      const service = await makeService(root, [])
      const metachar = service.registerProcessProfile({ id: 'git', command: 'git; rm -rf /', args: [] })
      expect(metachar.ok).toBe(false)
      expect(metachar.detail).toContain('非法字符')
      const absolute = service.registerProcessProfile({ id: 'abs', command: 'C:/Windows/System32/cmd.exe', args: [] })
      expect(absolute.ok).toBe(false)
      expect(service.registerProcessProfile({ id: 'echoer', command: 'cmd.exe', args: ['/c'] })).toEqual({ ok: true })
      const dup = service.registerProcessProfile({ id: 'echoer', command: 'x.exe', args: [] })
      expect(dup.ok).toBe(false)
      expect(dup.detail).toContain('重复注册')
      expect(service.processProfileIds()).toEqual(['echoer'])
      await service.dispose()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('无 root 时执行拒绝并给 hint', async () => {
    const service = await makeService(null, [])
    expect(service.registerProcessProfile({ id: 'echoer', command: 'cmd.exe', args: ['/c'] })).toEqual({ ok: true })
    const ack = await service.execute({ profileId: 'echoer', args: ['echo', 'x'] })
    expect(ack.ok).toBe(false)
    expect(ack.detail).toContain('工作区')
    const result = await service.processResult(ack.executionId)
    expect(result.ok).toBe(false)
    await service.dispose()
  })

  it('dispose 统一回收执行中的 process', async () => {
    const root = await tempRoot()
    try {
      const service = await makeService(root, [])
      expect(service.registerProcessProfile({ id: 'sleeper', command: 'node', args: ['-e'] })).toEqual({ ok: true })
      const ack = await service.execute({ profileId: 'sleeper', args: ['setTimeout(() => {}, 60000)'] })
      const pending = service.processResult(ack.executionId)
      await service.dispose()
      const result = await pending
      expect(result.cancelled).toBe(true)
      // dispose 后新执行被拒
      const after = await service.execute({ profileId: 'sleeper', args: ['echo', 'x'] })
      expect(after.ok).toBe(false)
      expect(after.detail).toContain('已关闭')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
