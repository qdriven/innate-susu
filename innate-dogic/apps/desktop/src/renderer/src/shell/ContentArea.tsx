import type { JSX, ReactNode } from 'react'

/** 壳中栏容器（W1b.2）：只承载当前页面内容，页面逻辑留在各页面组件。 */
export default function ContentArea({ children }: { children: ReactNode }): JSX.Element {
  return <div className="content">{children}</div>
}
