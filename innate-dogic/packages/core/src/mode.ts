import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

/** 应用模式：simple（小白）/ dev（开发工作台）。M2 T2.1 */
export type AppMode = 'simple' | 'dev'

const FILE = 'mode.json'

/** 读取持久化模式；未设置或文件损坏返回 null（首启向导据此触发） */
export function readMode(userData: string): AppMode | null {
  try {
    const data = JSON.parse(readFileSync(path.join(userData, FILE), 'utf-8')) as { mode?: string }
    return data.mode === 'simple' || data.mode === 'dev' ? data.mode : null
  } catch {
    return null
  }
}

export function writeMode(userData: string, mode: AppMode): void {
  mkdirSync(userData, { recursive: true })
  writeFileSync(path.join(userData, FILE), JSON.stringify({ mode }))
}
