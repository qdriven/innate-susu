import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { EvidenceRef, Sprint, Task, TaskStatus } from './types.js'
import { repoPath, resolveEvidencePath, sha256File, stripMarkdown, uniqueBy } from './utils.js'

const TASK_HEADING = /^## (T(?:\d+\.\d+|[A-Z]+\.\d+))\s+(.+)$/
const REFERENCE_ID = /\b(?:T\d+\.\d+|T[A-Z]+\.\d+|S\d+)\b/g
const FIELD = /^- \*\*(状态|做什么|功能|如何验证|预估 \/ 依赖)\*\*[：:]\s*(.*)$/

function taskStatus(value: string | undefined): TaskStatus {
  if (value?.includes('已完成')) return 'done'
  if (value?.includes('部分完成')) return 'partial'
  return 'todo'
}

function defaultStatus(sprintId: string): TaskStatus {
  if (sprintId === 'S5') return 'optional'
  if (sprintId === 'S6') return 'debt'
  return 'todo'
}

function evidenceStatus(root: string, path: string): EvidenceRef['status'] {
  const absolute = resolveEvidencePath(root, path)
  if (!absolute) return 'missing'
  const stat = statSync(absolute)
  if (stat.isFile()) return 'verified'
  if (stat.isDirectory()) return readdirSync(absolute).length > 0 ? 'verified' : 'unverified'
  return 'unverified'
}

function extractEvidence(root: string, body: string): EvidenceRef[] {
  const paths: string[] = []
  for (const match of body.matchAll(/`([^`]*evidence[^`]*)`/gi)) {
    const raw = match[1].trim()
    if (/[<>*]/.test(raw)) continue
    const path = raw.startsWith('evidence/')
      ? `docs/plans/innate-dogic-dsh/${raw}`
      : (raw.startsWith('docs/plans/innate-dogic-dsh/') || raw.startsWith('docs/susu/plan/evidence/')) && raw.includes('/evidence/')
        ? raw
        : undefined
    if (path) paths.push(path)
  }
  return uniqueBy(paths, (path) => path).map((path) => ({
    path,
    kind: path.endsWith('/') ? 'directory' : 'file',
    status: evidenceStatus(root, path),
  }))
}

function parseTask(root: string, sprint: Sprint, lines: string[], start: number, end: number): Task {
  const heading = lines[start].match(TASK_HEADING)
  if (!heading) throw new Error(`Invalid task heading at ${sprint.source.path}:${start + 1}`)
  const [, id, title] = heading
  const bodyLines = lines.slice(start + 1, end)
  const fields = new Map<string, string>()
  let activeField: string | undefined
  for (const line of bodyLines) {
    const field = line.match(FIELD)
    if (field) {
      activeField = field[1]
      fields.set(activeField, field[2].trim())
    } else if (activeField && line.trim() && !line.startsWith('## ')) {
      fields.set(activeField, `${fields.get(activeField) ?? ''}\n${line.trim()}`.trim())
    }
  }
  const dependencyField = fields.get('预估 / 依赖') ?? ''
  const separator = dependencyField.indexOf('/')
  const estimate = separator >= 0 ? dependencyField.slice(0, separator).trim() : dependencyField.trim()
  const dependencies = separator >= 0 ? dependencyField.slice(separator + 1) : ''
  const blockingClause = /^无[。.\s]/.test(dependencies.trim())
    ? ''
    : dependencies
      .split(/可与|不依赖|不等待|任意时间|建议/)[0]
      .replace(/(?:T\d+\.\d+|T[A-Z]+\.\d+|S\d+)(?:\s*、\s*(?:T\d+\.\d+|T[A-Z]+\.\d+|S\d+))*\s+可并行.*$/g, '')
  const blockedBy = uniqueBy(blockingClause.match(REFERENCE_ID) ?? [], (value) => value)
    .filter((value) => value !== id && value !== sprint.id)
  const body = bodyLines.join('\n')
  const status = fields.has('状态') ? taskStatus(fields.get('状态')) : defaultStatus(sprint.id)
  return {
    id,
    sprintId: sprint.id,
    title: title.trim(),
    status,
    summary: fields.get('做什么') ?? '',
    purpose: fields.get('功能') ?? '',
    verification: fields.get('如何验证') ?? '',
    estimate,
    blockedBy,
    evidence: extractEvidence(root, body),
    source: { ...sprint.source, line: start + 1 },
  }
}

export function parseSprints(root: string): { sprints: Sprint[]; tasks: Task[] } {
  const indexPath = join(root, 'docs/sprints/README.md')
  const lines = readFileSync(indexPath, 'utf8').split(/\r?\n/)
  const sprints: Sprint[] = []
  const tasks: Task[] = []
  for (const line of lines) {
    const match = line.match(/^\| \[(S\d+)]\(\.\/([^)]+)\) \| ([^|]+) \| [^|]+ \| ([^|]+) \| ([^|]+) \|$/)
    if (!match) continue
    const [, id, file, title, estimate, declaredStatus] = match
    const absolute = join(root, 'docs/sprints', file)
    const sprint: Sprint = {
      id,
      title: stripMarkdown(title),
      estimate: stripMarkdown(estimate),
      declaredStatus: stripMarkdown(declaredStatus),
      source: { path: repoPath(root, absolute), sha256: sha256File(absolute) },
    }
    sprints.push(sprint)
    const taskLines = readFileSync(absolute, 'utf8').split(/\r?\n/)
    const headings = taskLines.flatMap((text, index) => TASK_HEADING.test(text) ? [index] : [])
    headings.forEach((start, index) => {
      tasks.push(parseTask(root, sprint, taskLines, start, headings[index + 1] ?? taskLines.length))
    })
  }
  return { sprints, tasks }
}
