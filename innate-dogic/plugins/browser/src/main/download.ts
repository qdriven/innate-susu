/**
 * browser 下载策略（W5.5）：受控下载——路径只由用户经系统保存对话框确认。
 *
 * - 下载不自动写入默认目录：savePath 一律由系统保存对话框结果决定
 *   （electron-view 接线）；本模块不提供任何隐式路径决策；
 * - 展示字段脱敏：文件名经 sanitizeDownloadFilename 净化（剥离路径分隔符/
 *   控制字符/保留名），来源只记 origin，不含页面 URL/凭据；
 * - 不自动执行下载内容：策略层无执行通道（下载内容仅落盘用户选定位置）。
 */
import type { DownloadState, DownloadStatus } from '../shared/index.js'

export type { DownloadState, DownloadStatus } from '../shared/index.js'

/** 文件名长度上限。 */
export const MAX_DOWNLOAD_FILENAME = 120

/** Windows 保留设备名（CON/PRN/AUX/NUL/COM1-9/LPT1-9），保存会失败。 */
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?=\.|$)/i

/** 控制字符（含 DEL 与 C1 区）判定：只保留可打印字符。 */
function isPrintableChar(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code >= 32 && code !== 127 && (code < 128 || code > 159)
}

/**
 * 文件名净化（防御性）：剥离路径分隔符与控制字符、折叠空白、截断超长、
 * 保留名加后缀、空名兜底。下载内容只落用户选定路径，此处防止恶意
 * Content-Disposition 文件名污染展示与默认名。
 */
export function sanitizeDownloadFilename(input: string): string {
  const base = [...input]
    .filter(isPrintableChar)
    .join('')
    .replace(/[\\/]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DOWNLOAD_FILENAME)
  if (base.length === 0) return 'download'
  return WINDOWS_RESERVED.test(base) ? base.replace(WINDOWS_RESERVED, '$1_') : base
}

/**
 * 下载状态映射：Electron DownloadItem 状态 → 展示状态。
 * 'completed' → completed；'cancelled'（含保存对话框取消）→ cancelled；
 * 'interrupted'（无法恢复的中断）→ failed；'progressing' 理论上只出现在
 * done 之前，防御性映射为 failed（done 终态映射不接受中间态）。
 */
export function mapDownloadItemState(
  itemState: 'completed' | 'cancelled' | 'interrupted' | 'progressing',
): DownloadState {
  if (itemState === 'completed') return 'completed'
  if (itemState === 'cancelled') return 'cancelled'
  return 'failed'
}

/** 进度归一：0–100 取整；未知总量（0）按 0 处理，避免除零。 */
export function normalizeDownloadPercent(percent: number): number {
  if (!Number.isFinite(percent) || percent < 0) return 0
  return Math.min(100, Math.round(percent))
}
