import { describe, it, expect } from 'vitest'
import { WorkbenchHost } from './workbench-host.js'

describe('WorkbenchHost', () => {
  it('registers and lists panels', () => {
    const host = new WorkbenchHost()
    host.registerPanel({ id: 'p1', title: 'Panel 1' }, () => null)
    const panels = host.listPanels()
    expect(panels).toHaveLength(1)
    expect(panels[0].id).toBe('p1')
  })

  it('unregisters a panel', () => {
    const host = new WorkbenchHost()
    host.registerPanel({ id: 'p1', title: 'Panel 1' }, () => null)
    host.unregisterPanel('p1')
    expect(host.listPanels()).toHaveLength(0)
  })

  it('throws when registering duplicate panel id', () => {
    const host = new WorkbenchHost()
    host.registerPanel({ id: 'p1', title: 'Panel 1' }, () => null)
    expect(() => host.registerPanel({ id: 'p1', title: 'Panel 1' }, () => null)).toThrow()
  })

  it('notifies listeners on panel change', () => {
    const host = new WorkbenchHost()
    let called = false
    host.onChange(() => {
      called = true
    })
    host.registerPanel({ id: 'p1', title: 'Panel 1' }, () => null)
    expect(called).toBe(true)
  })

  it('getPanel returns registration', () => {
    const host = new WorkbenchHost()
    const comp = () => null
    host.registerPanel({ id: 'p1', title: 'Panel 1' }, comp)
    const reg = host.getPanel('p1')
    expect(reg?.component).toBe(comp)
  })
})
