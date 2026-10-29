import type { ConsoleStatusEvent, GatewayStatusEvent } from '@dogic/core'
// 浏览器安全子路径：core 主入口面向 Node，renderer 只吃脱敏纯函数。
import { redactLaunchSecrets } from '@dogic/core/redact'

export type PillTone = 'ok' | 'warn' | 'bad' | 'dim'

export interface StatusPillView {
  label: string
  hint?: string
  /** 诊断细节：仅进 title tooltip（dev 可见），不进文案 */
  detail?: string
  tone: PillTone
  /** 点击动作：'start' = 启动网关（未运行/可恢复错误时） */
  action?: 'start'
}

/** 网关状态 → pill 视图：四态 + 下一步 hint（未安装/未接线/断开/超时）。 */
export function gatewayPill(status: GatewayStatusEvent): StatusPillView {
  switch (status.state) {
    case 'running':
      return { label: '网关运行中', hint: '网关已就绪', tone: 'ok' }
    case 'starting':
      return { label: '网关启动中…', hint: '正在等待网关就绪', tone: 'warn' }
    case 'not-installed':
      return { label: 'magpie 未安装', hint: '安装 magpie 后重启宿主', tone: 'bad' }
    case 'not-running':
      return { label: '网关未运行', hint: '点击启动 magpie 网关', tone: 'warn', action: 'start' }
    case 'error': {
      return {
        label: '网关异常',
        hint: status.recoverable ? '可重试：点击启动' : '需重新安装 magpie',
        detail: status.message ? redactLaunchSecrets(status.message) : undefined,
        tone: 'bad',
        action: status.recoverable ? 'start' : undefined,
      }
    }
  }
}

/** 控制台生命周期 → pill 视图（与网关 pill 区分，不混用单个"在线"掩盖部分失败）。 */
export function consolePill(status: ConsoleStatusEvent): StatusPillView {
  switch (status.phase) {
    case 'running':
      return { label: '控制台运行中', tone: 'ok' }
    case 'starting':
      return { label: '控制台启动中…', tone: 'warn' }
    case 'failed':
      return {
        label: '控制台失败',
        hint: '可在设置页重试',
        detail: redactLaunchSecrets(status.message),
        tone: 'bad',
      }
    case 'stopped':
      return { label: '控制台已停止', hint: '可在设置页重新连接', tone: 'dim' }
    case 'idle':
      return { label: '控制台未运行', tone: 'dim' }
  }
}
