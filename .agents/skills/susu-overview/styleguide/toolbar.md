# 壳的 toolbar 规格

[`../STYLEGUIDE.md`](../STYLEGUIDE.md) 里「壳的 toolbar」一节的展开。本文把 **orca 的 titlebar**、**innate-fe webshell 的 header** 和 **innate-desktop 的桌面顶栏** 三者对上，给出可直接实现的规格。

## 结论（先给答案）

**innate-desktop 是 Electron 桌面应用，顶栏采用 orca 的 `.titlebar`（36px 物理壳 + 自绘窗口控件）；内容语义采用 innate-fe webshell header 的分区（左侧标题、右侧 Badge + LocaleSelector + ThemeSelector）。**

理由：

1. **窗口控件只有桌面端有。** webshell 是网页，它的 `sticky` header（h-12）不可能承载最小化/最大化/关闭，也不需要拖拽区。orca 的 36px titlebar 是桌面形态的正解。
2. **内容语义是 innate 家族共有的交互语言。** webshell header 的「左标题、右工具区」分区在桌面端应保持一致，否则同一个产品在网页形态与桌面形态下头部布局不同，用户会重新学习。
3. **两者的物理参数不冲突。** 36px 能装下 webshell 那套右侧控件（Badge + Locale + Theme 都是 24–28px 的小件），不需要为了塞进去把顶栏抬到 48px。
4. **控件本身按规范取 `@innate/ui`，不拷 orca 的裸 class。** plan W1a.3 与 plan1 评审（2026-10-28）已定：toolbar 用 Button `outline`、图标按钮用 `ghost`，不把 orca 那段 `titlebar-icon-button` class 搬过来。

## 三方对照

| 维度 | orca titlebar（Electron） | innate-fe webshell header（Web） | innate-desktop 结论 |
| --- | --- | --- | --- |
| 形态 | 窗口顶部，`display: flex` | `sticky top-0 z-30` 的 `<header>` | 窗口顶部，**不 sticky**（本来就固定） |
| 高度 | `36px`（`height` + `min-height`） | `h-12`（48px）；classic 变体 `h-14`（56px） | **36px**（物理顶栏）；`h-12` 留给**内容区二级 header** |
| 背景 | `var(--bg-titlebar, var(--card))` | `bg-background` | `var(--card)` |
| 底边 | `border-bottom: 1px solid var(--border)` | `border-b` | 同 orca |
| 拖拽 | `-webkit-app-region: drag` + `user-select: none` | 无（网页） | 同 orca；交互元素显式 `no-drag` |
| 左侧分区 | `.titlebar-left`：底色 `--worktree-sidebar`，用 `inset 0 -1px 0 var(--border)` 代替 border（保住 36px 内容高度与红绿灯 y 轴对齐） | 图标 rail 64px + 子菜单 256px | 左侧栏由桌面布局定；rail 64px / 子菜单 256px 的**宽度**可沿用 webshell |
| 中间分区 | `flex-1` 中央区（workspace chrome） | 标题 + `Badge variant="secondary"` | 当前视图标题（面包屑 / 视图名） |
| 右侧分区 | 裸 `button.titlebar-icon-button` 一组 | `LocaleSelector` + `ThemeSelector` | **同样三项**：`Badge` + `LocaleSelector` + `ThemeSelector`（按钮本身用 `@innate/ui` Button `ghost`） |
| 窗口控件 | 右侧 `position: fixed`，3 × 46px = 138px | 无 | 同 orca（Windows/Linux）；macOS 用原生红绿灯 |
| 交通灯 | `.titlebar-traffic-light-pad` 占 80px | 无 | 同 orca |
| 整条内边距 | 无（由子元素自带 padding） | `px-4` | **顶栏不加整体 padding**；内容区二级 header 用 `px-4` |

## 物理壳规格（实现级）

类名与取值都在本仓 `packages/theme/src/shell.css`，这里只写**为什么**。注意本层**只放不是按钮的 chrome**（titlebar 布局、窗口控件、红绿灯占位、滚动条）——按钮归 `@innate/ui` 的 Button，不在本层复制 orca 的裸 class。

```css
.titlebar {
  height: 36px;
  min-height: 36px;
  display: flex;
  flex-direction: row;
  align-items: center;
  background: var(--bg-titlebar, var(--card));
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
  user-select: none;
}
```

- **36px 是硬约束。** macOS 红绿灯、标签条、窗口控件三条基线都锚在 36px 上；改高度会连带破坏红绿灯 y 轴对齐（orca 用 `inset` 阴影代替 `border` 就是为了这个）。
- **整条是拖拽区。** 任何可交互元素（按钮、菜单、下拉）必须显式 `-webkit-app-region: no-drag`，否则在 Electron 里点不动。orca 因此给 `[data-radix-popper-content-wrapper]`、Dialog / Sheet 的 overlay 与 content 也加了 `no-drag` —— **本仓用 Base UI，浮层由 Base UI 渲染，需重新核对浮层是否落在拖拽区内**（实现时逐个验证，不要照抄 orca 的选择器）。
- `--bg-titlebar` 目前**未声明**，恒定回落到 `--card`。保留这个钩子位：将来若要让顶栏与画布区分，改一个 token 即可，不用动 CSS。

### 左侧分区

```css
.titlebar-left {
  height: 36px;
  background: var(--worktree-sidebar);
  box-shadow: inset 0 -1px 0 var(--border);  /* 不用 border，保住内容高度 */
}
.titlebar-left-floating { background: var(--bg-titlebar, var(--card)); }
```

侧栏收起时该 header 会浮在标签条上，所以要有一个「浮起」变体把底色换回 titlebar 面色——否则会出现一条不属于任何面板的色块。

### 交通灯占位

```css
.titlebar-traffic-light-pad { width: calc(80px / var(--ui-zoom-factor, 1)); }
```

除以缩放因子是必须的：Electron 的红绿灯不随页面 zoom 缩放，占位不补偿就会在 125% / 150% 缩放下错位。**Mac 上不要把可点击目标放进这 80px 里。**

### 窗口控件（Windows / Linux）

```css
.window-controls { position: fixed; top: 0; right: 0; z-index: 9999; height: 36px; }
.window-controls-btn { width: 46px; height: 36px; color: var(--muted-foreground); }
.window-controls-btn:hover { background: var(--accent); color: var(--foreground); }
.window-controls-close:hover { background: var(--window-control-close-hover); color: var(--window-control-close-foreground); }
.window-controls-titlebar-spacer { width: var(--window-controls-width, 0px); }
```

- **固定定位 + 占位 spacer 是同一套机制。** 窗口控件 `position: fixed` 浮在右上角，它不会占据文档流位置，所以内容区必须用 `.window-controls-titlebar-spacer` 预留 `--window-controls-width`（3 × 46 = 138px），否则顶栏右侧的内容会被盖住。
- **关闭按钮的红色不用 `--destructive`。** orca 写死 `#c42b1c`；`@innate/ui` 的 `--destructive` 是 `oklch(0.577 0.245 27.325)`（约 `#e7000b`），更亮更饱和，hover 观感会跳。产品层为此单开 `--window-control-close-hover` / `--window-control-close-foreground` 两个 token（明暗成对，值相同）。
- **自绘控件只在 Windows / Linux 用。** macOS 保留原生红绿灯，只留 `.titlebar-traffic-light-pad` 占位。

## 内容语义规格

照抄 webshell header 的分区，控件换成 `@innate/ui` 的：

| 位置 | 控件 | 来源 |
| --- | --- | --- |
| 左 | 当前视图标题（`truncate`，13px / `font-semibold` / `tracking-tight`） | 纯文本 |
| 右 | `Badge variant="secondary"`（计数量等） | `@innate/ui` |
| 右 | `LocaleSelector` | `@innate/ui` |
| 右 | `ThemeSelector` | `@innate/ui`（**唯一**主题切换入口） |

- **主题切换只有 `ThemeSelector` 一个入口。** 不要在顶栏另写一份明暗开关。
- 标题字号取 13px（`@innate/ui` 的 chrome 尺度），不用 webshell 的 `text-sm`（14px）——14px 是内容区正文字号。详见 [components.md](./components.md#orca--innateui-按钮差异)。

## 与 `@innate/ui` 的差异处置

| 项 | 问题 | 处置 |
| --- | --- | --- |
| `Button` 默认高 `h-7`（orca 是 `h-9`） | 36px 顶栏里塞 h-9 会顶满；h-7 则上下各留 4px | **顶栏内的按钮统一用 `size="icon-sm"`（24px）或 `icon-xs`（22px）**；顶栏不放文字主按钮 |
| `Button` 把内部 svg 压到 `size-3`（orca 用 16px） | 顶栏图标偏小 | 顶栏图标**显式**写 `size-4` |
| `Button variant="ghost"` 的 hover 是 `hover:bg-muted`（orca 用 `accent`） | 基础仓 ghost 走 muted，与 orca 的观感略有差异 | **顶栏内的图标按钮就用 `Button variant="ghost"`**——plan W1a.3 与 plan1 评审已定「壳控件按规范取 `@innate/ui` Button（toolbar 用 `outline`、图标用 `ghost`），不拷 orca 的裸 `titlebar-icon-button` class；不造 Toolbar 原语」。观感差异靠基础仓后续调 `ghost` 的 hover 色解决，桌面端不私自加壳级按钮 class |
| `TooltipProvider` 默认 `delay={0}`（orca 400ms） | 鼠标扫过顶栏就闪 | 顶栏区域包一层 `<TooltipProvider delay={400}>` |
| Base UI 的 `render` prop | orca 的 `asChild` 写法不适用 | 见 [components.md](./components.md#primitive-约定) |
| `Kbd` 不做平台分隔符 | 顶栏 tooltip 里的快捷键 chip | 见 [components.md](./components.md#快捷键-chip) |

## 内容区二级 header

webshell 的 `h-12` 在桌面端不是消失，而是**下沉一层**：

- **物理顶栏**（36px）：窗口 chrome —— 拖拽区、窗口控件、面包屑、全局动作。
- **内容区二级 header**（`h-12`）：面板级标题 —— 工作树侧栏头、编辑面板上方、筛选栏。用 `bg-background`、`border-b`、`px-4`，与 webshell header 同规格。

orca 的 `.editor-header`（`min-height: 32px`，`padding: 3px 14px`，底色 `--editor-surface`）是**编辑器面板自己的** header，比二级 header 更窄、更贴内容。它已经迁到本仓 `shell.css`，保持原样。

## 未决项

| 项 | 状态 |
| --- | --- |
| Electron 浮层（Base UI Portal）是否落在拖拽区内 | 实现时逐个验证，可能需要在浮层根上加 `no-drag` |
| `--window-controls-width` 由主进程按平台注入 | 待桌面端落地时接上 |
| `--ui-zoom-factor` 由主进程同步 | 同上 |
| macOS 原生红绿灯 vs 自绘 | 用原生；自绘只在 Windows / Linux |
| 顶栏在多标签/多工作区下的内容 | 等桌面端布局确定 |
