/**
 * magpie 探测。
 *
 * 找到 binary（PATH/常见安装路径/注册表），输出版本与最低版本校验。
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { execFile } from 'node:child_process'

export interface MagpieDetection {
  found: boolean
  path?: string
  version?: string
  satisfiesMinimum: boolean
}

/** 最低支持版本 */
export const MIN_MAGPIE_VERSION = '0.1.0'

/** 常见安装路径 */
const COMMON_PATHS: Record<string, string[]> = {
  win32: [
    path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'magpie', 'magpie.exe'),
    path.join(process.env.PROGRAMFILES ?? '', 'magpie', 'magpie.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] ?? '', 'magpie', 'magpie.exe'),
  ],
  darwin: [
    '/usr/local/bin/magpie',
    '/opt/homebrew/bin/magpie',
    path.join(process.env.HOME ?? '', '.local', 'bin', 'magpie'),
  ],
  linux: [
    '/usr/local/bin/magpie',
    '/usr/bin/magpie',
    path.join(process.env.HOME ?? '', '.local', 'bin', 'magpie'),
    path.join(process.env.HOME ?? '', 'go', 'bin', 'magpie'),
  ],
}

/**
 * 探测 magpie 安装。
 */
export async function detectMagpie(minVersion: string = MIN_MAGPIE_VERSION): Promise<MagpieDetection> {
  // 1. PATH 查找
  const fromPath = await findInPath()
  if (fromPath) {
    return validateBinary(fromPath, minVersion)
  }

  // 2. 常见安装路径
  const platformPaths = COMMON_PATHS[process.platform] ?? []
  for (const p of platformPaths) {
    if (fs.existsSync(p)) {
      return validateBinary(p, minVersion)
    }
  }

  return { found: false, satisfiesMinimum: false }
}

/**
 * 在 PATH 中查找 magpie。
 */
function findInPath(): Promise<string | null> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    execFile(cmd, ['magpie'], { timeout: 5000 }, (error, stdout) => {
      if (error) {
        resolve(null)
        return
      }
      const lines = stdout.trim().split(/\r?\n/).filter(Boolean)
      if (lines.length > 0) {
        resolve(lines[0].trim())
      } else {
        resolve(null)
      }
    })
  })
}

/**
 * 验证二进制文件并获取版本。
 */
function validateBinary(binaryPath: string, minVersion: string): Promise<MagpieDetection> {
  return new Promise((resolve) => {
    execFile(binaryPath, ['--version'], { timeout: 5000 }, (error, stdout) => {
      if (error) {
        resolve({ found: false, satisfiesMinimum: false })
        return
      }
      const version = stdout.trim()
      resolve({
        found: true,
        path: binaryPath,
        version,
        satisfiesMinimum: compareVersions(version, minVersion) >= 0,
      })
    })
  })
}

/**
 * 简单的语义化版本比较。
 * 返回正数表示 a > b，负数表示 a < b，0 表示相等。
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string): number[] => {
    const cleaned = v.replace(/^v/, '').split(/[-+]/)[0]
    return cleaned.split('.').map((n) => parseInt(n, 10) || 0)
  }
  const pa = parse(a)
  const pb = parse(b)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na !== nb) return na - nb
  }
  return 0
}
