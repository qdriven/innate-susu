import { TerminalPanel, TerminalSessionStore } from '@dogic/plugin-terminal/renderer'
import type { TerminalApi } from '@dogic/plugin-terminal'
import type { JSX } from 'react'
import type { SurfaceDescriptor } from '@dogic/core/surface'
import type { SurfaceProvider, SurfaceViewProps } from '../provider-registry'
import { TERMINAL_PROVIDER_ID } from '../catalog'

/**
 * terminal Surface provider（W4.4）。
 *
 * 视图本体是 renderer 内的 xterm 面板（kind=terminal）；标签切换只卸载视图
 * （store detach，进程与 scrollback 保留），标签关闭才终止 PTY。
 */
export function createTerminalProvider(api: TerminalApi): SurfaceProvider {
  const store = new TerminalSessionStore(api)

  function View(props: SurfaceViewProps): JSX.Element {
    const { descriptor, onRequestClose } = props
    return (
      <TerminalPanel
        store={store}
        api={api}
        surfaceId={descriptor.id}
        title={descriptor.title}
        workspaceId={descriptor.workspaceId}
        onRequestClose={onRequestClose}
      />
    )
  }

  return {
    id: TERMINAL_PROVIDER_ID,
    kind: 'terminal',
    View,
    close: (descriptor: SurfaceDescriptor) => store.dispose(descriptor.id),
  }
}
