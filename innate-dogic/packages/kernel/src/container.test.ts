import { describe, it, expect, vi } from 'vitest'
import {
  Container,
  CircularDependencyError,
  ServiceNotFoundError,
} from './container.js'

describe('Container', () => {
  it('registers and resolves a service', () => {
    const c = new Container()
    c.register('foo', () => 'bar')
    expect(c.resolve<string>('foo')).toBe('bar')
  })

  it('resolves with dependencies', () => {
    const c = new Container()
    c.register('a', () => 1)
    c.register('b', (ctx) => ctx.resolve<number>('a') + 1)
    expect(c.resolve<number>('b')).toBe(2)
  })

  it('throws ServiceNotFoundError for unregistered services', () => {
    const c = new Container()
    expect(() => c.resolve('missing')).toThrow(ServiceNotFoundError)
  })

  it('detects circular dependencies', () => {
    const c = new Container()
    c.register('a', (ctx) => ctx.resolve('b'))
    c.register('b', (ctx) => ctx.resolve('a'))
    expect(() => c.resolve('a')).toThrow(CircularDependencyError)
  })

  it('caches instances (singleton)', () => {
    const c = new Container()
    const factory = vi.fn(() => ({}))
    c.register('obj', factory)
    const a = c.resolve('obj')
    const b = c.resolve('obj')
    expect(a).toBe(b)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('registerInstance registers a pre-built instance', () => {
    const c = new Container()
    const obj = { x: 1 }
    c.registerInstance('obj', obj)
    expect(c.resolve('obj')).toBe(obj)
  })

  it('onDispose callbacks run on dispose', async () => {
    const c = new Container()
    const cb = vi.fn()
    c.onDispose(cb)
    await c.dispose()
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('dispose callbacks run in reverse order', async () => {
    const c = new Container()
    const order: number[] = []
    c.onDispose(() => { order.push(1) })
    c.onDispose(() => { order.push(2) })
    c.onDispose(() => { order.push(3) })
    await c.dispose()
    expect(order).toEqual([3, 2, 1])
  })

  it('has() returns correct values', () => {
    const c = new Container()
    c.register('a', () => 1)
    expect(c.has('a')).toBe(true)
    expect(c.has('b')).toBe(false)
  })

  it('list() returns all registered service ids', () => {
    const c = new Container()
    c.register('a', () => 1)
    c.register('b', () => 2)
    expect(c.list().sort()).toEqual(['a', 'b'])
  })

  it('resolveAsync works with async factories', async () => {
    const c = new Container()
    c.register('async', async () => {
      await new Promise((r) => setTimeout(r, 10))
      return 42
    })
    const result = await c.resolveAsync<number>('async')
    expect(result).toBe(42)
  })
})
