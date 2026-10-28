import { useCallback, useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { api } from './api'

/** M1 T1.4：内嵌 magpie 控制台页。视图本体由主进程 WebContentsView 承载，本页只提供占位与状态。 */
export default function ConsolePage(): JSX.Element {
  const areaRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [detail, setDetail] = useState('正在启动 magpie 控制台…')

  const bounds = useCallback(() => {
    const r = areaRef.current?.getBoundingClientRect()
    if (!r) return { x: 0, y: 0, width: 0, height: 0 }
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
  }, [])

  const show = useCallback(async () => {
    setState('loading')
    const r = await api.consoleShow(bounds())
    setDetail(r.detail)
    setState(r.ok ? 'ready' : 'error')
    if (r.ok) await api.consoleBounds(bounds())
  }, [bounds])

  useEffect(() => {
    void show()
    const el = areaRef.current
    const observer = new ResizeObserver(() => {
      void api.consoleBounds(bounds())
    })
    if (el) observer.observe(el)
    return () => {
      observer.disconnect()
      void api.consoleHide()
    }
  }, [show, bounds])

  return (
    <div className="console-page">
      <div className="console-toolbar">
        <span className="dim">magpie 控制台 · 改动对新启动的 dsh 会话生效</span>
        <div className="row-btns">
          <button className="small" onClick={() => void show()}>重新连接</button>
          <button className="small" onClick={() => void api.openMagpieWeb()}>浏览器打开</button>
        </div>
      </div>
      <div ref={areaRef} className="console-area">
        {state !== 'ready' && (
          <div className="console-fallback">
            <p className={state === 'error' ? 'bad-text' : 'dim'}>{detail}</p>
            {state === 'error' && (
              <div className="row-btns">
                <button className="small" onClick={() => void api.startMagpie().then(() => show())}>
                  启动 magpie 并重试
                </button>
                <button className="small" onClick={() => void api.openMagpieWeb()}>浏览器打开</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
