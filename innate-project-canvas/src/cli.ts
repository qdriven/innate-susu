#!/usr/bin/env node
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { buildSnapshot, defaultOutputDirectory, readSnapshot } from './snapshot.js'
import { createAuditReport } from './validate.js'
import { diffSnapshots } from './drift.js'
import { renderSidebarHtml } from './render-sidebar.js'
import type { AuditReport, ProjectSnapshot } from './types.js'

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function defaultRoot(): string {
  const cwd = process.cwd()
  try {
    const packageJson = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8')) as { name?: string }
    if (packageJson.name === '@innate-labs/project-canvas') return resolve(cwd, '../..')
  } catch {
    // The workspace root does not need a package marker beyond package.json itself.
  }
  return cwd
}

function writeText(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  writeFileSync(temporary, content, 'utf8')
  renameSync(temporary, path)
}

function writeJson(path: string, value: unknown): void {
  writeText(path, `${JSON.stringify(value, null, 2)}\n`)
}

function printReport(report: AuditReport): void {
  console.log(`快照 ${report.snapshotHash.slice(0, 16)} · ${report.summary.tasks} 任务 · ${report.summary.modules} 模块`)
  console.log(`审计：${report.summary.errors} 错误，${report.summary.warnings} 警告，${report.summary.driftChanges} 项漂移`)
  for (const item of report.issues) console.log(`[${item.severity}] ${item.code}: ${item.message}`)
}

function makeReport(snapshot: ProjectSnapshot, root: string, previousPath?: string): AuditReport {
  const drift = previousPath ? diffSnapshots(readSnapshot(resolve(previousPath)), snapshot) : []
  return createAuditReport(snapshot, root, drift)
}

function usage(): void {
  console.log(`innate-project-canvas <command> [options]

命令：
  audit [--root DIR] [--previous SNAPSHOT] [--output REPORT]
  sync [--root DIR] [--out DIR] [--target FILE] [--allow-unverified]
  validate SNAPSHOT [--root DIR]
  diff BEFORE AFTER
  render SNAPSHOT [--root DIR] [--out DIR] [--allow-unverified]

sync 默认拒绝发布含审计错误的快照；--allow-unverified 仅用于生成带错误标记的预览。`)
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2)
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    usage()
    return
  }
  const root = resolve(option(args, '--root') ?? defaultRoot())
  if (command === 'audit') {
    const snapshot = buildSnapshot({ root, targetArchitecture: option(args, '--target') })
    const report = makeReport(snapshot, root, option(args, '--previous'))
    const output = option(args, '--output')
    if (output) writeJson(resolve(output), report)
    printReport(report)
    if (report.summary.errors > 0) process.exitCode = 1
    return
  }
  if (command === 'sync') {
    const snapshot = buildSnapshot({ root, targetArchitecture: option(args, '--target') })
    const report = makeReport(snapshot, root, option(args, '--previous'))
    const allowed = args.includes('--allow-unverified') || report.summary.errors === 0
    if (!allowed) {
      printReport(report)
      console.error('同步已停止。修复审计错误，或仅为预览显式使用 --allow-unverified。')
      process.exitCode = 1
      return
    }
    const output = resolve(option(args, '--out') ?? defaultOutputDirectory(root))
    writeJson(resolve(output, 'project-snapshot.json'), snapshot)
    writeJson(resolve(output, 'audit.json'), report)
    writeText(resolve(output, 'index.html'), renderSidebarHtml(snapshot, report))
    printReport(report)
    console.log(`已生成：${output}`)
    if (report.summary.errors > 0) process.exitCode = 1
    return
  }
  if (command === 'validate') {
    const path = args[0]
    if (!path) throw new Error('validate requires a snapshot path')
    const snapshot = readSnapshot(resolve(path))
    const report = createAuditReport(snapshot, root)
    printReport(report)
    if (report.summary.errors > 0) process.exitCode = 1
    return
  }
  if (command === 'diff') {
    const [before, after] = args
    if (!before || !after) throw new Error('diff requires before and after snapshot paths')
    const drift = diffSnapshots(readSnapshot(resolve(before)), readSnapshot(resolve(after)))
    console.log(JSON.stringify(drift, null, 2))
    console.log(`${drift.length} 项变化`)
    if (drift.length > 0) process.exitCode = 1
    return
  }
  if (command === 'render') {
    const path = args[0]
    if (!path) throw new Error('render requires a snapshot path')
    const snapshot = readSnapshot(resolve(path))
    const report = createAuditReport(snapshot, root)
    if (report.summary.errors > 0 && !args.includes('--allow-unverified')) {
      printReport(report)
      process.exitCode = 1
      return
    }
    const output = resolve(option(args, '--out') ?? defaultOutputDirectory(root))
    writeText(resolve(output, 'index.html'), renderSidebarHtml(snapshot, report))
    writeJson(resolve(output, 'audit.json'), report)
    printReport(report)
    console.log(`已生成：${resolve(output, 'index.html')}`)
    if (report.summary.errors > 0) process.exitCode = 1
    return
  }
  throw new Error(`Unknown command: ${command}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 2
})
