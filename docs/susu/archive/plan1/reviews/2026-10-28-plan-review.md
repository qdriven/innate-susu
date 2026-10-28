# plan1 评审 · 2026-10-28

> 评审对象：`docs/susu/plan1/` v1.0（README、01、02、03、`phases/W1-shell.md`）。
> 结论：**W0–Q3 主线保留。** 要改的是视觉规范指向、组件来源，以及 W1 把窗口顶栏和中栏多标签捆在一段。
> 本文件是建议，**尚未改状态板和任务卡**。采纳后改 README §3、03 分段表、02 §3、`phases/W1-shell.md`，再按 README 的 canvas 纪律重做 audit。

## 1. 已落地（评审之后）

Style Guide 的执行副本已放进总控技能，不必再在 plan1 里重写一份：

| 文件 | 作用 |
| --- | --- |
| `.agents/skills/susu-overview/STYLEGUIDE.md` | orca `docs/STYLEGUIDE.md` 原样副本 |
| `.agents/skills/susu-overview/styleguide/` | color / components / ux-rules / ux-review-rubric / native-chat |
| `.agents/skills/susu-overview/SKILL.md` § Style guide | 路径替换表。副本正文不改 |

上游只读路径：`innate-labs/references/orca/docs/STYLEGUIDE.md`。token 值的上游在同仓 `src/renderer/src/assets/main.css`。

## 2. 计划指错了 Style Guide

W1.1 要修订的是本仓草案 `docs/original/innate-dogic/architecture/style-guide.md`（v3.0：token 名 `--surface-base`，明暗写 `prefers-color-scheme`）。该文件已从技能路由表移除，标为不执行。

执行规范是 orca 的 STYLEGUIDE：角色名是 `background` / `card` / `sidebar*`，明暗是 `:root` 与 `.dark`。这与 susu-overview 硬规则 2、4 一致，与草案不一致。

采纳时从 W1.1 删掉「修订本仓 style-guide」那句。视觉规则改指技能副本。`native-chat.md` 不执行（对话 UI 是 DSH）。

## 3. 三条修改

### 3.1 组件只从 `@innate/ui` 取

01 §4 写「缺的布局三段先在基础仓补，不在本仓自绘」。02 §3 写「布局三段和状态 pill 先在本仓 L2 落地，多处复用再上提」。两句矛盾。

以技能硬规则 1 和 orca「先用已有 primitive」为准：

| 层 | 落点 | 例子 |
| --- | --- | --- |
| primitive | innate-fe `@innate/ui`。缺了去基础仓 `pnpm ui:add`，再 `pnpm ui:sync` | Button、Tooltip、DropdownMenu、Separator、Badge、Sidebar、Tabs、ThemeProvider |
| 壳组合 | 本仓 desktop renderer | 顶栏怎么排、窗口拖拽、模式 pill 的行为、页面注册表 |
| 平台五原语 | 本仓，P 系列后置，不回灌 innate-fe | PurposeBar、WidgetCard、ApprovalModal、PluginCard、PageDefinition |

`@innate/ui` 和 orca 都没有 Toolbar 原语。不要为这个名字去基础仓加组件，也不要在本仓自绘一套按钮。Sidebar 已在 `@innate/ui`，W1 消费它，不在 `shell/` 再写一个。

orca 顶栏图标目前是裸 `button.titlebar-icon-button`。规范要求 toolbar 用 Button `outline`、图标用 `ghost`。壳控件按规范，不把那段 class 拷过来。

### 3.2 壳的第一段只做窗口 titlebar

现在的 W1（2–3 天）一次做 token、整段三栏、拆 `App.tsx`、中栏多标签。多标签是行为变更（detach 不销毁），不应和换顶栏绑在同一次验收里。

orca 的窗口铬面是 `.titlebar`（`main.css`，高 36px），不是侧栏底部的 `SidebarToolbar`：

- 左：`app-shell/TitlebarLeftControls`。Windows/Linux 为 logo + 应用菜单；Mac 留 `titlebar-traffic-light-pad`。
- 中：`TitlebarMainStrip` 的 `#titlebar-tabs`。第一段只留空槽。
- 右：右栏开关与 `window-controls-titlebar-spacer`（3×46px）。背景 `var(--bg-titlebar, var(--card))`。

`SidebarToolbar`（设置、看板）是左栏页脚，归后面的左栏段或更后。

建议把 W1 拆成：

| 段 | 做什么 | 明确不做 | 依赖 |
| --- | --- | --- | --- |
| W0 | 基线整树迁入 | 不改布局 | — |
| W1a | Tailwind + `@innate/ui/tokens.css` + ThemeProvider；只换窗口 titlebar。状态槽留空 | 不重写 Sidebar，不拆页面，不改 surface 多标签，不接 magpie pill | W0。视觉规则读技能副本 |
| W1b | `@innate/ui` Sidebar、ContentArea、拆 `App.tsx`；`pages.ts` 不动 | 不改 attach 语义 | W1a |
| W1c | 原 W1.3 多标签 + W1.4 overlay | 不改 magpie/DSH 启动 | W1b |

W0 仍是代码进仓的前提：桌面 renderer 还不在本仓，不能跳过整树迁入去改壳。「先执行」指壳工作的第一段。W2 的网关 pill 挂到 W1a 留出的状态槽。W3 起顺序不变。

### 3.3 字体：基础仓给默认值，使用方覆盖

已定。不把 Geist 写进基础仓默认栈（基础仓示例加载的是 Inter，改默认会让没加载 Geist 的应用落到系统字体）。

`packages/ui/src/tokens.css` 的 `:root` 提供 `--font-sans` / `--font-serif` / `--font-mono`。`@theme inline` 和 `body` 都引用这些变量。使用方在自己的入口里、`@import "@innate/ui/tokens.css"` 之后重设变量，并加载对应字体文件。本仓桌面壳覆盖为 Geist / Geist Mono。组件里不写 `font-family`。

带字体的 `data-theme`（如 marshmallow）比使用方的 `:root` 更具体，选中时覆盖使用方。桌面壳不用这些主题即可保持 Geist。改完基础仓后，本仓要 `pnpm ui:sync` 才会吃到新的 tokens.css。

## 4. 采纳时要改的计划正文

| 文件 | 改什么 |
| --- | --- |
| `README.md` §2 第 3 条 | 视觉规则指向 orca STYLEGUIDE 的技能副本；实现不拷 orca 源码 |
| `README.md` §3 状态板与依赖图 | W1 拆成 W1a / W1b / W1c |
| `03-migration-plan.md` §2 | 同一分段 |
| `02-module-analysis.md` §3 | 删掉「壳原语先在本仓 L2 落地」 |
| `01-project-analysis.md` §4 | 「布局三段先补进基础仓」收窄为：缺的 primitive 才进 innate-fe；三段壳是本仓组合 |
| `phases/W1-shell.md` | 第一张任务卡改为 titlebar；删掉修订本仓 style-guide 的句子 |
| `canvas/docs/sprints/S1-w1-shell.md` | 随 W1 拆分后重做 audit，不手改 `out/` |
| `docs/README.md` | 仍把 P0 写成下一执行项，并把 TitlebarStrip 算作 innate-fe 的壳原语。改成指向 plan1，避免下一会话走旧 P 系列 |

## 5. 不改

DSH / magpie / 壳的角色分工、W2 与 W3 可并行、W4 起的串行、P 系列后置、硬约束、一段一验收。
