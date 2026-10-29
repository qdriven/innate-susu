import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_COLS, DEFAULT_ROWS, SCROLLBACK_LINES, TerminalSessionStore } from '@dogic/plugin-terminal/renderer'
import type { TerminalApi, TerminalDescriptor, TerminalEvent } from '@dogic/plugin-terminal'
import { TERMINAL_PROVIDER_ID, surfacePageId, terminalSurface } from './catalog'
import { createTerminalProvider } from './providers/terminal'
import { SurfaceProviderRegistry } from './provider-registry'

interface MockTerminal {
  element: HTMLElement | undefined
  options: Record<string, unknown>
  write: ReturnType<typeof vi.fn>
  open: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
  onData: ReturnType<typeof vi.fn>
  getSelection: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
  loadAddon: ReturnType<typeof vi.fn>
}

const hoisted = vi.hoisted(() => {
  const terminals: unknown[] = []
  return { terminals }
})

vi.mock('@xterm/xterm', () => {
  return {
    Terminal: class {
      element: HTMLElement | undefined
      options: Record<string, unknown> = {}
      write = vi.fn()
      open = vi.fn((element: HTMLElement): void => {
        // 真实 xterm.open：终端 DOM 是容器内的子元素，xterm.element 指向它。
        this.element = document.createElement('div')
        element.appendChild(this.element)
      })
      onData = vi.fn((): { dispose(): void } => ({ dispose: vi.fn() }))
      getSelection = vi.fn((): string => '')
      clear = vi.fn()
      dispose = vi.fn()
      loadAddon = vi.fn()
      constructor(options?: Record<string, unknown>) {
        this.options = options ?? {}
        hoisted.terminals.push(this)
      }
    },
  }
})

vi.mock('@xterm/addon-fit', () => {
  return {
    FitAddon: class {
      fit = vi.fn()
      proposeDimensions = vi.fn((): { cols: number; rows: number } => ({ cols: 80, rows: 24 }))
    },
  }
})

function mockTerminal(index = 0): MockTerminal {
  return hoisted.terminals[index] as MockTerminal
}

interface FakeTerminalApi {
  api: TerminalApi
  create: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  input: ReturnType<typeof vi.fn>
  resize: ReturnType<typeof vi.fn>
  emit(event: TerminalEvent): void
}

function makeApi(overrides: Partial<TerminalApi> = {}): FakeTerminalApi {
  const listeners = new Set<(event: TerminalEvent) => void>()
  const create = vi.fn(async (_descriptor: TerminalDescriptor): Promise<{ ok: boolean }> => ({ ok: true }))
  const close = vi.fn(async (): Promise<boolean> => true)
  const input = vi.fn(async (): Promise<boolean> => true)
  const resize = vi.fn(async (): Promise<boolean> => true)
  const onEvent = vi.fn((cb: (event: TerminalEvent) => void): (() => void) => {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  })
  const api: TerminalApi = {
    terminalCreate: create,
    terminalClose: close,
    terminalInput: input,
    terminalResize: resize,
    terminalOnEvent: onEvent,
    // W4.6 process:execute 窄通道桩（渲染端测试不直接消费）
    processProfileRegister: vi.fn(async (): Promise<{ ok: boolean }> => ({ ok: true })),
    processProfiles: vi.fn(async (): Promise<string[]> => []),
    processExecute: vi.fn(async (): Promise<{ executionId: string; ok: boolean }> => ({ executionId: 'exec-1', ok: true })),
    processResult: vi.fn(async (): Promise<{
      executionId: string; ok: boolean; exitCode: number | null; signal: string | null;
      durationMs: number; stdout: string; stderr: string; truncated: boolean;
      timedOut: boolean; cancelled: boolean;
    }> => ({
      executionId: 'exec-1', ok: true, exitCode: 0, signal: null, durationMs: 1,
      stdout: '', stderr: '', truncated: false, timedOut: false, cancelled: false,
    })),
    processCancel: vi.fn(async (): Promise<boolean> => true),
    ...overrides,
  }
  return {
    api,
    create,
    close,
    input,
    resize,
    emit: (event: TerminalEvent): void => {
      for (const listener of [...listeners]) listener(event)
    },
  }
}

beforeEach(() => {
  hoisted.terminals.length = 0
})

describe('TerminalSessionStore（W4.4）', () => {
  it('create 提交安全 descriptor：默认尺寸、default profile、workspaceId 透传', async () => {
    const { api, create } = makeApi()
    const store = new TerminalSessionStore(api)
    const session = await store.create('terminal-1', { title: '终端 1', workspaceId: 'C:/repo' })

    expect(create).toHaveBeenCalledTimes(1)
    const descriptor = create.mock.calls[0]?.[0] as TerminalDescriptor
    expect(descriptor).toMatchObject({
      id: 'terminal-1-s1',
      providerId: TERMINAL_PROVIDER_ID,
      kind: 'terminal',
      title: '终端 1',
      cols: DEFAULT_COLS,
      rows: DEFAULT_ROWS,
      profile: { id: 'default' },
    })
    expect(descriptor.workspaceId).toBe('C:/repo')
    expect(store.get('terminal-1')).toBe(session)
    // xterm 滚动缓冲上限按策略传入
    expect(mockTerminal().options.scrollback).toBe(SCROLLBACK_LINES)
  })

  it('workspaceId 缺省时不提交该字段', async () => {
    const { api, create } = makeApi()
    const store = new TerminalSessionStore(api)
    await store.create('terminal-1', { title: '终端 1' })
    const descriptor = create.mock.calls[0]?.[0] as TerminalDescriptor
    expect(descriptor.workspaceId).toBeUndefined()
  })

  it('create 失败抛出服务端 detail，不留半成品会话', async () => {
    const { api, create } = makeApi()
    create.mockResolvedValue({ ok: false, detail: '未选择工作区目录，请先选择工作区' })
    const store = new TerminalSessionStore(api)

    await expect(store.create('terminal-1', { title: '终端 1' })).rejects.toThrow('未选择工作区目录')
    expect(store.get('terminal-1')).toBeUndefined()
  })

  it('并发 create 共享同一 Promise（StrictMode 双挂载不重复建会话）', async () => {
    const { api, create } = makeApi()
    const store = new TerminalSessionStore(api)

    const [a, b] = await Promise.all([
      store.create('terminal-1', { title: '终端 1' }),
      store.create('terminal-1', { title: '终端 1' }),
    ])

    expect(create).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  it('已有未 dispose 会话直接复用：不重复 terminalCreate', async () => {
    const { api, create } = makeApi()
    const store = new TerminalSessionStore(api)
    const first = await store.create('terminal-1', { title: '终端 1' })
    const second = await store.create('terminal-1', { title: '终端 1' })

    expect(create).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('attach 首次 open，重挂复用元素；detach 只摘 DOM、会话保留', async () => {
    const { api } = makeApi()
    const store = new TerminalSessionStore(api)
    await store.create('terminal-1', { title: '终端 1' })

    const first = document.createElement('div')
    const second = document.createElement('div')

    expect(store.attach('terminal-1', first)).toBeDefined()
    expect(mockTerminal().open).toHaveBeenCalledTimes(1)
    expect(first.childNodes.length).toBe(1)

    store.detach('terminal-1')
    expect(first.childNodes.length).toBe(0)
    expect(store.get('terminal-1')).toBeDefined() // detach 不终止会话

    expect(store.attach('terminal-1', second)).toBeDefined()
    expect(mockTerminal().open).toHaveBeenCalledTimes(1) // 未重复 open，scrollback 保留
    expect(second.childNodes.length).toBe(1)
  })

  it('attach 未知 surfaceId 返回 undefined', () => {
    const { api } = makeApi()
    const store = new TerminalSessionStore(api)
    expect(store.attach('ghost', document.createElement('div'))).toBeUndefined()
  })

  it('dispose：terminalClose + xterm.dispose + 移除存储（close 语义）', async () => {
    const { api, close } = makeApi()
    const store = new TerminalSessionStore(api)
    await store.create('terminal-1', { title: '终端 1' })

    await store.dispose('terminal-1')

    expect(close).toHaveBeenCalledWith('terminal-1-s1')
    expect(mockTerminal().dispose).toHaveBeenCalledTimes(1)
    expect(store.get('terminal-1')).toBeUndefined()
  })

  it('exit 事件：更新终态并通知监听器；未知 terminalId 忽略', async () => {
    const { api, emit } = makeApi()
    const store = new TerminalSessionStore(api)
    await store.create('terminal-1', { title: '终端 1' })
    const exited = vi.fn()
    store.onExit('terminal-1', exited)

    emit({ terminalId: 'terminal-1-s1', exitCode: 3 })

    expect(store.get('terminal-1')?.exitCode).toBe(3)
    expect(exited).toHaveBeenCalledWith(3)

    emit({ terminalId: 'ghost', exitCode: 0 })
    expect(exited).toHaveBeenCalledTimes(1)
  })

  it('output 事件写入 xterm；error 事件带前缀写入', async () => {
    const { api, emit } = makeApi()
    const store = new TerminalSessionStore(api)
    await store.create('terminal-1', { title: '终端 1' })
    const xterm = mockTerminal()

    emit({ terminalId: 'terminal-1-s1', data: 'hello\r\n' })
    expect(xterm.write).toHaveBeenCalledWith('hello\r\n')

    emit({ terminalId: 'terminal-1-s1', message: 'boom' })
    expect(xterm.write).toHaveBeenLastCalledWith('\r\n[terminal] boom\r\n')
  })

  it('已 dispose 会话的迟到事件被忽略', async () => {
    const { api, emit } = makeApi()
    const store = new TerminalSessionStore(api)
    await store.create('terminal-1', { title: '终端 1' })
    await store.dispose('terminal-1')

    emit({ terminalId: 'terminal-1-s1', data: 'late\r\n' })
    expect(mockTerminal().write).not.toHaveBeenCalled()
  })

  it('重开：dispose 后 create 派生新 terminalId', async () => {
    const { api, create } = makeApi()
    const store = new TerminalSessionStore(api)
    await store.create('terminal-1', { title: '终端 1' })
    await store.dispose('terminal-1')

    const session = await store.create('terminal-1', { title: '终端 1' })

    expect(session.terminalId).toBe('terminal-1-s2')
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('创建期间标签被关闭：新建 PTY 立即回收，不留孤儿会话', async () => {
    const { api, create, close } = makeApi()
    let resolveCreate: (value: { ok: boolean }) => void = () => undefined
    create.mockImplementation(() => new Promise((resolve) => { resolveCreate = resolve }))
    const store = new TerminalSessionStore(api)

    const creating = store.create('terminal-1', { title: '终端 1' })
    await store.dispose('terminal-1') // 尚无会话条目，但仍须标记回收
    resolveCreate({ ok: true })

    await expect(creating).rejects.toThrow('终端标签已关闭')
    expect(close).toHaveBeenCalledWith('terminal-1-s1')
    expect(store.get('terminal-1')).toBeUndefined()
  })

  it('onExit 监听器可摘除', async () => {
    const { api, emit } = makeApi()
    const store = new TerminalSessionStore(api)
    await store.create('terminal-1', { title: '终端 1' })
    const exited = vi.fn()
    const off = store.onExit('terminal-1', exited)
    off()

    emit({ terminalId: 'terminal-1-s1', exitCode: 0 })
    expect(exited).not.toHaveBeenCalled()
  })

  it('applyTheme 跟随当前 .dark 状态写回 xterm 主题', async () => {
    const { api } = makeApi()
    const store = new TerminalSessionStore(api)
    await store.create('terminal-1', { title: '终端 1' })
    const xterm = mockTerminal()

    store.applyTheme('terminal-1')
    expect(xterm.options.theme).toMatchObject({ background: '#ffffff' })

    document.documentElement.classList.add('dark')
    try {
      store.applyTheme('terminal-1')
      expect(xterm.options.theme).toMatchObject({ background: '#1c1c1c' })
    } finally {
      document.documentElement.classList.remove('dark')
    }
  })
})

describe('terminal catalog（W4.4）', () => {
  it('terminalSurface 生成安全 descriptor（terminal kind + process:execute capability）', () => {
    expect(terminalSurface('terminal-1', 'C:/repo', 1)).toEqual({
      id: 'terminal-1',
      providerId: TERMINAL_PROVIDER_ID,
      kind: 'terminal',
      title: '终端 1',
      workspaceId: 'C:/repo',
      capabilities: ['process:execute'],
    })
  })

  it('terminal 只映射 dev 终端页，simple 模式不可见', () => {
    expect(surfacePageId(TERMINAL_PROVIDER_ID, 'dev')).toBe('terminal')
    expect(surfacePageId(TERMINAL_PROVIDER_ID, 'simple')).toBeUndefined()
  })
})

describe('terminal provider（W4.4）', () => {
  it('注册为 terminal kind；无会话时 close 幂等', async () => {
    const { api, close } = makeApi()
    const registry = new SurfaceProviderRegistry()
    registry.register(createTerminalProvider(api))

    const provider = registry.get(TERMINAL_PROVIDER_ID)
    expect(provider?.kind).toBe('terminal')

    await provider?.close?.({
      id: 'terminal-1',
      providerId: TERMINAL_PROVIDER_ID,
      kind: 'terminal',
      title: '终端 1',
    })
    expect(close).not.toHaveBeenCalled()
  })

  it('重复注册同名 provider 显式失败', () => {
    const { api } = makeApi()
    const registry = new SurfaceProviderRegistry()
    registry.register(createTerminalProvider(api))
    expect(() => registry.register(createTerminalProvider(api))).toThrow(/重复注册/)
  })
})
