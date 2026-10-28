import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { deriveState } from './derive.js'
import type { AuditIssue, AuditReport, DriftChange, ProjectSnapshot } from './types.js'
import { resolveEvidencePath, snapshotHash } from './utils.js'

function issue(code: string, severity: AuditIssue['severity'], message: string, subject?: string): AuditIssue {
  return { code, severity, message, subject }
}

function duplicateIds(items: Array<{ id: string }>): string[] {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item.id, (counts.get(item.id) ?? 0) + 1)
  return [...counts].filter(([, count]) => count > 1).map(([id]) => id)
}

function dependencyCycles(nodes: Set<string>, dependencies: Map<string, string[]>): string[][] {
  const cycles: string[][] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const path: string[] = []
  const visit = (node: string): void => {
    if (visiting.has(node)) {
      const start = path.indexOf(node)
      cycles.push([...path.slice(start), node])
      return
    }
    if (visited.has(node)) return
    visiting.add(node)
    path.push(node)
    for (const next of dependencies.get(node) ?? []) if (nodes.has(next)) visit(next)
    path.pop()
    visiting.delete(node)
    visited.add(node)
  }
  for (const node of nodes) visit(node)
  return cycles
}

export function validateSnapshot(snapshot: ProjectSnapshot, root: string): AuditIssue[] {
  const issues: AuditIssue[] = []
  const sprintIds = new Set(snapshot.sprints.map((sprint) => sprint.id))
  const taskIds = new Set(snapshot.tasks.map((task) => task.id))
  const moduleIds = new Set(snapshot.modules.map((module) => module.id))
  for (const [kind, ids] of [['sprint', duplicateIds(snapshot.sprints)], ['task', duplicateIds(snapshot.tasks)], ['module', duplicateIds(snapshot.modules)]] as const) {
    for (const id of ids) issues.push(issue('duplicate-id', 'error', `${kind} ID ${id} is duplicated`, id))
  }
  for (const task of snapshot.tasks) {
    if (!sprintIds.has(task.sprintId)) issues.push(issue('unknown-sprint', 'error', `${task.id} references unknown ${task.sprintId}`, task.id))
    for (const field of ['title', 'summary', 'verification'] as const) {
      if (!task[field].trim()) issues.push(issue('missing-task-field', 'error', `${task.id} has no ${field}`, task.id))
    }
    for (const dependency of task.blockedBy) {
      if (!taskIds.has(dependency) && !sprintIds.has(dependency)) {
        issues.push(issue('unknown-dependency', 'error', `${task.id} depends on unknown ${dependency}`, task.id))
      }
    }
    if (task.status === 'done') {
      if (task.evidence.length === 0) {
        issues.push(issue('done-evidence-missing', 'error', `${task.id} is done but names no evidence artifact`, task.id))
      }
      for (const evidence of task.evidence) {
        if (evidence.status !== 'verified') {
          issues.push(issue('done-evidence-unverified', 'error', `${task.id} evidence is ${evidence.status}: ${evidence.path}`, task.id))
        }
      }
    }
    for (const evidence of task.evidence) {
      const absolute = resolveEvidencePath(root, evidence.path)
      if (!absolute) {
        if (task.status === 'done') {
          issues.push(issue('evidence-missing', 'error', `${task.id} evidence does not exist: ${evidence.path}`, task.id))
        }
        continue
      }
      const stat = statSync(absolute)
      if (evidence.kind === 'directory' && (!stat.isDirectory() || readdirSync(absolute).length === 0)) {
        issues.push(issue('evidence-empty', 'error', `${task.id} evidence directory is empty or invalid: ${evidence.path}`, task.id))
      }
      if (evidence.kind === 'file' && !stat.isFile()) {
        issues.push(issue('evidence-not-file', 'error', `${task.id} evidence is not a file: ${evidence.path}`, task.id))
      }
    }
  }
  const graphNodes = new Set([...sprintIds, ...taskIds])
  const dependencies = new Map(snapshot.tasks.map((task) => [task.id, task.blockedBy]))
  for (const cycle of dependencyCycles(graphNodes, dependencies)) {
    issues.push(issue('dependency-cycle', 'error', `Dependency cycle: ${cycle.join(' → ')}`, cycle[0]))
  }
  for (const edge of snapshot.moduleEdges) {
    if (!moduleIds.has(edge.source) || !moduleIds.has(edge.target)) {
      issues.push(issue('unknown-module-edge', 'error', `Unknown module edge ${edge.source} → ${edge.target}`))
    }
    const source = snapshot.modules.find((module) => module.id === edge.source)
    const target = snapshot.modules.find((module) => module.id === edge.target)
    if (edge.view === 'current' && (source?.presence === 'target' || target?.presence === 'target')) {
      issues.push(issue('target-as-current', 'error', `Current edge uses a target module: ${edge.source} → ${edge.target}`))
    }
  }
  for (const module of snapshot.modules) {
    if (module.presence === 'current' && !existsSync(join(root, module.source.path))) {
      issues.push(issue('module-source-missing', 'error', `${module.id} source does not exist: ${module.source.path}`, module.id))
    }
  }
  const declaredCounts = new Set<number>()
  for (const sprint of snapshot.sprints) {
    const absolute = join(root, sprint.source.path)
    if (!existsSync(absolute)) continue
    const markdown = readFileSync(absolute, 'utf8')
    for (const match of markdown.matchAll(/展示\s*(\d+)\s*张任务卡/g)) declaredCounts.add(Number(match[1]))
  }
  for (const count of declaredCounts) {
    if (count !== snapshot.tasks.length) {
      issues.push(issue('task-count-drift', 'error', `Documentation declares ${count} task cards; sources contain ${snapshot.tasks.length}`))
    }
  }
  return issues
}

export function createAuditReport(snapshot: ProjectSnapshot, root: string, drift: DriftChange[] = []): AuditReport {
  const issues = validateSnapshot(snapshot, root)
  return {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    snapshotHash: snapshotHash(snapshot),
    summary: {
      sprints: snapshot.sprints.length,
      tasks: snapshot.tasks.length,
      modules: snapshot.modules.length,
      errors: issues.filter((item) => item.severity === 'error').length,
      warnings: issues.filter((item) => item.severity === 'warning').length,
      driftChanges: drift.length,
    },
    issues,
    drift,
  }
}

export function auditHasErrors(report: AuditReport): boolean {
  return report.summary.errors > 0
}

export function readinessIssues(snapshot: ProjectSnapshot): AuditIssue[] {
  const derived = deriveState(snapshot)
  return derived.nextTaskId
    ? [issue('next-task', 'info', `Next unblocked task is ${derived.nextTaskId}`, derived.nextTaskId)]
    : []
}
