import { describe, it, expect } from 'vitest'
import { Container } from './container.js'
import { LifecycleManager } from './lifecycle.js'
import type { Plugin } from './plugin-types.js'

function createPlugin(id: string, apply: Plugin['apply']): Plugin {
  return { id, apply }
}

describe('LifecycleManager', () => {
  it('activates a plugin and sets state to active', async () => {
    const c = new Container()
    const lm = new LifecycleManager(c)
    const plugin = createPlugin('test', () => {})
    await lm.activate(plugin)
    expect(lm.getState('test')).toBe('active')
  })

  it('runs effects on deactivate in reverse order', async () => {
    const c = new Container()
    const lm = new LifecycleManager(c)
    const order: number[] = []
    const plugin = createPlugin('test', (ctx) => {
      ctx.effect(() => { order.push(1) })
      ctx.effect(() => { order.push(2) })
      ctx.effect(() => { order.push(3) })
    })
    await lm.activate(plugin)
    await lm.deactivate('test')
    expect(order).toEqual([3, 2, 1])
  })

  it('catches plugin errors and sets state to error', async () => {
    const c = new Container()
    const lm = new LifecycleManager(c)
    const plugin = createPlugin('failing', () => {
      throw new Error('boom')
    })
    await expect(lm.activate(plugin)).rejects.toThrow('boom')
    expect(lm.getState('failing')).toBe('error')
  })

  it('cleans up effects when plugin fails during activation', async () => {
    const c = new Container()
    const lm = new LifecycleManager(c)
    let effectRan = false
    const plugin = createPlugin('partial', (ctx) => {
      ctx.effect(() => {
        effectRan = true
      })
      throw new Error('fail after effect')
    })
    await expect(lm.activate(plugin)).rejects.toThrow('fail after effect')
    expect(effectRan).toBe(true)
  })

  it('activate is idempotent', async () => {
    const c = new Container()
    const lm = new LifecycleManager(c)
    let count = 0
    const plugin = createPlugin('idem', () => {
      count++
    })
    await lm.activate(plugin)
    await lm.activate(plugin)
    expect(count).toBe(1)
  })

  it('allows re-activation after deactivation', async () => {
    const c = new Container()
    const lm = new LifecycleManager(c)
    let count = 0
    const plugin = createPlugin('react', () => {
      count++
    })
    await lm.activate(plugin)
    await lm.deactivate('react')
    await lm.activate(plugin)
    expect(count).toBe(2)
    expect(lm.getState('react')).toBe('active')
  })

  it('ignores errors in individual effect callbacks', async () => {
    const c = new Container()
    const lm = new LifecycleManager(c)
    const ran: string[] = []
    const plugin = createPlugin('eff', (ctx) => {
      ctx.effect(() => {
        ran.push('first')
      })
      ctx.effect(() => {
        throw new Error('effect error')
      })
      ctx.effect(() => {
        ran.push('third')
      })
    })
    await lm.activate(plugin)
    await lm.deactivate('eff')
    expect(ran).toEqual(['third', 'first'])
  })
})
