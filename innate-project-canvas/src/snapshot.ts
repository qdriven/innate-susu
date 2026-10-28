import { readFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { collectModules } from './modules.js'
import { parseSprints } from './markdown.js'
import type { ModuleEdge, ModuleNode, ProjectSnapshot, SourceRef } from './types.js'
import { uniqueBy } from './utils.js'

export interface BuildSnapshotOptions {
  root: string
  targetArchitecture?: string
  project?: string
}

interface TargetArchitecture {
  modules: ModuleNode[]
  moduleEdges: ModuleEdge[]
}

export function buildSnapshot(options: BuildSnapshotOptions): ProjectSnapshot {
  const root = resolve(options.root)
  const { sprints, tasks } = parseSprints(root)
  const current = collectModules(root)
  const modules = [...current.modules]
  const moduleEdges = [...current.moduleEdges]
  const targetSources: SourceRef[] = []
  if (options.targetArchitecture) {
    const path = isAbsolute(options.targetArchitecture)
      ? options.targetArchitecture
      : resolve(root, options.targetArchitecture)
    const target = JSON.parse(readFileSync(path, 'utf8')) as TargetArchitecture
    modules.push(...target.modules.map((module) => ({ ...module, presence: 'target' as const })))
    moduleEdges.push(...target.moduleEdges)
    targetSources.push(...target.modules.map((module) => module.source))
  }
  const sources = uniqueBy([
    ...sprints.map((sprint) => sprint.source),
    ...current.modules.map((module) => module.source),
    ...targetSources,
  ], (source) => source.path)
  return {
    schemaVersion: '1.0.0',
    project: options.project ?? 'innate-labs',
    generatedAt: new Date().toISOString(),
    sources,
    sprints,
    tasks,
    modules,
    moduleEdges,
  }
}

export function readSnapshot(path: string): ProjectSnapshot {
  const value = JSON.parse(readFileSync(path, 'utf8')) as unknown
  if (value === null || typeof value !== 'object') throw new Error('Snapshot must be a JSON object')
  const candidate = value as Partial<ProjectSnapshot>
  if (candidate.schemaVersion !== '1.0.0') throw new Error('Unsupported or missing schemaVersion')
  for (const field of ['sources', 'sprints', 'tasks', 'modules', 'moduleEdges'] as const) {
    if (!Array.isArray(candidate[field])) throw new Error(`Snapshot field ${field} must be an array`)
  }
  if (typeof candidate.project !== 'string' || typeof candidate.generatedAt !== 'string') {
    throw new Error('Snapshot project and generatedAt must be strings')
  }
  return candidate as ProjectSnapshot
}

export function defaultOutputDirectory(root: string): string {
  return join(root, 'innate-project-canvas/out')
}
