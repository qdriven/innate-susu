import type { DriftChange, ProjectSnapshot } from './types.js'
import { stableStringify } from './utils.js'

function mapById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]))
}

export function diffSnapshots(before: ProjectSnapshot, after: ProjectSnapshot): DriftChange[] {
  const changes: DriftChange[] = []
  const beforeTasks = mapById(before.tasks)
  const afterTasks = mapById(after.tasks)
  for (const [id, task] of afterTasks) {
    const previous = beforeTasks.get(id)
    if (!previous) {
      changes.push({ kind: 'task', subject: id, change: 'added', after: task.title })
      continue
    }
    if (previous.status !== task.status) {
      changes.push({ kind: 'task', subject: id, change: 'status', before: previous.status, after: task.status })
    }
    if (stableStringify(previous.blockedBy) !== stableStringify(task.blockedBy)) {
      changes.push({ kind: 'task', subject: id, change: 'dependencies', before: previous.blockedBy.join(', '), after: task.blockedBy.join(', ') })
    }
    if (previous.verification !== task.verification) {
      changes.push({ kind: 'task', subject: id, change: 'verification changed' })
    }
  }
  for (const id of beforeTasks.keys()) {
    if (!afterTasks.has(id)) changes.push({ kind: 'task', subject: id, change: 'removed' })
  }
  const beforeModules = mapById(before.modules)
  const afterModules = mapById(after.modules)
  for (const [id, module] of afterModules) {
    const previous = beforeModules.get(id)
    if (!previous) changes.push({ kind: 'module', subject: id, change: 'added', after: module.presence })
    else if (previous.presence !== module.presence) {
      changes.push({ kind: 'module', subject: id, change: 'presence', before: previous.presence, after: module.presence })
    }
  }
  for (const id of beforeModules.keys()) {
    if (!afterModules.has(id)) changes.push({ kind: 'module', subject: id, change: 'removed' })
  }
  const edgeKey = (edge: ProjectSnapshot['moduleEdges'][number]): string => `${edge.source}|${edge.target}|${edge.view}`
  const beforeEdges = new Map(before.moduleEdges.map((edge) => [edgeKey(edge), edge]))
  const afterEdges = new Map(after.moduleEdges.map((edge) => [edgeKey(edge), edge]))
  for (const [key, edge] of afterEdges) {
    if (!beforeEdges.has(key)) changes.push({ kind: 'edge', subject: `${edge.source} → ${edge.target}`, change: 'added', after: edge.view })
  }
  for (const [key, edge] of beforeEdges) {
    if (!afterEdges.has(key)) changes.push({ kind: 'edge', subject: `${edge.source} → ${edge.target}`, change: 'removed', before: edge.view })
  }
  const beforeSources = new Map(before.sources.map((source) => [source.path, source.sha256]))
  const afterSources = new Map(after.sources.map((source) => [source.path, source.sha256]))
  for (const [path, hash] of afterSources) {
    if (beforeSources.has(path) && beforeSources.get(path) !== hash) {
      changes.push({ kind: 'source', subject: path, change: 'content changed', before: beforeSources.get(path), after: hash })
    }
  }
  return changes
}
