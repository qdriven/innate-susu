/**
 * innate-desktop 产品 token 层的机器可读契约。
 *
 * 这个文件不产生运行时代码，只把三件事固定下来，供 `theme.test.ts` 校验、
 * 供消费方（未来的桌面 renderer）引用：
 *
 * 1. 默认主题变体 —— `default`（无对应选择器，落到本层；不是 shadcn-neutral）；
 * 2. 产品扩展 token 清单 —— 必须在 `:root` 与 `.dark` 中成对声明；
 * 3. 共享语义 token 清单 —— 定义面归 `@innate/ui`，产品层只做同值覆写。
 */

/**
 * app 的默认主题变体。
 *
 * `default` 没有 `[data-theme="default"]`。ThemeProvider 仍写入该属性，
 * 因此用产品层 `:root` / `.dark`（基础仓 oklch Neutral，不是 `shadcn-neutral`）。
 * 亮色与 orca 同值；暗色 4 处差异见 `DARK_TOKEN_DELTAS`。
 *
 * 变体只覆盖自己声明的变量。`shadcn-*` 不声明 sidebar / chart / font。
 */
export const DEFAULT_THEME_VARIANT = "default" as const

/**
 * 产品扩展 token：只服务于产品特有语义（编辑区底色、git 装饰、状态色、
 * 壳 chrome 尺寸），不属于 `@innate/ui` 的通用语义集。
 *
 * 规则：每一项都必须在 `tokens.css` 的 `:root` 与 `.dark` 中各声明一次。
 */
export const PRODUCT_TOKENS = [
  // 编辑区与侧栏族
  "editor-surface",
  "worktree-sidebar",
  "worktree-sidebar-foreground",
  "worktree-sidebar-accent",
  "worktree-sidebar-accent-foreground",
  "worktree-sidebar-border",
  "worktree-sidebar-ring",
  // 状态色
  "status-success",
  "status-success-background",
  "status-success-border",
  "status-warning",
  "status-warning-background",
  "status-warning-border",
  // Git 装饰与差异底色
  "git-decoration-added",
  "git-decoration-modified",
  "git-decoration-deleted",
  "git-decoration-renamed",
  "git-decoration-untracked",
  "git-decoration-copied",
  "git-decoration-ignored",
  "diff-added-ground",
  "diff-added-gutter",
  "diff-removed-ground",
  "diff-removed-gutter",
  // Git graph 泳道
  "git-graph-ref",
  "git-graph-remote-ref",
  "git-graph-base-ref",
  "git-graph-lane-1",
  "git-graph-lane-2",
  "git-graph-lane-3",
  "git-graph-lane-4",
  "git-graph-lane-5",
  // Agent 与工作项状态
  "agent-question",
  "agent-question-text",
  "agent-working",
  "ai-action-accent",
  "workspace-status-done",
  "workspace-status-review",
  "workspace-status-progress",
  // 高亮与分隔线
  "annotation-highlight",
  "markdown-search-match",
  "markdown-search-match-active",
  "tab-group-split-divider",
  "tab-group-split-divider-strong",
  // 窗口控件（Windows/Linux 自绘 chrome）
  "window-control-close-hover",
  "window-control-close-foreground",
] as const

/**
 * 共享语义 token：定义面在 `@innate/ui`（`packages/ui/src/tokens.css` 及其
 * `themes/`），本仓产品层以 **同值** 覆写以固定 innate-desktop 的默认观感。
 *
 * 优先级：`[data-theme]` 变体选择器 > 产品层 `:root`/`.dark` > 基础仓 `:root`。
 * 因此 app 显式选择其它 variant 时由基础仓接管，本层不构成第二事实源。
 */
export const SHARED_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "border",
  "input",
  "ring",
  "radius",
] as const

/**
 * 产品层对共享语义 token 的期望值（orca 同款中性色）。
 *
 * 亮色与 `@innate/ui` 基础 `:root` 同值，由下面的快照钉住。
 * 暗色 4 处差异在 `DARK_TOKEN_DELTAS`，测试按 `tokens.css` 的 `.dark` 块核对。
 */
export const SHARED_TOKEN_VALUES: Record<(typeof SHARED_TOKENS)[number], string> =
  {
    background: "#fff",
    foreground: "#0a0a0a",
    card: "#fff",
    "card-foreground": "#0a0a0a",
    popover: "#fff",
    "popover-foreground": "#0a0a0a",
    primary: "#171717",
    "primary-foreground": "#fafafa",
    secondary: "#f5f5f5",
    "secondary-foreground": "#171717",
    muted: "#f5f5f5",
    "muted-foreground": "#737373",
    accent: "#f5f5f5",
    "accent-foreground": "#171717",
    border: "#e5e5e5",
    input: "#e5e5e5",
    ring: "#a1a1a1",
    radius: "0.625rem",
  }

/**
 * 产品层 `.dark` 相对基础仓 `.dark` 的 4 处固定值（`tokens.css` 里的原文）。
 * `sidebar-border` / `sidebar-ring` 不在 `SHARED_TOKENS` 里，但同样写在 `.dark`。
 */
export const DARK_TOKEN_DELTAS = {
  accent: "#404040",
  border: "rgb(255 255 255 / 0.07)",
  "sidebar-border": "rgb(255 255 255 / 0.07)",
  "sidebar-ring": "#525252",
} as const
