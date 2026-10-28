import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'

const execFileAsync = promisify(execFile)

/** 检查命令是否可用（win: where，其余: which） */
export async function commandExists(cmd: string): Promise<string | undefined> {
  const finder = process.platform === 'win32' ? 'where' : 'which'
  try {
    const { stdout } = await execFileAsync(finder, [cmd], { timeout: 5000 })
    const first = stdout.split(/\r?\n/).find((l) => l.trim().length > 0)
    return first?.trim()
  } catch {
    return undefined
  }
}

export function homeDir(): string {
  return os.homedir()
}
