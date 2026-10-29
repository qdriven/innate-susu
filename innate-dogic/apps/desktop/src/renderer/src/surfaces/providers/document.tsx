import type { ComponentType } from 'react'
import type { SurfaceKind } from '@dogic/core/surface'
import type { SurfaceProvider, SurfaceViewProps } from '../provider-registry'

export interface DocumentProviderOptions {
  id: string
  kind?: SurfaceKind
  View: ComponentType<SurfaceViewProps>
}

/**
 * renderer document/panel provider（W1c.1）。
 *
 * 与 webcontents provider 共用同一注册接口：视图本体在 renderer 内，
 * 生命周期同样走 open/activate/deactivate/close 语义。
 */
export function createDocumentProvider(options: DocumentProviderOptions): SurfaceProvider {
  return {
    id: options.id,
    kind: options.kind ?? 'document',
    View: options.View,
  }
}
