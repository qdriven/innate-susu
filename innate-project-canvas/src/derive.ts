import type { DerivedState, ProjectSnapshot, Task } from './types.js'

export function deriveState(snapshot: ProjectSnapshot): DerivedState {
  const sprintDone = new Map(snapshot.sprints.map((sprint) => [
    sprint.id,
    snapshot.tasks.some((task) => task.sprintId === sprint.id)
      && snapshot.tasks.filter((task) => task.sprintId === sprint.id).every((task) => task.status === 'done'),
  ]))
  const tasks = new Map(snapshot.tasks.map((task) => [task.id, task]))
  const taskBlocked = new Map<string, boolean>()
  for (const task of snapshot.tasks) {
    taskBlocked.set(task.id, task.blockedBy.some((id) => {
      if (sprintDone.has(id)) return !sprintDone.get(id)
      return tasks.get(id)?.status !== 'done'
    }))
  }
  const readyTaskIds = snapshot.tasks
    .filter((task) => task.status !== 'done' && task.status !== 'optional' && task.status !== 'debt' && !taskBlocked.get(task.id))
    .map((task) => task.id)
  return { sprintDone, taskBlocked, readyTaskIds, nextTaskId: readyTaskIds[0] }
}

export function taskStateLabel(task: Task, derived: DerivedState): string {
  if (task.status === 'done') return '已完成'
  if (derived.nextTaskId === task.id) return '下一项'
  if (task.status === 'partial') return derived.taskBlocked.get(task.id) ? '部分完成 · 阻塞' : '部分完成'
  if (task.status === 'optional') return '独立可选'
  if (task.status === 'debt') return '技术债'
  return derived.taskBlocked.get(task.id) ? '被阻塞' : '可执行'
}
