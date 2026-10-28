import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { ModuleEdge, ModuleLayer, ModuleNode } from './types.js'
import { repoPath, sha256File } from './utils.js'

interface PackageJson {
  name?: string
  dependencies?: Record<string, string>
}

const GROUPS: Array<{ path: string; layer: ModuleLayer }> = [
  { path: 'innate-dogic/apps', layer: 'app' },
  { path: 'innate-dogic/plugins', layer: 'plugin' },
  { path: 'innate-dogic/packages', layer: 'package' },
  { path: 'innate-dogic/services', layer: 'service' },
  { path: 'sites', layer: 'site' },
]

function readModule(root: string, absolute: string, layer: ModuleLayer): ModuleNode | undefined {
  const packagePath = join(absolute, 'package.json')
  if (!existsSync(packagePath)) return undefined
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as PackageJson
  if (!packageJson.name) return undefined
  const path = repoPath(root, absolute)
  return {
    id: packageJson.name,
    name: path.split('/').at(-1) ?? packageJson.name,
    packageName: packageJson.name,
    path,
    layer,
    presence: 'current',
    source: { path: repoPath(root, packagePath), sha256: sha256File(packagePath) },
  }
}

export function collectModules(root: string): { modules: ModuleNode[]; moduleEdges: ModuleEdge[] } {
  const modules: ModuleNode[] = []
  for (const group of GROUPS) {
    const absolute = join(root, group.path)
    if (!existsSync(absolute)) continue
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const module = readModule(root, join(absolute, entry.name), group.layer)
      if (module) modules.push(module)
    }
  }
  for (const [path, layer] of [['tools', 'tool'], ['innate-project-canvas', 'tool']] as const) {
    const module = readModule(root, join(root, path), layer)
    if (module) modules.push(module)
  }
  const ids = new Set(modules.map((module) => module.id))
  const moduleEdges: ModuleEdge[] = []
  for (const module of modules) {
    const packageJson = JSON.parse(readFileSync(join(root, module.path, 'package.json'), 'utf8')) as PackageJson
    for (const dependency of Object.keys(packageJson.dependencies ?? {})) {
      if (ids.has(dependency)) {
        moduleEdges.push({ source: module.id, target: dependency, label: 'runtime dependency', view: 'current' })
      }
    }
  }
  return { modules, moduleEdges }
}
