import { describe, expect, it } from 'vitest'
import { buildSnapshot } from '../src/snapshot.js'
import { deriveState } from '../src/derive.js'
import { createAuditReport, validateSnapshot } from '../src/validate.js'
import { diffSnapshots } from '../src/drift.js'
import { renderSidebarHtml } from '../src/render-sidebar.js'
import { createFixture } from './helpers.js'

describe('project canvas', () => {
  it('builds tasks, evidence, dependencies, and package edges from sources', () => {
    const root = createFixture()
    const snapshot = buildSnapshot({ root })
    expect(snapshot.tasks).toHaveLength(4)
    expect(snapshot.tasks[0].evidence[0].status).toBe('verified')
    expect(snapshot.tasks[2].blockedBy).toEqual(['T0.2'])
    expect(snapshot.tasks[3].blockedBy).toEqual([])
    expect(snapshot.moduleEdges).toEqual([
      { source: '@example/app', target: '@example/lib', label: 'runtime dependency', view: 'current' },
    ])
    expect(deriveState(snapshot).nextTaskId).toBe('T0.2')
    expect(validateSnapshot(snapshot, root)).toEqual([])
  })

  it('rejects done tasks without evidence and dependency cycles', () => {
    const root = createFixture()
    const snapshot = buildSnapshot({ root })
    snapshot.tasks[0].evidence = []
    snapshot.tasks[0].blockedBy = ['T0.3']
    snapshot.tasks[2].blockedBy = ['T0.1']
    const codes = validateSnapshot(snapshot, root).map((item) => item.code)
    expect(codes).toContain('done-evidence-missing')
    expect(codes).toContain('dependency-cycle')
  })

  it('reports semantic drift instead of generated timestamp changes', () => {
    const root = createFixture()
    const before = buildSnapshot({ root })
    const after = buildSnapshot({ root })
    after.generatedAt = new Date(Date.now() + 1000).toISOString()
    expect(diffSnapshots(before, after)).toEqual([])
    after.tasks[1].status = 'partial'
    expect(diffSnapshots(before, after)).toContainEqual({
      kind: 'task', subject: 'T0.2', change: 'status', before: 'todo', after: 'partial',
    })
  })

  it('renders escaped tasks, module views, and audit findings', () => {
    const root = createFixture()
    const snapshot = buildSnapshot({ root })
    snapshot.tasks[1].title = '<script>alert(1)</script>'
    snapshot.modules.push({
      id: '@example/future', name: 'future', packageName: '@example/future', path: '', layer: 'plugin', presence: 'target',
      source: { path: 'docs/plans/future.md' },
    })
    snapshot.moduleEdges.push({ source: '@example/app', target: '@example/future', label: 'future', view: 'target' })
    const report = createAuditReport(snapshot, root)

    const sidebar = renderSidebarHtml(snapshot, report)
    expect(sidebar).toContain('class="sidebar"')
    expect(sidebar).toContain('class="top-tab-bar"')
    expect(sidebar).toContain('data-layout="tabs"')
    expect(sidebar).toContain('data-layout="sidebar"')
    expect(sidebar).toContain('data-task-filter="action"')
    expect(sidebar).toContain('data-module-mode="target"')
    expect(sidebar).toContain('id="task-editor"')
    expect(sidebar).toContain('id="markdown-toolbar"')
    expect(sidebar).toContain('data-md-action="bold"')
    expect(sidebar).toContain('data-md-action="heading2"')
    expect(sidebar).toContain('data-md-action="taskList"')
    expect(sidebar).toContain('data-md-action="link"')
    expect(sidebar).toContain('Ctrl/⌘ Enter 保存')
    expect(sidebar).toContain('data-edit-task=')
    expect(sidebar).toContain('data-copy-task=')
    expect(sidebar).toContain('## 验收标准')
    expect(sidebar).not.toContain('classic')
    expect(sidebar).toContain('目标 · 未实现')
    expect(sidebar).toContain('审计结果')
    expect(sidebar).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(sidebar).not.toContain('<script>alert(1)</script>')
  })
})
