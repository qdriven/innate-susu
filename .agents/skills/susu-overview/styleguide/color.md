# Color roles in detail

[`../STYLEGUIDE.md`](../STYLEGUIDE.md#color) 的展开。本文只讲**角色与来源**；数值在 `@innate/ui`（基础仓）与本仓 `packages/theme/src/tokens.css`。

## 三层来源

| 层 | 事实源 | 管什么 |
| --- | --- | --- |
| 基础层 | `@innate/ui` → `packages/ui/src/tokens.css`（`@innate/ui/tokens.css`） | 语义 token 定义面、明暗 `.dark` 机制、`data-theme` 变体 |
| 产品层 | 本仓 `packages/theme/src/tokens.css` | orca 观感冻结 + 产品扩展 token（git 装饰、状态色、工作项状态） |
| 变体层 | `@innate/ui` → `packages/ui/src/themes/*.css` | `shadcn-zinc` / `shadcn-slate` / `shadcn-stone` / `shadcn-gray` / `shadcn-neutral` / `linear` / `notion` / `marshmallow` / `art-deco` / `webshell` |

优先级：变体块里写出来的属性，`[data-theme]` 高于产品层 `:root` / `.dark`；没写的仍是产品层。产品层再高于基础 `:root`。

- **`data-theme="default"`**（没有对应 CSS 规则）→ 产品层。亮色与基础 `:root` 同值；暗色固定 4 处差异。
- **`shadcn-*`** → 只换它声明的 surface / accent / border / ring。sidebar、chart、font 仍是产品层。
- **`linear` / `notion` / `webshell`** → 连 sidebar 一起换（`linear` 还换 chart）。
- **`marshmallow` / `art-deco`** → 连 `--font-sans` 一起换。

明暗只走 `.dark` class（`@custom-variant dark (&:is(.dark *))`）。CSS 不写 `prefers-color-scheme`。`color-mode=system` 时 `ThemeProvider` 用 `matchMedia` 决定是否加 `.dark`，并写 `data-theme`（`color-mode` / `theme-variant` 存在 localStorage）。切换入口只有 `ThemeSelector`。

## 角色表

Token 成对出现：一个 **surface** 和一个在它上面**满足对比度的 foreground**。永远成对使用。

| 角色 | 用于 | 不用于 |
| --- | --- | --- |
| `background` / `foreground` | app 画布、默认文字 | 卡片、浮层、侧栏（各有自己的） |
| `card` / `card-foreground` | 从画布抬起的面板 | 画布本身 |
| `popover` / `popover-foreground` | 浮层菜单、下拉、hovercard | 内联 UI |
| `primary` / `primary-foreground` | 一个流程里唯一的肯定动作（保存、确认） | 装饰性强调、hover 态、次要动作 |
| `secondary` / `secondary-foreground` | 紧邻 primary 的低强调兄弟 | 肯定动作本身 |
| `muted` / `muted-foreground` | 去强调文字、说明、占位符、禁用态外壳 | 正文、肯定动作 |
| `accent` / `accent-foreground` | ghost 按钮与列表行的 hover/active 底色 | 实心按钮（用 `secondary`） |
| `destructive` / `destructive-foreground` | 删除、丢弃、不可逆动作、错误态 | Cancel（Cancel 不是破坏性操作） |
| `border` | 所有发丝线：分隔线、输入框描边、卡片边缘 | 重强调（那是 `ring`） |
| `input` | 只给表单字段底色 | 表单字段以外 |
| `ring` | focus-visible 描边、选中光环 | 常驻装饰 |
| `sidebar` 家族 | 侧栏及其子元素 | 其它面板 |
| `worktree-sidebar` 家族 | 工作树侧栏（比通用 `sidebar` 更靠近画布的一层） | 其它面板 |
| `editor-surface` | Monaco / Markdown 预览的面板底色 | app 外壳 |

`sidebar` 家族（`--sidebar`、`-foreground`、`-primary`、`-primary-foreground`、`-accent`、`-accent-foreground`、`-border`、`-ring`）只给侧栏用，让 hover / selected / focus 三态在侧栏里自洽、不外溢。

`editor-surface` 是独立 token 而不是复用 `background`：编辑器与 Markdown 面板在暗色下要更沉一层，贴合编辑器惯例。

## orca ↔ `@innate/ui` 中性色对照

**结论：基础 `:root`（oklch Neutral，不是变体 `shadcn-neutral`）的亮色与 orca 逐 token 相等；基础 `.dark` 有 4 处不相等，产品层按 orca 固定这 4 处。** 产品层把这套值冻结在仓里，避免基础仓改 Neutral 时桌面端观感漂移。

亮色：**全部相等**（`#fff` 与 `oklch(1 0 0)` = `#ffffff` 是写法差异，值相同）。

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
| `sidebar` 家族 | `#fafafa` / `#0a0a0a` / `#171717` … | 同值 | ✅ |

暗色：**相等除下表 4 处**。这 4 处是本仓与 innate-fe 唯一真正「对不上」的中性色，处理方式见「差异处置」。

| token | orca | `@innate/ui` 基础 `.dark` | 差 |
| --- | --- | --- | --- |
| `accent` | `#404040` | `oklch(0.269 0 0)` = `#262626` | orca 亮一档 |
| `border` | `rgb(255 255 255 / 0.07)` | `oklch(1 0 0 / 10%)` | 透明度 7% vs 10% |
| `sidebar-border` | `rgb(255 255 255 / 0.07)` | `oklch(1 0 0 / 10%)` | 同上 |
| `sidebar-ring` | `#525252` | `oklch(0.556 0 0)` = `#737373` | orca 更收敛 |
| `input` | `rgb(255 255 255 / 0.15)` | `oklch(1 0 0 / 15%)` | ✅ 相等 |
| `chart-1..5` | 蓝阶 `--color-blue-300..800` | 基础多彩（橙/青/深蓝/黄/红） | 产品层覆盖成蓝阶 |

### 差异处置

| 差异 | 处置 | 理由 |
| --- | --- | --- |
| 暗色 `accent` | **产品层固定 orca 的 `#404040`** | 基础仓的 `#262626` 等于暗色 `muted`，ghost 按钮与列表行 hover 会几乎看不见。orca 的 hover 底色明显亮一档，是有意的。 |
| 暗色 `border` 7% | **产品层固定 7%** | 基础仓 10% 在 `#171717` 的 `--card` 上是一道可见描边；orca 的观感是「发丝线」。发丝线更符合桌面工作台「退后」的定位。 |
| 暗色 `sidebar-border` 7% | 同上 | 与 `--border` 同理。 |
| 暗色 `sidebar-ring` `#525252` | **产品层固定 orca 值** | 侧栏 focus 环比通用 ring 更收敛，避免侧栏里到处是亮圈。 |
| `chart-1..5` | **产品层覆盖成蓝阶** | 图表在桌面端是辅助信息，单色阶比多彩更安静。 |
| `--font-sans` = Inter | **产品层覆盖成 Geist** | orca 用 Geist。`@innate/ui` 基础层是 Inter，且依赖 `@fontsource-variable/inter`；产品层改写 `--font-sans` 并自带 `Geist-Variable.woff2`（`packages/theme/src/fonts/`），不新增下载依赖。 |
| `--font-mono` 缺 `SF Mono` / `Cascadia Code` | **产品层补齐 orca 顺序** | 终端与代码相关 UI 用 `var(--font-mono)`。 |

> 写具体值时，**明暗必须成对**声明（`:root` 与 `.dark` 各一份）。`packages/theme` 的测试会校验这一点。

## orca 独有、基础仓没有的 token

这些是产品 token 层的全部存在理由，都在本仓 `packages/theme/src/tokens.css`：

| 家族 | token | 用途 |
| --- | --- | --- |
| 编辑器 | `--editor-surface` | 编辑器/Markdown 面板底色 |
| 工作树侧栏 | `--worktree-sidebar`、`-foreground`、`-accent`、`-accent-foreground`、`-border`、`-ring` | 比通用 `sidebar` 更靠近画布的一层 |
| 状态 | `--status-success`、`--status-warning`（+ `-background` / `-border`） | 只表示状态，不做装饰 |
| Git 装饰 | `--git-decoration-added/-modified/-deleted/-renamed/-untracked/-copied/-ignored` | 只给 git 状态 |
| Diff | `--diff-added-ground/-gutter`、`--diff-removed-ground/-gutter` | diff 底色与 gutter |
| Git graph | `--git-graph-ref`、`-remote-ref`、`-base-ref`、`-lane-1..5` | 泳道色 |
| Agent | `--agent-question`、`-question-text`、`--agent-working`、`--ai-action-accent` | agent 状态 |
| 工作项 | `--workspace-status-done/-review/-progress` | 工作项状态（明暗同值） |
| 高亮 | `--annotation-highlight`、`--markdown-search-match`、`-active` | 批注与检索 |
| 分组线 | `--tab-group-split-divider`、`-strong` | 分组分隔线（需对 `--card` 达 3:1，`--border` 太淡） |
| 终端 | `--terminal-pane-locate`、`--terminal-pane-title-on-*` | 终端面板标题（终端未实现，暂不用） |
| 对话 | `--chat-*-mix`、`--chat-content-max-width` | 对话区（未实现，见 [native-chat.md](./native-chat.md)） |
| 安全表面 | `--orca-security-*` | orca 的安全表面配色；本仓改名为 `--security-*` 并需要向基础仓补 primitive（见 [components.md](./components.md#orca-专属能力与本仓缺口)） |

## Git 装饰色

diff 状态、文件树装饰、变更视图用 `--git-decoration-*`：`added`、`modified`、`deleted`、`renamed`、`untracked`、`copied`、`ignored`。这套配色沿用用户已经熟悉的编辑器惯例，不制造惊喜。

**只用于 git 状态。** 不要挪作其它状态色——那会破坏惯例。

## 列表行：hover / selected / current

最容易漂移的地方。任何列表式行（工作树、命令面板条目、设置导航）都按这个来：

- **静止**：透明底色。
- **hover**：`bg-accent`（工作树侧栏内用 `bg-sidebar-accent`）。
- **键盘选中（cmdk highlight）**：不要只靠浅色浮层上的平铺 `bg-accent`——浅色下 `--accent`（`#f5f5f5`）与 `--background`（`#fff`）几乎相同，光标会消失。改用 `packages/theme/src/shell.css` 里的选中配方（`color-mix` 把 foreground 混进 background + inset ring），并配 `data-selected="true"`。`cmdk` 会自动写这个属性。
- **常驻的「当前行」**（例如用户正在看的那个工作树）：同样是 `bg-accent`，**外加** `data-current="true"`，让 CSS 与后续样式能把「当前」和「键盘高亮」区分开。
- **不要**硬写 `bg-[#ededed]` / `bg-[#333333]`，也不要自造「选中色」。用 `color-mix` 从现有 token（`foreground` / `background` / `accent`）混出来，明暗才自动对齐。

## 颜色混用

需要淡色（例如 12% 的 primary 洗色）就用 `color-mix` 配现有 token，不要新造 hex：

```css
background: color-mix(in srgb, var(--primary) 12%, var(--background));
```

产品层里的 `--status-*-background`、`--diff-*-ground` 就是这么写的——明暗自动成对，不用手写两套。
