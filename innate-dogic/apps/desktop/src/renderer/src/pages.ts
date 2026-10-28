import type { AppMode } from '@dogic/core'

/** 页面注册表（M2）：壳层门控只作用于注册表，新增页面在此登记 */
export interface PageDef {
  id: string
  label: string
  icon: string
  modes: AppMode[]
}

export const PAGES: PageDef[] = [
  { id: 'chat', label: '对话', icon: '◍', modes: ['simple', 'dev'] },
  { id: 'settings', label: '设置', icon: '⚙', modes: ['simple'] },
  { id: 'overview', label: '总览', icon: '⌂', modes: ['dev'] },
  { id: 'workspace', label: '工作区', icon: '▤', modes: ['dev'] },
  { id: 'models', label: '模型', icon: '◫', modes: ['dev'] },
  { id: 'console', label: '模型配置', icon: '⚙', modes: ['dev'] },
  { id: 'tools', label: '工具', icon: '⌘', modes: ['dev'] },
]

export function pagesForMode(mode: AppMode): PageDef[] {
  return PAGES.filter((p) => p.modes.includes(mode))
}
