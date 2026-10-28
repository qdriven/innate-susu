import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { relative, sep } from 'node:path'
import type { ProjectSnapshot } from './types.js'

export function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function snapshotHash(snapshot: ProjectSnapshot): string {
  const { generatedAt: _generatedAt, ...content } = snapshot
  return createHash('sha256').update(stableStringify(content)).digest('hex')
}

export function repoPath(root: string, path: string): string {
  return relative(root, path).split(sep).join('/')
}

export function stripMarkdown(value: string): string {
  return value.replace(/\*\*/g, '').replace(/\[([^\]]+)]\([^)]+\)/g, '$1').trim()
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const id = key(item)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'zh-CN', { numeric: true })
}

/** 证据路径多基解析：投影根可能深于仓库根（如 docs/susu/plan/canvas），
 * 证据引用是仓库根相对路径——依次在 root 及 1–4 级祖先上探测。 */
export function resolveEvidencePath(root: string, rel: string): string | undefined {
  const bases = [root, join(root, '..'), join(root, '../..'), join(root, '../../..'), join(root, '../../../..')]
  for (const base of bases) {
    const abs = join(base, rel)
    if (existsSync(abs)) return abs
  }
  return undefined
}
