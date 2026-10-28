import { useCallback, useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { HarnessState, StatusSnapshot } from '@dogic/core'
import { api } from './api'
import SimpleHome from './SimpleHome'

interface Props {
  status: StatusSnapshot | null
  harness: HarnessState
  launching: boolean
  launchMsg: string
  onLaunch(): void
  onStop(): void
  onOpenSettings(): void
}

/** Harness 是 SurfaceHost 中的持久标签；离开页面只 detach，不再另开 BrowserWindow。 */
export default function HarnessPage(props: Props): JSX.Element {
  const { harness, onStop } = props
  const areaRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const running = harness.phase === 'running' && Boolean(harness.url)

  const bounds = useCallback(() => {
    const rect = areaRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0, width: 0, height: 0 }
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    }
  }, [])

  useEffect(() => {
    if (!running) {
      void api.harnessHide()
      return
    }
    const element = areaRef.current
    const show = async (): Promise<void> => {
      const result = await api.harnessShow(bounds())
      setError(result.ok ? '' : result.detail)
    }
    void show()
    const observer = new ResizeObserver(() => void api.harnessBounds(bounds()))
    if (element) observer.observe(element)
    return () => {
      observer.disconnect()
      void api.harnessHide()
    }
  }, [running, harness.url, bounds])

  return (
    <div className="harness-page">
      <div className="surface-tabstrip">
        <span className="surface-tab current">◍ DeepSeek Harness</span>
        {running && <button className="small" onClick={onStop}>停止</button>}
      </div>
      {running ? (
        <div ref={areaRef} className="harness-area">
          {error && <div className="console-fallback bad-text">{error}</div>}
        </div>
      ) : (
        <SimpleHome {...props} />
      )}
    </div>
  )
}
