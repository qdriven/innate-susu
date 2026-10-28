/**
 * workbench 面板插槽。
 *
 * 插件可注册/注销自定义面板，支持 customFrame 主内容区布局。
 */

export interface PanelSpec {
  id: string
  title: string
  icon?: string
  repository?: string
  /** 自定义框架：占据主内容区 */
  customFrame?: boolean
}

export interface PanelRegistration {
  spec: PanelSpec
  /** 面板组件（React 组件或渲染函数） */
  component: unknown
}

export class WorkbenchHost {
  private panels = new Map<string, PanelRegistration>()
  private listeners = new Set<() => void>()

  /**
   * 注册面板。
   */
  registerPanel(spec: PanelSpec, component: unknown): void {
    if (this.panels.has(spec.id)) {
      throw new Error(`Panel already registered: ${spec.id}`)
    }
    this.panels.set(spec.id, { spec, component })
    this.notify()
  }

  /**
   * 注销面板。
   */
  unregisterPanel(id: string): void {
    if (this.panels.delete(id)) {
      this.notify()
    }
  }

  /**
   * 列出所有已注册面板。
   */
  listPanels(): PanelSpec[] {
    return [...this.panels.values()].map((r) => r.spec)
  }

  /**
   * 获取面板组件。
   */
  getPanel(id: string): PanelRegistration | undefined {
    return this.panels.get(id)
  }

  /**
   * 监听面板列表变更。
   */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    for (const l of this.listeners) {
      try {
        l()
      } catch {
        // 忽略
      }
    }
  }
}
