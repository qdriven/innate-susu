export const TASK_STATUSES = ['done', 'partial', 'todo', 'optional', 'debt'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export type ModuleLayer = 'app' | 'plugin' | 'package' | 'service' | 'site' | 'tool' | 'external'
export type Presence = 'current' | 'target'
export type EdgeView = 'current' | 'target' | 'both'
export type EvidenceStatus = 'verified' | 'missing' | 'unverified'

export interface SourceRef {
  path: string
  line?: number
  sha256?: string
}

export interface EvidenceRef {
  path: string
  kind: 'file' | 'directory'
  status: EvidenceStatus
}

export interface Sprint {
  id: string
  title: string
  estimate: string
  declaredStatus: string
  source: SourceRef
}

export interface Task {
  id: string
  sprintId: string
  title: string
  status: TaskStatus
  summary: string
  purpose: string
  verification: string
  estimate: string
  blockedBy: string[]
  evidence: EvidenceRef[]
  source: SourceRef
}

export interface ModuleNode {
  id: string
  name: string
  packageName: string
  path: string
  layer: ModuleLayer
  presence: Presence
  source: SourceRef
}

export interface ModuleEdge {
  source: string
  target: string
  label: string
  view: EdgeView
}

export interface ProjectSnapshot {
  schemaVersion: '1.0.0'
  project: string
  generatedAt: string
  sources: SourceRef[]
  sprints: Sprint[]
  tasks: Task[]
  modules: ModuleNode[]
  moduleEdges: ModuleEdge[]
}

export interface AuditIssue {
  code: string
  severity: 'error' | 'warning' | 'info'
  message: string
  subject?: string
  source?: SourceRef
}

export interface DriftChange {
  kind: 'task' | 'module' | 'edge' | 'source'
  subject: string
  change: string
  before?: string
  after?: string
}

export interface AuditReport {
  schemaVersion: '1.0.0'
  generatedAt: string
  snapshotHash: string
  summary: {
    sprints: number
    tasks: number
    modules: number
    errors: number
    warnings: number
    driftChanges: number
  }
  issues: AuditIssue[]
  drift: DriftChange[]
}

export interface DerivedState {
  sprintDone: Map<string, boolean>
  taskBlocked: Map<string, boolean>
  readyTaskIds: string[]
  nextTaskId?: string
}
