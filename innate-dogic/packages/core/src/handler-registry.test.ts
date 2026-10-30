import { describe, expect, it, vi } from 'vitest'
import { HandlerRegistry } from './handler-registry'
import type { Handler, HandlerRequest } from './handler-registry'

function makeHandler(id: string, namespace = 'process', overrides: Partial<Handler> = {}): Handler {
  return {
    descriptor: { key: 'capability', namespace, id, title: id },
    execute: async () => ({ ok: true }),
    ...overrides,
  }
}

describe('HandlerRegistry（04 §4bis 通用机制首版）', () => {
  it('注册与并列：同键多 handler 可并存，默认取第一个', () => {
    const registry = new HandlerRegistry()
    registry.register(makeHandler('a'))
    registry.register(makeHandler('b'))
    expect(registry.list('capability', 'process').map((h) => h.descriptor.id)).toEqual(['a', 'b'])
    expect(registry.resolve('capability', 'process')?.descriptor.id).toBe('a')
  })

  it('重复 id 显式失败', () => {
    const registry = new HandlerRegistry()
    registry.register(makeHandler('a'))
    expect(() => registry.register(makeHandler('a'))).toThrow(/重复注册/)
  })

  it('非法 descriptor 拒绝', () => {
    const registry = new HandlerRegistry()
    expect(() => registry.register(makeHandler('', 'x') as unknown as Handler)).toThrow()
    expect(() => registry.register({ descriptor: { key: 'bogus', namespace: 'n', id: 'i', title: 't' }, execute: async () => ({ ok: true }) } as unknown as Handler)).toThrow()
  })

  it('无 approve 的 handler 直接执行（审批挂钩仅对声明者生效）', async () => {
    const registry = new HandlerRegistry()
    const execute = vi.fn(async () => ({ ok: true }))
    registry.register(makeHandler('no-approve', 'process', { execute }))
    const result = await registry.run(registry.get('no-approve')!, {})
    expect(result.ok).toBe(true)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('approve 拒绝 → execute 不执行', async () => {
    const registry = new HandlerRegistry()
    const execute = vi.fn(async () => ({ ok: true }))
    registry.register(makeHandler('denied', 'process', { approve: async () => false, execute }))
    const result = await registry.run(registry.get('denied')!, {})
    expect(result.ok).toBe(false)
    expect(execute).not.toHaveBeenCalled()
  })

  it('approve 通过 → execute 执行并返回结果', async () => {
    const registry = new HandlerRegistry()
    const execute = vi.fn(async (_request: HandlerRequest) => ({ ok: true, detail: 'done' }))
    registry.register(makeHandler('ok', 'process', { approve: async () => true, execute }))
    const handler = registry.get('ok')!
    const result = await registry.run(handler, { cwd: '/tmp' })
    expect(result).toEqual({ ok: true, detail: 'done' })
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('approve 抛错 → 显式失败且 execute 不执行', async () => {
    const registry = new HandlerRegistry()
    const execute = vi.fn(async () => ({ ok: true }))
    registry.register(makeHandler('boom', 'process', {
      approve: async () => { throw new Error('审批器故障') },
      execute,
    }))
    const result = await registry.run(registry.get('boom')!, {})
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('审批失败')
    expect(execute).not.toHaveBeenCalled()
  })

  it('热插：unregister 摘除并 dispose，不影响其它 handler', () => {
    const registry = new HandlerRegistry()
    const dispose = vi.fn()
    registry.register(makeHandler('a', 'process', { dispose }))
    registry.register(makeHandler('b', 'process'))
    expect(registry.unregister('a')).toBe(true)
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(registry.get('a')).toBeUndefined()
    expect(registry.get('b')).toBeDefined()
    // 默认项回落到下一个并列 handler
    expect(registry.resolve('capability', 'process')?.descriptor.id).toBe('b')
    expect(registry.unregister('missing')).toBe(false)
  })

  it('dispose 清理失败不拖垮其它 handler', () => {
    const registry = new HandlerRegistry()
    registry.register(makeHandler('bad', 'process', {
      dispose: () => { throw new Error('清理炸了') },
    }))
    registry.register(makeHandler('good', 'process'))
    expect(() => registry.unregister('bad')).not.toThrow()
    expect(registry.get('good')).toBeDefined()
  })

  it('键空间隔离：不同 key/namespace 互不干扰', () => {
    const registry = new HandlerRegistry()
    registry.register(makeHandler('p1', 'process'))
    registry.register(makeHandler('fw1', 'firmware'))
    registry.register({ descriptor: { key: 'content', namespace: 'markdown', id: 'md', title: 'md' }, execute: async () => ({ ok: true }) })
    expect(registry.list('capability', 'process').map((h) => h.descriptor.id)).toEqual(['p1'])
    expect(registry.list('capability', 'firmware').map((h) => h.descriptor.id)).toEqual(['fw1'])
    expect(registry.list('content').map((h) => h.descriptor.id)).toEqual(['md'])
    expect(registry.resolve('content', 'markdown')?.descriptor.id).toBe('md')
  })
})
