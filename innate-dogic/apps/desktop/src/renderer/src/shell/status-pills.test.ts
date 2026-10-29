import { describe, expect, it } from 'vitest'
import type { ConsoleStatusEvent, GatewayStatusEvent } from '@dogic/core'
import { consolePill, gatewayPill } from './status-pills'

describe('W2.5 状态 pill 映射', () => {
  it('网关四态 + 异常态：文案与下一步 hint 显式', () => {
    expect(gatewayPill({ state: 'not-installed' })).toMatchObject({
      label: 'magpie 未安装',
      hint: '安装 magpie 后重启宿主',
      tone: 'bad',
    })
    expect(gatewayPill({ state: 'not-running' })).toMatchObject({
      label: '网关未运行',
      hint: '点击启动 magpie 网关',
      tone: 'warn',
      action: 'start',
    })
    expect(gatewayPill({ state: 'starting' })).toMatchObject({
      label: '网关启动中…',
      hint: '正在等待网关就绪',
      tone: 'warn',
    })
    expect(gatewayPill({ state: 'running' })).toMatchObject({
      label: '网关运行中',
      hint: '网关已就绪',
      tone: 'ok',
    })
  })

  it('网关异常：可恢复给重试 hint + action，不可恢复给重装 hint', () => {
    const recoverable = gatewayPill({ state: 'error', message: '启动超时', recoverable: true })
    expect(recoverable).toMatchObject({
      label: '网关异常',
      hint: '可重试：点击启动',
      tone: 'bad',
      action: 'start',
    })
    expect(recoverable.detail).toBe('启动超时')

    const unrecoverable = gatewayPill({ state: 'error', message: 'magpie 版本过旧', recoverable: false })
    expect(unrecoverable.hint).toBe('需重新安装 magpie')
    expect(unrecoverable.action).toBeUndefined()
    expect(unrecoverable.detail).toBe('magpie 版本过旧')
  })

  it('控制台生命周期：未运行/启动中/运行中/失败/已停止', () => {
    expect(consolePill({ phase: 'idle', message: '控制台未运行' })).toMatchObject({ label: '控制台未运行', tone: 'dim' })
    expect(consolePill({ phase: 'starting', message: '' })).toMatchObject({ label: '控制台启动中…', tone: 'warn' })
    expect(consolePill({ phase: 'running', message: '' })).toMatchObject({ label: '控制台运行中', tone: 'ok' })
    const failed = consolePill({ phase: 'failed', message: '控制台进程已退出 (code 3)，请重新连接。' })
    expect(failed).toMatchObject({ label: '控制台失败', hint: '可在设置页重试', tone: 'bad' })
    expect(failed.detail).toContain('code 3')
    expect(consolePill({ phase: 'stopped', message: '已请求停止控制台' })).toMatchObject({
      label: '控制台已停止',
      hint: '可在设置页重新连接',
      tone: 'dim',
    })
  })

  it('F1-V2：pill 文案与 hint 不含 URL/token/key 明文', () => {
    const views = [
      gatewayPill({ state: 'running', url: 'http://127.0.0.1:3425', message: 'http://x/?k=secret' }),
      gatewayPill({ state: 'error', message: '连接 https://host/?token=abc 失败', recoverable: true }),
      gatewayPill({ state: 'error', message: '?key=sk-1234567890abcdef', recoverable: false }),
      consolePill({ phase: 'failed', message: '控制台启动失败: http://x/?k=abc' }),
      consolePill({ phase: 'stopped', message: 'http://x/?k=def' }),
    ]
    for (const v of views) {
      const text = `${v.label} ${v.hint ?? ''}`
      expect(text).not.toMatch(/https?:/)
      expect(text).not.toMatch(/\?k=|[?&]token=|[?&]key=/i)
      expect(text).not.toContain('secret')
      expect(text).not.toContain('sk-')
    }
  })

  it('F1-V2：诊断 detail（tooltip）经二次脱敏', () => {
    const pill = gatewayPill({ state: 'error', message: '连接 http://x/?k=secret 失败', recoverable: true })
    expect(pill.detail).toContain('?k=[redacted]')
    expect(pill.detail).not.toContain('secret')
  })
})
