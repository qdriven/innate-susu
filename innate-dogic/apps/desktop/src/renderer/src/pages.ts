import type { AppMode } from '@dogic/core'

/** 页面注册表（M2 起门控唯一作用点；W1b 起补 slot 元数据），壳层组合按 slot 决定挂载位置 */
export type PageSlot = 'content' | 'right'

export interface PageDef {
  id: string
  label: string
  icon: string
  modes: AppMode[]
  /** 挂载槽位；缺省 content。'right' 为 W3 右栏业务 Panel 预留，本阶段无注册项使用 */
  slot?: PageSlot
}

export const PAGES: PageDef[] = [
  { id: 'chat', label: '对话', icon: '◍', modes: ['simple', 'dev'] },
  { id: 'settings', label: '设置', icon: '⚙', modes: ['simple'] },
  { id: 'overview', label: '总览', icon: '⌂', modes: ['dev'] },
  { id: 'workspace', label: '工作区', icon: '▤', modes: ['dev'] },
  { id: 'terminal', label: '终端', icon: '❯', modes: ['dev'] },
  { id: 'models', label: '模型', icon: '◫', modes: ['dev'] },
  { id: 'console', label: '模型配置', icon: '⚙', modes: ['dev'] },
  { id: 'tools', label: '工具', icon: '⌘', modes: ['dev'] },
]

export function pagesForMode(mode: AppMode): PageDef[] {
  return PAGES.filter((p) => p.modes.includes(mode))
}

/** 解析页面的槽位；未声明按 content 处理（W1b 负路径：元数据缺失不拖垮组合） */
export function pageSlot(page: PageDef): PageSlot {
  return page.slot ?? 'content'
}

export function pagesForSlot(mode: AppMode, slot: PageSlot): PageDef[] {
  return pagesForMode(mode).filter((page) => pageSlot(page) === slot)
}

/** 模式默认落点：simple=对话，dev=总览（与 W1a 行为基线一致） */
export function defaultPageId(mode: AppMode): string {
  return mode === 'simple' ? 'chat' : 'overview'
}

/**
 * 当前活动页安全解析（W1b 负路径）：activeId 为空、被删注册或属其他模式时，
 * 依次回退模式默认页与首个可用页，不抛异常——删除可选页面注册后壳仍可启动。
 */
export function resolveActivePage(mode: AppMode, activeId: string | null | undefined): PageDef | undefined {
  const pages = pagesForMode(mode)
  return (
    pages.find((page) => page.id === activeId)
    ?? pages.find((page) => page.id === defaultPageId(mode))
    ?? pages[0]
  )
}
