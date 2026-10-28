/**
 * 设置页插槽。
 *
 * 插件可注册设置分组与表单项。
 */

export type SettingFieldType = 'text' | 'number' | 'select' | 'boolean' | 'password'

export interface SettingField {
  key: string
  label: string
  type: SettingFieldType
  options?: Array<{ label: string; value: string | number | boolean }>
  defaultValue?: unknown
  description?: string
}

export interface SettingGroup {
  id: string
  title: string
  fields: SettingField[]
}

export class SettingsHost {
  private groups = new Map<string, SettingGroup>()
  private values = new Map<string, unknown>()
  private listeners = new Map<string, Set<(value: unknown) => void>>()
  private groupListeners = new Set<() => void>()

  /**
   * 注册设置分组。
   */
  registerGroup(group: SettingGroup): void {
    if (this.groups.has(group.id)) {
      throw new Error(`Setting group already registered: ${group.id}`)
    }
    this.groups.set(group.id, group)
    // 设置默认值
    for (const field of group.fields) {
      const key = `${group.id}.${field.key}`
      if (!this.values.has(key) && field.defaultValue !== undefined) {
        this.values.set(key, field.defaultValue)
      }
    }
    this.notifyGroups()
  }

  /**
   * 列出所有设置分组。
   */
  listGroups(): SettingGroup[] {
    return [...this.groups.values()]
  }

  /**
   * 获取设置值。
   */
  get(key: string): unknown {
    return this.values.get(key)
  }

  /**
   * 设置值并通知监听器。
   */
  set(key: string, value: unknown): void {
    this.values.set(key, value)
    const listeners = this.listeners.get(key)
    if (listeners) {
      for (const l of listeners) {
        try {
          l(value)
        } catch {
          // 忽略
        }
      }
    }
  }

  /**
   * 监听设置变更。
   */
  onChange(key: string, handler: (value: unknown) => void): () => void {
    let listeners = this.listeners.get(key)
    if (!listeners) {
      listeners = new Set()
      this.listeners.set(key, listeners)
    }
    listeners.add(handler)
    return () => listeners!.delete(handler)
  }

  onGroupsChange(listener: () => void): () => void {
    this.groupListeners.add(listener)
    return () => this.groupListeners.delete(listener)
  }

  private notifyGroups(): void {
    for (const l of this.groupListeners) {
      try {
        l()
      } catch {
        // 忽略
      }
    }
  }
}
