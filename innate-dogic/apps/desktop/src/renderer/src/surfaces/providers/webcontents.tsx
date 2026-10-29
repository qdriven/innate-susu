import { useCallback, useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { SurfaceDescriptor, SurfaceKind } from '@dogic/core/surface'
import { api } from '../../api'
import SurfaceError from '../SurfaceError'
import type { SurfaceAction } from '../SurfaceError'
import type { SurfaceProvider, SurfaceViewProps } from '../provider-registry'

export interface WebContentsProviderOptions {
  id: string
  kind?: SurfaceKind
  /** 失败时除“重试”外提供的显式恢复动作。 */
  actions?: SurfaceAction[]
}

function readBounds(element: HTMLElement | null): { x: number; y: number; width: number; height: number } {
  const rect = element?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0, width: 0, height: 0 }
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

/**
 * WebContents provider（W1c.2）。
 *
 * renderer 只提交安全 descriptor 与 bounds；认证 URL 由主进程对应 provider 内部解析，
 * 因此通用 renderer 既拿不到也提交不了带 token 的链接。
 */
export function createWebContentsProvider(options: WebContentsProviderOptions): SurfaceProvider {
  function View(props: SurfaceViewProps): JSX.Element {
    const { descriptor, active, onRequestClose } = props
    const areaRef = useRef<HTMLDivElement>(null)
    const descriptorRef = useRef<SurfaceDescriptor>(descriptor)
    descriptorRef.current = descriptor
    const [error, setError] = useState('')
    const [attempt, setAttempt] = useState(0)

    const bounds = useCallback(() => readBounds(areaRef.current), [])

    useEffect(() => {
      if (!active) {
        void api.surfaceHide(descriptorRef.current.id)
        return
      }
      let cancelled = false
      const show = async (): Promise<void> => {
        try {
          const result = await api.surfaceShow(descriptorRef.current, bounds())
          if (cancelled) return
          setError(result.ok ? '' : (result.detail ?? 'Surface 打开失败'))
        } catch (reason) {
          if (cancelled) return
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      }
      void show()
      const element = areaRef.current
      const observer = typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(() => void api.surfaceBounds(descriptorRef.current.id, bounds()))
      if (element) observer?.observe(element)
      return () => {
        cancelled = true
        observer?.disconnect()
        void api.surfaceHide(descriptorRef.current.id)
      }
    }, [active, attempt, bounds])

    const retry = useCallback(() => setAttempt((value) => value + 1), [])

    const recoveryActions = (options.actions ?? []).map((action) => ({
      ...action,
      run: async (): Promise<void> => {
        await action.run()
        if (action.retryAfter) retry()
      },
    }))

    return (
      <div className="surface-view">
        {error && (
          <SurfaceError
            title="Surface 打开失败"
            detail={error}
            actions={[
              { label: '重试', run: retry, primary: true },
              ...recoveryActions,
              { label: '关闭标签', run: onRequestClose },
            ]}
          />
        )}
        <div ref={areaRef} className="surface-view-area" data-surface-id={descriptor.id} />
      </div>
    )
  }

  return {
    id: options.id,
    kind: options.kind ?? 'webcontents',
    View,
    close: (descriptor: SurfaceDescriptor) => api.surfaceClose(descriptor.id),
  }
}
