import type { JSX } from 'react'

export interface SurfaceAction {
  label: string
  run(): unknown
  primary?: boolean
  /** 动作执行后自动重试一次（provider 视图使用）。 */
  retryAfter?: boolean
}

export interface SurfaceErrorProps {
  title: string
  detail?: string
  actions?: SurfaceAction[]
}

/**
 * Surface 降级页（W1c.3）：错误常驻、恢复动作显式可达，且不阻塞壳与其它 Surface。
 */
export default function SurfaceError({ title, detail, actions }: SurfaceErrorProps): JSX.Element {
  return (
    <div className="surface-error" role="alert" data-testid="surface-error">
      <p className="surface-error-title">{title}</p>
      {detail && <p className="dim">{detail}</p>}
      {actions && actions.length > 0 && (
        <div className="row-btns">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={action.primary ? 'primary small' : 'small'}
              onClick={() => void Promise.resolve(action.run()).catch(() => undefined)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
