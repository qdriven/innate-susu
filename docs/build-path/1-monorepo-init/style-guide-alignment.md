# orca ↔ innate-fe 对齐结论

> Issue #1「Setup Style Guide」第 2 条：*需要和 innate-fe 部分对上，如果对不上需要给出解决方案。*
>
> 本文是对齐的**事实源**。style guide 本体（`.agents/skills/susu-overview/STYLEGUIDE.md` 与 `styleguide/`）是它的执行副本。

## 结论摘要

| 对齐对象 | 结论 |
| --- | --- |
| **中性色** | `@innate/ui` 基础 `:root` / `.dark`（shadcn Neutral）与 orca 的中性色**逐 token 相等**，除暗色 4 处刻意差异（`accent` / `border` / `sidebar-border` / `sidebar-ring`）。**不需要新造中性色**，产品层只冻结同值并固定那 4 处。 |
| **主题变体** | orca 没有变体机制；`@innate/ui` 有 10 个 `data-theme` 变体。**默认用 `default`**（基础 `:root`），变体是用户的显式选择，由基础仓接管。 |
| **字体** | orca 用 Geist / SF Mono；`@innate/ui` 基础层是 Inter。**产品层覆盖 `--font-sans` / `--font-mono`**，字体文件随 `@innate-desktop/theme` 分发。 |
| **primitive** | orca 自建 38 个（Radix 底座）；`@innate/ui` 提供 58 个（**Base UI** 底座）。**唯一来源 = `@innate/ui`**，缺件去基础仓 `pnpm ui:add`。 |
| **按钮尺度** | orca 宽松（default h-9 / 14px），`@innate/ui` 紧凑（default h-7 / 13px）。**取 `@innate/ui`**，顶栏内统一用 `icon-sm` / `icon-xs`。 |
| **壳 toolbar** | orca titlebar（36px 物理壳 + 自绘窗口控件）↔ innate-fe webshell header（h-12 内容语义）。**结论：物理壳用 orca，内容语义用 webshell。** |
| **orca 专属能力** | 安全表面、快捷键 chip 的平台分隔、多选 combobox、面板标题按钮变体等 4 项 `@innate/ui` 没有。**逐项给出过渡方案与正式方案**（见 §6）。 |

## 1. 怎么核对的

不靠印象，逐 token 解析比对：

| 对象 | 事实源 |
| --- | --- |
| orca | `innate-labs/references/orca/src/renderer/src/assets/main.css` 的 `:root` / `.dark` 块 |
| `@innate/ui` | `innate-fe/packages/ui/src/tokens.css` 的 `:root` / `.dark` 块（基础层）+ `packages/ui/src/themes/*.css`（变体） |
| webshell 壳 | `innate-fe/shells/webshell/src/components/app-shell.tsx`（默认三栏壳）、`app-shell-classic.tsx`（经典两栏壳） |

复核命令（只读，不写盘）：

```bash
node tools/compare-palette.mjs --orca <orca 仓路径> --fe <innate-fe 基础仓路径>
```

脚本把 `hsl()` / `oklch()` / `rgb()` 统一换算成 hex 再比，通道差 ≤3 记为「同一颜色的不同写法」，只报结构性差异。

## 2. 中性色对照

### 亮色：全部相等

| token | orca | `@innate/ui` 基础 | 相等 |
| --- | --- | --- | --- |
| `background` / `card` / `popover` | `#fff` | `oklch(1 0 0)` | ✅ |
| `foreground` | `#0a0a0a` | `oklch(0.145 0 0)` | ✅ |
| `primary` | `#171717` | `oklch(0.205 0 0)` | ✅ |
| `primary-foreground` | `#fafafa` | `oklch(0.985 0 0)` | ✅ |
| `secondary` / `muted` / `accent` | `#f5f5f5` | `oklch(0.97 0 0)` | ✅ |
| `muted-foreground` | `#737373` | `oklch(0.556 0 0)` | ✅ |
| `border` / `input` | `#e5e5e5` | `oklch(0.922 0 0)` | ✅ |
| `ring` | `#a1a1a1` | `oklch(0.708 0 0)` | ✅ |
| `radius` | `0.625rem` | `0.625rem` | ✅ |
| `sidebar` 家族 | `#fafafa` / `#0a0a0a` / `#171717` / … | 同值 | ✅ |

**这意味着 innate-desktop 不需要另造一套中性色。** orca 用的是纯中性灰（hue 0），`@innate/ui` 的基础层（shadcn Neutral）也是纯中性灰，两边逐值相等。

### 暗色：相等除 4 处

| token | orca | `@innate/ui` 基础 `.dark` | 差 |
| --- | --- | --- | --- |
| `background` | `#0a0a0a` | `oklch(0.145 0 0)` | ✅ |
| `card` / `popover` | `#171717` | `oklch(0.205 0 0)` | ✅ |
| `primary` | `#e5e5e5` | `oklch(0.922 0 0)` | ✅ |
| `secondary` / `muted` | `#262626` | `oklch(0.269 0 0)` | ✅ |
| `muted-foreground` | `#a1a1a1` | `oklch(0.708 0 0)` | ✅ |
| `input` | `rgb(255 255 255 / 0.15)` | `oklch(1 0 0 / 15%)` | ✅ |
| `ring` | `#737373` | `oklch(0.556 0 0)` | ✅ |
| `sidebar` 家族 | `#171717` / `#1447e6` / `#262626` … | 同值 | ✅ |
| **`accent`** | `#404040` | `oklch(0.269 0 0)` = `#262626` | **orca 亮一档** |
| **`border`** | `rgb(255 255 255 / 0.07)` | `oklch(1 0 0 / 10%)` | **透明度 7% vs 10%** |
| **`sidebar-border`** | `rgb(255 255 255 / 0.07)` | `oklch(1 0 0 / 10%)` | 同上 |
| **`sidebar-ring`** | `#525252` | `oklch(0.556 0 0)` = `#737373` | **orca 更收敛** |

### 4 处差异的处置

| 差异 | 处置 | 理由 |
| --- | --- | --- |
| 暗色 `accent` | **产品层固定 orca 的 `#404040`** | 基础仓的 `#262626` 与暗色 `muted` 同值。`accent` 是 ghost 按钮与列表行 hover 的底色——改成 `#262626` 会让所有 hover 几乎不可见。orca 亮一档是有意的。 |
| 暗色 `border` 7% | **产品层固定 7%** | 基础仓 10% 在 `--card`（`#171717`）上是一道可见描边；orca 的观感是「发丝线」。桌面工作台承载编辑器、终端、Markdown 预览等大量外来 UI，外壳应该退后，发丝线更符合这个定位。 |
| 暗色 `sidebar-border` 7% | 同上 | 与 `--border` 同理，保持两条边线同权。 |
| 暗色 `sidebar-ring` `#525252` | **产品层固定 orca 值** | 侧栏 focus 环比通用 `ring` 更收敛，避免侧栏里到处是亮圈。 |

### 产品层 vs 基础层的关系

产品层**覆写**基础层的值，用**同值**冻结中性色。原因不是"另一套颜色"，而是：

1. **防漂移**：基础仓改 Neutral（shadcn 升级、对比度调整）时，桌面端的观感不应该跟着变。
2. **可测**：`packages/theme` 的测试钉住这份快照，漂移会红。

优先级：`[data-theme]` 变体选择器（特异性 `(0,2,0)`）> 产品层 `:root`/`.dark`（`(0,1,0)`，靠源码顺序覆盖基础层）> 基础层 `:root`。**用户显式选变体时由基础仓接管**——这是有意的，不是冲突。

## 3. 主题变体对照

orca 只有明暗两态。`@innate/ui` 有 10 个变体：

| 变体 | 定义位置 | 中性色 |
| --- | --- | --- |
| `default` | `tokens.css` 的 `:root` / `.dark` | shadcn Neutral —— **与 orca 逐 token 相等** |
| `shadcn-zinc` / `shadcn-slate` / `shadcn-stone` / `shadcn-gray` / `shadcn-neutral` | `themes/shadcn-default.css` | hue 240，带淡蓝偏移，**与 orca 不等值** |
| `linear` / `notion` | `themes/linear.css`、`themes/notion.css` | 品牌化 |
| `marshmallow` / `art-deco` | `themes/shadcn-studio.css` | 品牌化 |
| `webshell` | `themes/webshell.css` | 品牌化 |

**结论**：默认变体 = `default`（`DEFAULT_THEME_VARIANT`）。`shadcn-zinc` **不是**默认值——它的中性色是 `hsl(240 5.9% 10%)` 这类带 240 色相的色，与 orca 的纯中性灰差 1–3 个通道值，`muted-foreground` 差到 7，选它当默认会让桌面端和 orca 观感不一致。

变体机制（`ThemeProvider` / `ThemeSelector` / `data-theme` / localStorage `color-mode` + `theme-variant`）全部归基础仓，本仓**不另写一份**。

## 4. 字体对照

| | orca | `@innate/ui` 基础 | 处置 |
| --- | --- | --- | --- |
| `--font-sans` | `Geist, -apple-system, …` | `Inter, ui-sans-serif, …`（依赖 `@fontsource-variable/inter`） | **产品层覆盖为 Geist**，字体文件 `Geist-Variable.woff2` 随 `@innate-desktop/theme` 分发 |
| `--font-mono` | `'SF Mono', SFMono-Regular, ui-monospace, 'Cascadia Code', …` | `ui-monospace, SFMono-Regular, Menlo, Consolas, …` | **产品层补齐 orca 顺序**（补 `SF Mono` 与 `Cascadia Code`） |

覆盖写在 `@import "@innate/ui/tokens.css"` **之后**，因为两者特异性相同（都是 `:root`），靠源码顺序决定。选中带字体的 `data-theme` 时，变体比产品层的 `:root` 更具体，会接管——这是基础仓的既定行为，不在本仓对抗。

## 5. primitive 与控件对照

### 数量与底座

| | orca | `@innate/ui` v0.1.2 |
| --- | --- | --- |
| primitive 数 | 38（自建 `src/renderer/src/components/ui/`） | **58** |
| 底座 | Radix UI | **Base UI**（`@base-ui/react`） |
| 触发器写法 | `asChild` | **`render` prop** |
| 图标库 | `lucide-react` | `lucide-react`（同一套） |

**结论**：primitive 唯一来源 = `@innate/ui`。orca 的 `components/ui/` **不迁入**本仓；缺件去基础仓 `pnpm ui:add`。

### 按钮尺度

| 项 | orca | `@innate/ui` | 处置 |
| --- | --- | --- | --- |
| 基准字号 | `text-sm`（14px） | `text-[13px]` | 取 `@innate/ui`。14px 只用于内容区正文，chrome 用 13px。 |
| default 高 | `h-9`（36px） | `h-7`（28px） | 取 `@innate/ui`。**顶栏内统一 `icon-sm`(24px) / `icon-xs`(22px)**，不放文字主按钮。 |
| sm / xs / lg | h-8 / h-6 / h-10 | h-6 / h-5.5 / h-8 | 同上。 |
| icon | `size-9` | `size-7` | 同上。 |
| 内部 svg | `size-4` | `size-3` | 需要 16px 时显式 `size-4`。 |
| `destructive` | 实心 `bg-destructive text-white` | 淡底 `bg-destructive/10 text-destructive` | 取 `@innate/ui`；需要实心时用 `variant="default"` + `className` 局部覆盖。 |
| `ghost` hover | `bg-accent` | `bg-muted` | 取 `@innate/ui`。**壳 chrome 层例外**：titlebar 内的图标按钮用本仓 `.titlebar-icon-button` / `.sidebar-toggle`（hover 是 `bg-accent`）。 |
| `outline` | 带 `shadow-xs` | 无 shadow | 取 `@innate/ui`。 |
| 额外变体 | `pane-title`、`pane-title-close`、`destructive-chip` | 无 | **不迁移成 primitive**。面板标题栏是壳 chrome，用 `shell.css` 的类名实现。 |
| 额外尺寸 | `chip`（h-4） | 无 | 用 `Badge` 或 `text-3xs`，不新造尺寸档。 |

### Tooltip

| | orca | `@innate/ui` | 处置 |
| --- | --- | --- | --- |
| 延迟 | 400ms | `delay={0}` | 密集工具栏用 `<TooltipProvider delay={400}>` 包一层。 |
| 触发 | `asChild` | `render` | 同上。 |
| 快捷键 chip | `<ShortcutKeyCombo />` | `Kbd`（`TooltipContent` 已针对 `data-[slot=kbd]` 做过 padding 与层级处理） | 用 `Kbd`；平台字形由调用方给。 |

### 滚动条

orca 的三类滚动条在 `@innate/ui` 之外（属于壳 chrome，不是 primitive）。**迁到本仓 `packages/theme/src/shell.css`**：`.scrollbar-sleek` / `.scrollbar-editor` / `.worktree-sidebar-scrollbar`。归属正确——它们是产品 chrome，不是基座能力。

### 列表行选中配方

orca 的 `.jump-palette-item[data-selected='true']`（`color-mix` 前景入背景 + inset ring）同样属于壳 chrome，**迁到本仓 `shell.css`**，配 `data-selected="true"`。

## 6. orca 专属能力与本仓缺口

`@innate/ui` 还没有的能力，逐项给方案。**不在本仓自建 primitive。**

| orca 能力 | `@innate/ui` 现状 | 过渡方案（本仓可立即用） | 正式方案（去基础仓） |
| --- | --- | --- | --- |
| **安全表面**：`SecuritySurface` / `DialogContent surface="security"` | `DialogContent` 没有 `surface` prop | 在产品层加 `--security-*` token 家族（照 orca 的 `--orca-security-*` 改名，明暗成对），在 `DialogContent` 上用 `className` 挂 `data-surface="security"` 的样式 | `pnpm ui:add`：给 `DialogContent` 加 `surface` 变体 |
| **快捷键 chip**：`ShortcutKeyCombo`（Win/Linux 插 `+`） | 有 `Kbd`，无分隔符 | `Kbd` + 调用方按平台给字形，多键各自渲染 | `pnpm ui:add`：`ShortcutKeyCombo` |
| **多选 combobox**：`repo-multi-combobox` | 有 `command`(cmdk) + `popover` + `checkbox`，无组合件 | `Command` in `Popover` + `CommandItem` 自管多选状态 | `pnpm ui:add`：多选 combobox |
| **面板标题按钮变体**：`pane-title` / `pane-title-close` / `destructive-chip` | 无 | 不迁移成 primitive；用 `shell.css` 类名 + `Button` 的 `className` | 不需要（属壳 chrome） |
| **对话区 token**：`--chat-*`（16 个） | 无 | 未实现，随对话区一起落地 | 不需要（属产品 token 层） |
| **终端标题 token**：`--terminal-pane-title-on-*`（14 个） | 无 | 未实现，随终端一起落地 | 不需要 |

> **红线**：要求用户信任、批准、执行或移除代码的对话框必须走安全面。基础仓补齐前，用产品层 `--security-*` token 家族过渡，**不得**用普通 `Dialog` 顶替。

## 7. 壳 toolbar 对照

完整规格见 [`.agents/skills/susu-overview/styleguide/toolbar.md`](../../../.agents/skills/susu-overview/styleguide/toolbar.md)，这里只给结论与依据。

| 维度 | orca titlebar | innate-fe webshell header | 结论 |
| --- | --- | --- | --- |
| 高度 | 36px 固定 | `h-12`（48px），classic 变体 `h-14` | **36px**（物理顶栏）；`h-12` 下沉为内容区二级 header |
| 位置 | 窗口顶部 | `sticky top-0 z-30` | 窗口顶部，不 sticky |
| 背景 | `var(--card)` | `bg-background` | `var(--card)` |
| 拖拽 | `-webkit-app-region: drag` | 无 | 同 orca；交互元素显式 `no-drag` |
| 左区 | `.titlebar-left`（`--worktree-sidebar` 底 + inset 阴影） | 图标 rail 64px + 子菜单 256px | 栏宽沿用 webshell；`.titlebar-left` 沿用 orca |
| 中区 | `flex-1` 中央区 | 标题 + `Badge` | 当前视图标题 |
| 右区 | `.titlebar-icon-button` | `Badge` + `LocaleSelector` + `ThemeSelector` | **webshell 那三项**，主题切换只有 `ThemeSelector` 一个入口 |
| 窗口控件 | 右侧 fixed，3 × 46px = 138px | 无 | 同 orca（Windows/Linux）；macOS 用原生红绿灯 + 80px 占位 |

**为什么是「物理壳用 orca、内容语义用 webshell」**：窗口控件只有桌面端有，webshell 的 48px sticky header 承载不了；反过来，「左标题 / 右工具区」的分区是 innate 家族共有的交互语言，桌面端应当一致，否则同一产品两种形态下头部布局不同，用户要重新学习。36px 装得下右侧那三件 24–28px 的小件。

**对齐带来的具体改动**：

| 发现 | 改动 |
| --- | --- |
| `@innate/ui` 的 `Button` 默认 h-7（orca h-9），36px 顶栏里偏小 | 顶栏按钮统一 `icon-sm` / `icon-xs` |
| `@innate/ui` 把内部 svg 压到 `size-3`（orca 用 16px） | 顶栏图标显式 `size-4` |
| `@innate/ui` 的 `ghost` hover 是 `bg-muted`（orca 用 `accent`） | 顶栏图标按钮用 `shell.css` 的 `.titlebar-icon-button` / `.sidebar-toggle`，不用 `Button variant="ghost"` |
| `@innate/ui` 的 `TooltipProvider` 缺省 `delay=0` | 顶栏区域包 `<TooltipProvider delay={400}>` |
| orca 的关闭按钮 hover 写死 `#c42b1c`；`--destructive` 是 `#e7000b` 级别 | 产品层新增 `--window-control-close-hover` / `--window-control-close-foreground`（明暗成对） |
| Base UI 浮层的 Portal 是否落在 Electron 拖拽区内 | 实现时逐个验证；可能需要在浮层根加 `no-drag` |

## 8. 落地位置

| 对齐内容 | 落在哪 |
| --- | --- |
| 中性色冻结 + 产品扩展 token | `packages/theme/src/tokens.css` |
| 壳 chrome 类名（titlebar / 窗口控件 / 滚动条 / 选中配方） | `packages/theme/src/shell.css` |
| 机器可读契约（默认变体、token 清单、共享 token 快照） | `packages/theme/src/theme.ts` |
| token 纪律的测试 | `packages/theme/src/theme.test.ts` |
| 执行副本（规则） | `.agents/skills/susu-overview/STYLEGUIDE.md` + `styleguide/` |
| 复核脚本 | `tools/compare-palette.mjs` |

## 9. 尚未对齐的部分

| 项 | 状态 | 何时处理 |
| --- | --- | --- |
| 安全表面（`--security-*` token + `DialogContent` 变体） | 待基础仓 | 第一个涉及信任/审批的对话框落地前 |
| `ShortcutKeyCombo` 的平台分隔 | 用 `Kbd` 过渡 | 需要多键 chip 组合时 |
| 多选 combobox | 用 `Command` + `Popover` 过渡 | 出现多选搜索需求时 |
| 对话区 `--chat-*` token | 未实现 | 对话区落地时 |
| 终端标题 token | 未实现 | 终端落地时 |
| Electron 拖拽区与 Base UI 浮层的层级 | 未验证 | 桌面壳落地时 |
