import { describe, it, expect } from 'vitest'
import { SettingsHost } from './settings-host.js'

describe('SettingsHost', () => {
  it('registers a group with default values', () => {
    const host = new SettingsHost()
    host.registerGroup({
      id: 'g1',
      title: 'Group 1',
      fields: [
        { key: 'name', label: 'Name', type: 'text', defaultValue: 'default' },
      ],
    })
    expect(host.get('g1.name')).toBe('default')
  })

  it('sets and gets values', () => {
    const host = new SettingsHost()
    host.set('foo', 'bar')
    expect(host.get('foo')).toBe('bar')
  })

  it('notifies change listeners', () => {
    const host = new SettingsHost()
    let received: unknown
    host.onChange('foo', (v) => {
      received = v
    })
    host.set('foo', 42)
    expect(received).toBe(42)
  })

  it('lists groups', () => {
    const host = new SettingsHost()
    host.registerGroup({ id: 'g1', title: 'G1', fields: [] })
    host.registerGroup({ id: 'g2', title: 'G2', fields: [] })
    expect(host.listGroups()).toHaveLength(2)
  })

  it('throws on duplicate group registration', () => {
    const host = new SettingsHost()
    host.registerGroup({ id: 'g1', title: 'G1', fields: [] })
    expect(() => host.registerGroup({ id: 'g1', title: 'G1', fields: [] })).toThrow()
  })
})
