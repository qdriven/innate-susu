# innate-desktop UI Style Guide

UI 规则。本文件描述**角色与规则**，不承载数值——数值在 token 层里（见下）。

派生自 orca 的 style guide（`innate-labs/references/orca/docs/STYLEGUIDE.md`），已按 innate-desktop 的实际基座（`@innate/ui` + `packages/theme`）重写。orca 原文与本文件的差异见 [对齐说明](#与-orca-原文的差异)。

**产品身份是「单色、安静」**：中性灰承担外壳，颜色只留给状态（选中环、破坏性操作、git 装饰）。桌面工作台大量承载别人的 UI（编辑器、终端、Markdown 预览），它自己的界面应该退后、只做框。拿不准时：

- 先用 **muted / accent / border**，再用颜色；
- 先用 **CSS 变量**，再想硬编码；
- 先找**最接近的 `@innate/ui` primitive**，再考虑自定义。

## 分层：token 从哪来，primitive 从哪来

| 层 | 事实源 | 内容 | 谁能改 |
| --- | --- | --- | --- |
| primitive 与主题机制 | `@innate/ui`（基础仓 innate-fe，`packages/ui/src/tokens.css` + `src/themes/`） | 语义 token 定义面、明暗 `.dark` 机制、`data-theme` 变体、58 个 primitive（Base UI 底座） | 基础仓 `fe-ui` 技能 |
| 产品 token 层 | 本仓 `packages/theme/src/tokens.css` | orca 观感冻结 + 产品扩展 token：git 装饰、状态色、壳 chrome 尺寸 | 本仓（成对声明 `:root` + `.dark`） |
| 壳 chrome 层 | 本仓 `packages/theme/src/shell.css` | titlebar / 窗口控件 / 滚动条的类名（**按钮不在这一层**，按钮归 `@innate/ui` 的 Button） | 本仓（只引用 token，不写字面量） |

消费方的 CSS 入口顺序固定为：

```css
@import "tailwindcss";
@import "@innate-desktop/theme/index.css";  /* = tokens.css + shell.css */
@source "./";
@source "../../../node_modules/@innate/ui/src";
```

`@source` 必须写在所有 `@import` 之后。**不要** `@import "@innate/ui/globals.css"`。消费方引 `@innate-desktop/theme/index.css`，由它再引 `@innate/ui/tokens.css`。

优先级：变体块里**写出来的**属性，其 `[data-theme]` 选择器高于产品层 `:root` / `.dark`；没写的属性仍是产品层。产品层再高于 `@innate/ui` 基础 `:root`。

**`default` 没有 `[data-theme="default"]` 规则。** `ThemeProvider` 仍把属性写成 `default`，因此用产品层。这是基础仓 oklch Neutral，不是变体 `shadcn-neutral`。亮色共享 token 与基础 `:root` 同值；暗色产品层固定 4 处（`accent` / `border` / `sidebar-border` / `sidebar-ring`）。`shadcn-*` 不声明 sidebar、chart、font，选中后这三组仍走产品层。`linear` / `notion` / `webshell` 声明了 sidebar。`marshmallow` / `art-deco` 声明了 `--font-sans`，会盖过 Geist。

## 深入阅读

只在任务碰到对应主题时读：

- [`styleguide/color.md`](./styleguide/color.md)：角色表、orca ↔ `@innate/ui` token 对照、git 装饰、列表行状态。选 surface/foreground 配对或给列表行上色时读。
- [`styleguide/components.md`](./styleguide/components.md)：primitive 清单与可用性、按钮、选型表、tooltip、图标、快捷键 chip、表单、滚动条。动某个 primitive 时读。
- [`styleguide/toolbar.md`](./styleguide/toolbar.md)：**壳的 toolbar 规格**——orca titlebar chrome 与 innate-fe webshell header 的对齐结论。做壳、窗口控件、标签条时读。
- [`styleguide/native-chat.md`](./styleguide/native-chat.md)：原生对话区的字号与配色。当前尚未实现，先作为后续对话 UI 的约束读。
- [`styleguide/ux-rules.md`](./styleguide/ux-rules.md)：UX 规则的推理。规则适用不清楚时读。
- [`styleguide/ux-review-rubric.md`](./styleguide/ux-review-rubric.md)：整屏评审清单。评审或打磨一个页面、截图、原型时读。

## Tokens

- 颜色、`@theme inline` 绑定、字号、滚动条、titlebar chrome 的类名在 `packages/theme/src/` 下；primitive 在 `@innate/ui`。
- **组件代码里不写 hex**。要新颜色先在 `packages/theme/src/tokens.css` 里加 token，并在 `:root` 与 `.dark` 中**成对**声明（`packages/theme` 的测试会校验这一点），再在 `@theme inline` 里暴露成 Tailwind 工具类。
- 需要淡色（hover 的 12% 品牌色）就 `color-mix(in srgb, var(--token) N%, var(--background))`，不要新造 hex，明暗才自动对齐。

## Color

Token 成对出现：一个 **surface** 和一个在它上面**满足对比度的 foreground**。永远成对使用。

- `background` = app 画布；`card` = 从画布上抬起的面板；`popover` = 浮层菜单；`input` = 只给表单字段底色。
- `primary` = 一个流程里唯一的肯定动作，绝不做装饰、hover 或次要动作；`secondary` = 紧邻的低强调兄弟。
- `muted` = 去强调文字、说明文字、占位符、禁用态外壳；不做正文。
- `accent` = ghost 按钮与列表行的 hover/active 底色；不做实心按钮（用 `secondary`）。
- `destructive` = 删除、丢弃、不可逆动作与错误态；**不做 Cancel**。
- `border` = 所有发丝线；`ring` = focus-visible 描边与选中光环，不做常驻装饰。
- `sidebar*` 只在工作树侧栏内用；`editor-surface` 给编辑器/Markdown 面板，不给 app 外壳。
- `--git-decoration-*` 只给 git 状态，不做其它状态色。
- **列表行**：静止透明；hover 用 `bg-accent`（侧栏内用 `bg-sidebar-accent`）；cmdk 键盘选中不要只靠浅色浮层上的平铺 `bg-accent`（浅色下 `--accent` 与 `--background` 几乎相同，光标会消失），改用 `packages/theme/src/shell.css` 的选中配方并配 `data-selected="true"`；常驻的当前行用 `bg-accent` 加 `data-current="true"`。不要自造「选中色」。

完整角色表见 [color.md](./styleguide/color.md)。

## Typography

- Sans 是 **Geist**（本仓 `packages/theme/src/fonts/Geist-Variable.woff2` 已随包分发）。**不用 Inter**，也不用系统 sans。
- Mono 用 `var(--font-mono)`：路径、代码、终端相关 UI、所有字面量。
- 字距在 `body` 上全局设置，不要在组件里单独覆盖。
- 用 Tailwind 尺度。常用：14px 正文/默认按钮、13px 侧栏项与密集行、12px 次级文字与路径、11px 全大写 meta/说明。
- 用 `text-2xs`（11px）与 `text-3xs`（10px），不要写 `text-[11px]` / `text-[10px]`（这两档由产品层在 `@theme` 里补齐）。
- 分类标签：11px、`font-semibold`、`uppercase`、`tracking-wider`（0.05em）。
- 原生对话区有自己的 lint 级字号与配色约束，见 [native-chat.md](./styleguide/native-chat.md)。

## Radius and elevation

- 圆角从 `--radius`（0.625rem）派生：`@innate/ui` 进一步派生 `--radius-sm/md/lg/xl/2xl/3xl/4xl`。按钮与输入用 `rounded-md`，`Card` 用 `rounded-xl`，徽标用 `rounded-full`。跟现有 primitive 的圆角走，不要引入新的。
- 只有三级高度，不要第四级：(1) `border` 发丝线，几乎所有东西的默认；(2) `shadow-xs` + 单 token 边框，用于 outline 按钮与嵌入卡片；(3) `shadow-md`（`@innate/ui` 的浮层用），只留给浮出编辑器面的浮层与弹层。觉得需要更重，通常说明你要的是 focus `ring`。

## Components

- 优先用 `@innate/ui` 导出的 primitive，**不要**在本仓新建 `components/ui/*`。缺组件或要改组件 → 去基础仓 `framework/innate-fe`，用它的 `.agents/skills/fe-ui` 技能（`pnpm ui:add` / `pnpm ui:update`），改完回本仓 `pnpm ui:sync:bump` 重装。
- `@innate/ui` 的底座是 **Base UI**，不是 Radix：**触发器用 `render` prop**（`<DropdownMenuTrigger render={<Button />} />`），**不要**用 orca 的 `asChild` 写法。
- 保留 root 上的 `data-slot`，用 `cn()` 合并 class 且把调用方 `className` 放最后，多变体用 CVA。
- **按钮**：`default` = 唯一的肯定动作；`secondary` 紧邻其后；`outline` 用于 toolbar/独立动作；`ghost` 用于图标按钮与行触发；`link` 用于正文内联；`destructive` 绝不用在 Cancel。尺寸要贴合所在行高（`@innate/ui` 的默认按钮是 h-7，比 orca 的 h-9 紧凑一档，见 [components.md](./styleguide/components.md#orca--innateui-按钮差异)）。
- **选型**：`Tooltip`（图标标签）、`HoverCard`（富预览）、`DropdownMenu`（点击菜单）、`ContextMenu`（右键）、`Popover`（点击展开的表单/选择器）、`Dialog`（只放阻塞性决策）、`Sheet`（边缘面板）、`Select`（已知列表）、`Command` in `Popover`（搜索）、`sonner`（瞬时确认）、正文内联文字 + `Badge`（常驻状态）。不要把一个 primitive 打扮成另一个。
- 凡是要求用户信任、批准、执行或移除代码的对话框，**必须**用基础仓提供的安全表面（若基础仓已有 `DialogContent surface="security"` 则用它，否则先向基础仓提 `ui:add`）；信任决策在对话框之外时放进 `SecuritySurface`。**当前 `@innate/ui` 尚未提供安全表面**，落地前需先在基础仓补齐（见 [components.md](./styleguide/components.md#orca-专属能力与本仓缺口)）。
- 模态之上只允许 toast 的关闭按钮可点。关掉 toast 不能连带关掉模态，焦点与未提交输入要保持。
- **Tooltip** 只用于给控件命名：不用于已有可见文字的控件、可交互内容、关键信息（关键信息走内联）。用 app 根的 `TooltipProvider`、`<TooltipTrigger render={…}>`，默认 `side="top" sideOffset={4}`；密集工具栏用 `delay={400}`（`@innate/ui` 缺省是 0）。
- **图标**：只用 `lucide-react`，默认描边粗细，颜色继承自文字。`@innate/ui` 的 `Button` 会把内部 svg 压到 `size-3`，需要 16px 时显式写 `size-4`。加载态用 `@innate/ui` 的 `<Spinner />`。
- **快捷键 chip**：用 `@innate/ui` 的 `Kbd`（或菜单里的 `DropdownMenuShortcut`），不要自造 `<kbd>`，更不要把按键写进文案。标签必须与平台真实绑定一致。绝不用在 Cancel、Dismiss、`link` 动作上。
- **表单**：标签组用 `space-y-1`，控件用基础仓 primitive，错误靠 `aria-invalid`（不要手绘 ring），尾部元信息用 `text-2xs text-muted-foreground` 放在控件下方。
- **滚动条**：只用 `.scrollbar-sleek`、`.scrollbar-editor`、`.worktree-sidebar-scrollbar` 三种，不要写第四种。

## UX rules

每条 UI 改动都适用。推理见 [ux-rules.md](./styleguide/ux-rules.md)；评审页面见 [ux-review-rubric.md](./styleguide/ux-review-rubric.md)。

- **文案不能夸大。** 不要暗示 app 做了什么、决定了什么、观察到了事实，除非真有状态或结果数据。进行中用中性过程语言；结果动词（「已跳过」「已保护」「已找到」「已校验」「已删除」）只用于真实结果。文案无错别字、简洁、具体、没有填充词（「请」「只需」「直接」）。
- **在途反馈与耗时匹配**：0–100 ms 无反馈；100 ms–1 s 只禁用；1–3 s 禁用 + spinner 或换标签；3 s 以上或多步骤用阶段标签/进度。给将要变长的标签预留空间（用 `width`，不用 `min-width`）。立即禁用，把可见的 loading 延后约 200 ms。
- **同级元素保持一致**：同一流程中相邻组件共用图标、快捷键约定与提交语义。除非有真实的角色差异，否则跟兄弟保持一致；没有兄弟时，跟随周围的 chrome。
- **退路保持安静**：Cancel、Dismiss、Close、Discard 不是破坏性操作——ghost、无颜色、无快捷键 chip、无动画暗示。Esc 仍然生效。
- 主操作显眼；常见流程 1–2 步完成；默认焦点落在最可能的字段或主操作上；Enter 提交，Esc 退出。
- 逐元素尊重 reduced motion：位移用 `motion-reduce:`，spinner 用「静止但仍在工作」的状态，脚本滚动走 `motionSafeScrollBehavior()`。
- 数据缺失时给出获取它的直接动作。瞬时结果用 toast；用户必须读、重试、复制或处理时，错误常驻内联。

## Cross-platform

每处 UI 改动都要在 macOS、Linux、Windows 以及明暗两种模式下站得住。

- 不要硬编码 `e.metaKey`：用 `navigator.userAgent.includes('Mac')` 选 `metaKey` 或 `ctrlKey`。菜单快捷键用 `CmdOrCtrl`。
- 标签在 Mac 显示 `⌘` / `⇧`，其它平台显示 `Ctrl+` / `Shift+`，与真实绑定一致。
- Mac 上点击目标不要落进红绿灯区（`titlebar-traffic-light-pad`）。
- 50–200 ms 远端延迟下，loading、focus 与动画都要站得住；要在模拟延迟或真实远端下验证，不能只在本地看。

## 与 orca 原文的差异

| 项 | orca | innate-desktop | 原因 |
| --- | --- | --- | --- |
| token 事实源 | `src/renderer/src/assets/main.css` | `@innate/ui` + 本仓 `packages/theme/src/tokens.css` | primitive 与主题机制归基础仓；产品 token 留本仓 |
| 中性色 | 纯中性灰（hue 0）hex | 产品层冻结基础 `:root`（oklch Neutral，不是 `shadcn-neutral`） | 亮色同值；暗色 4 处由产品层固定（`accent` / `border` / `sidebar-border` / `sidebar-ring`），对照见 [color.md](./styleguide/color.md#orca--innateui-中性色对照) |
| 主题变体 | 无（只有明暗） | 10 个 `[data-theme]` 块加 `default`（无对应规则） | 变体只盖过它声明的变量；`shadcn-*` 不动 sidebar / chart / font |
| Sans 字体 | Geist（自托管 woff2） | Geist（随 `packages/theme` 分发） | 保持 orca 观感，同时不引入新的下载依赖 |
| primitive 来源 | orca 自建 `components/ui/*`（38 个，Radix 底座） | `@innate/ui`（58 个，**Base UI** 底座） | 唯一来源；缺件去基础仓补。触发器用 `render` prop，不用 `asChild` |
| 按钮尺度 | 宽松（default h-9 / 13px） | 紧凑（default h-7 / 13px） | 取 `@innate/ui`；顶栏内的按钮统一用 `icon-sm` / `icon-xs` |
| `destructive` | 实心 | 淡底（`bg-destructive/10`） | 取 `@innate/ui` |
| 安全表面 | `DialogContent surface="security"` + `SecuritySurface` | **基础仓尚无** | 见 [components.md](./styleguide/components.md#orca-专属能力与本仓缺口) |
| 快捷键 chip | `<ShortcutKeyCombo />`（orca 自建） | `@innate/ui` 的 `Kbd` | 用基础仓已有的等价件 |
| 多选 combobox | `repo-multi-combobox`（orca 自建） | **基础仓无**，先按 `Command` + `Popover` 组合近似 | 见缺口清单 |
| 滚动条 | orca 三类（在 `main.css` 与 `shared/styles`） | 本仓 `packages/theme/src/shell.css` 三类 | 壳 chrome 随产品层分发 |
| 壳 toolbar | orca titlebar（36px，自绘窗口控件） | 见 [toolbar.md](./styleguide/toolbar.md) | orca titlebar 与 innate-fe webshell header 需要对齐 |

## 本文件不回答问题时

1. 先看相邻代码（未来的 `apps/desktop/src/renderer/src/components/`）里最接近的兄弟，跟它的做法走；
2. 再看 `@innate/ui` 有没有已经编码了这个模式的 primitive；
3. 如果是 token 问题，事实源是 `packages/theme/src/tokens.css` 与 `@innate/ui` 的 `tokens.css`——用现成的，或在 `:root` 与 `.dark` 里成对加一条；
4. 都不解决，再问人，不要自己发明。
