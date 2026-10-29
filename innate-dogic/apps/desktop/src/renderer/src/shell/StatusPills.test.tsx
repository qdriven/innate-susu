import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ConsoleStatusEvent, GatewayStatusEvent } from '@dogic/core'
import StatusPills from './StatusPills'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const gw = (patch: Partial<GatewayStatusEvent> = {}): GatewayStatusEvent => ({ state: 'running', ...patch })
const con = (patch: Partial<ConsoleStatusEvent> = {}): ConsoleStatusEvent => ({ phase: 'running', message: '', ...patch })

function renderPills(props: Partial<Parameters<typeof StatusPills>[0]> = {}) {
  const onStartGateway = props.onStartGateway ?? vi.fn()
  return {
    onStartGateway,
    ...render(
      <StatusPills
        gateway={props.gateway ?? null}
        consoleStatus={props.consoleStatus ?? null}
        mode={props.mode ?? 'dev'}
        onStartGateway={onStartGateway}
      />,
    ),
  }
}

describe('W2.5 顶栏状态 pill 组件', () => {
  it('网关与控制台各一枚 pill，dev 模式显示 hint', () => {
    renderPills({ gateway: gw({ state: 'not-running' }), consoleStatus: con({ phase: 'failed', message: '控制台进程已退出 (code 3)' }) })
    expect(screen.getByTestId('pill-gateway').textContent).toContain('网关未运行')
    expect(screen.getByTestId('pill-gateway').textContent).toContain('点击启动 magpie 网关')
    expect(screen.getByTestId('pill-console').textContent).toContain('控制台失败')
    expect(screen.getByTestId('pill-console').textContent).toContain('可在设置页重试')
  })

  it('simple 模式：只显示状态文案，hint 不进文案（仅 title）', () => {
    renderPills({ gateway: gw({ state: 'not-running' }), mode: 'simple' })
    const pill = screen.getByTestId('pill-gateway')
    expect(pill.textContent).toContain('网关未运行')
    expect(pill.textContent).not.toContain('点击启动')
    expect(pill.getAttribute('title')).toContain('点击启动 magpie 网关')
  })

  it('F1-V1：四态转换 not-running → starting → running → error（rerender）', () => {
    const { rerender } = renderPills({ gateway: gw({ state: 'not-running' }) })
    expect(screen.getByTestId('pill-gateway').textContent).toContain('网关未运行')

    rerender(
      <StatusPills gateway={gw({ state: 'starting' })} consoleStatus={null} mode="dev" onStartGateway={vi.fn()} />,
    )
    expect(screen.getByTestId('pill-gateway').textContent).toContain('网关启动中')

    rerender(
      <StatusPills gateway={gw({ state: 'running' })} consoleStatus={null} mode="dev" onStartGateway={vi.fn()} />,
    )
    expect(screen.getByTestId('pill-gateway').textContent).toContain('网关运行中')

    rerender(
      <StatusPills
        gateway={gw({ state: 'error', message: '启动超时', recoverable: true })}
        consoleStatus={null}
        mode="dev"
        onStartGateway={vi.fn()}
      />,
    )
    expect(screen.getByTestId('pill-gateway').textContent).toContain('网关异常')
    expect(screen.getByTestId('pill-gateway').textContent).toContain('可重试')
  })

  it('F1-V1：断网关提示可恢复错误，恢复后回到 网关运行中', () => {
    const { rerender } = renderPills({ gateway: gw({ state: 'error', message: '连接被拒绝', recoverable: true }) })
    const pill = screen.getByTestId('pill-gateway')
    expect(pill.textContent).toContain('网关异常')
    expect(pill.textContent).toContain('可重试')
    expect(pill.getAttribute('title')).toContain('连接被拒绝')

    rerender(
      <StatusPills gateway={gw({ state: 'running' })} consoleStatus={null} mode="dev" onStartGateway={vi.fn()} />,
    )
    expect(screen.getByTestId('pill-gateway').textContent).toContain('网关运行中')
  })

  it('点击 网关未运行 pill 触发启动网关', () => {
    const onStartGateway = vi.fn()
    renderPills({ gateway: gw({ state: 'not-running' }), onStartGateway })
    fireEvent.click(screen.getByTestId('pill-gateway'))
    expect(onStartGateway).toHaveBeenCalledTimes(1)
  })

  it('不可恢复错误：pill 不可点击，无 action', () => {
    const onStartGateway = vi.fn()
    renderPills({ gateway: gw({ state: 'error', message: 'magpie 版本过旧', recoverable: false }), onStartGateway })
    const pill = screen.getByTestId('pill-gateway')
    expect(pill.tagName).toBe('SPAN')
    fireEvent.click(pill)
    expect(onStartGateway).not.toHaveBeenCalled()
  })

  it('双 null：不渲染任何 pill（空槽）', () => {
    const { container } = renderPills()
    expect(container.querySelector('.status-pills')).toBeNull()
  })

  it('F1-V2：渲染文案不含 URL/token/key 明文', () => {
    const { container } = renderPills({
      gateway: gw({ state: 'error', message: '连接 http://x/?token=sk-abc123 失败', recoverable: true }),
      consoleStatus: con({ phase: 'failed', message: '控制台启动失败 http://y/?k=zzz' }),
    })
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/https?:/)
    expect(text).not.toMatch(/\?k=|[?&]token=|[?&]key=/i)
    expect(text).not.toContain('sk-abc123')
    expect(text).not.toContain('zzz')
  })
})
