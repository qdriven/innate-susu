# Component specs

[`../STYLEGUIDE.md`](../STYLEGUIDE.md#components) 的展开。**primitive 的唯一来源是 `@innate/ui`**（基础仓 innate-fe 的 `packages/ui`）。本仓**不新建** `components/ui/*`；缺件去基础仓补。

## Primitive 约定

`@innate/ui` 的 wrapper 遵循统一模式，新写代码必须照着来：

- **底座是 Base UI（`@base-ui/react`），不是 Radix。** orca 的 `asChild` 写法在这里**不适用**——Base UI 用 `render` prop：
  ```tsx
  // ✅ @innate/ui 写法
  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />} />
  // ❌ orca 的 Radix 写法（本仓禁用）
  <DropdownMenuTrigger asChild><Button /></DropdownMenuTrigger>
  ```
- 组件 root 上带 `data-slot="<name>"`，**不要剥掉**——CSS 与测试都靠它定位。
- 用 `cn()` 合并 class，**调用方的 `className` 放最后**。
- 多变体用 CVA（`class-variance-authority`）。
- 绝大多数包 Base UI；例外：`command`（包 `cmdk`）、`sonner`（包 `sonner`）、`calendar`（包 `react-day-picker`）、`carousel`（包 `embla-carousel-react`）、`chart`（包 `recharts`）、`resizable`（包 `react-resizable-panels`），以及纯视觉 wrapper（`badge`、`button-group`、`card`、`input`、`kbd`）。**不要重写无头行为**，扩展既有 wrapper。

## `@innate/ui` primitive 清单（v0.1.2，58 个）

| 分类 | primitive |
| --- | --- |
| 布局 | `sidebar`、`resizable`、`scroll-area`、`sheet`、`drawer`、`dialog`、`alert-dialog`、`popover`、`hover-card`、`card`、`separator`、`aspect-ratio`、`direction`、`domain-page-layout` |
| 导航 | `breadcrumb`、`pagination`、`tabs`、`accordion`、`collapsible`、`menubar`、`navigation-menu`、`sidebar` |
| 输入 | `input`、`textarea`、`input-group`、`input-otp`、`checkbox`、`radio-group`、`select`、`slider`、`switch`、`toggle`、`toggle-group`、`calendar`、`field`、`form` |
| 动作 | `button`、`button-group`、`badge`、`item`、`empty` |
| 浮层 | `dropdown-menu`、`context-menu`、`command`、`tooltip`、`alert`、`alert-dialog`、`sonner`、`spinner`、`progress`、`skeleton` |
| 数据 | `table`、`chart`、`avatar` |
| 主题 / 国际化 | `theme-provider`、`theme-selector`、`locale-provider`、`locale-selector` |

`field` / `form` / `item` / `input-group` / `empty` 是较新的 shadcn 分层：表单用 `Field` + `Label` + `Control`，列表项用 `Item`，空态用 `Empty`。**优先用它们，不要手搓等价物。**

## 按钮

`@innate/ui` 的 `Button` 变体：`default`、`secondary`、`outline`、`ghost`、`destructive`、`link`。
尺寸：`default`(h-7)、`sm`(h-6)、`xs`(h-5.5)、`lg`(h-8)、`icon`(size-7)、`icon-sm`(size-6)、`icon-xs`(size-5.5)、`icon-lg`(size-8)。

| 变体 | 用在哪 |
| --- | --- |
| `default` | 一个流程里唯一的肯定动作 |
| `secondary` | 紧邻 `default` 的低强调兄弟 |
| `outline` | toolbar / 独立动作，实心按钮太重时 |
| `ghost` | 图标按钮、列表行触发、chrome 应消失处 |
| `link` | 正文内联文字动作 |
| `destructive` | 删除、丢弃、不可逆。**绝不用在 Cancel** |

### orca ↔ `@innate/ui` 按钮差异

orca 的按钮是**宽松尺度**，`@innate/ui` 是**紧凑尺度**（整体小 2px）：

| 项 | orca | `@innate/ui` | 处置 |
| --- | --- | --- | --- |
| 基准字号 | `text-sm`（14px） | `text-[13px]` | 取 `@innate/ui`。桌面端密度更高，正文 14px 只用于内容区，chrome 用 13px。 |
| 默认高度 | `h-9`（36px） | `h-7`（28px） | 取 `@innate/ui`。**影响 titlebar**：见 [toolbar.md](./toolbar.md)。 |
| sm / xs / lg | h-8 / h-6 / h-10 | h-6 / h-5.5 / h-8 | 同上。 |
| icon | `size-9` | `size-7` | 同上。 |
| 图标默认尺寸 | `size-4` | `size-3` | 取 `@innate/ui`；需要 16px 时显式写 `size-4`。 |
| `destructive` | **实心** `bg-destructive text-white` | **淡底** `bg-destructive/10 text-destructive` | 取 `@innate/ui`（淡底）。整行删除确认这类需要实心时，用 `variant="default"` + `className="bg-destructive text-white"` 局部覆盖，不要为此改基础仓。 |
| `ghost` hover | `hover:bg-accent` | `hover:bg-muted` | 取 `@innate/ui`。注意基础仓的 ghost 走 `muted` 而非 `accent`，两者在暗色下亮度不同（见 [color.md](./color.md#orca--innateui-中性色对照)）。 |
| `outline` | 带 `shadow-xs` | 无 shadow | 取 `@innate/ui`；需要发丝线+微阴影时自行加 `shadow-xs`。 |
| 额外变体 | `pane-title`、`pane-title-close`、`destructive-chip` | 无 | orca 专属面板标题样式 → **不迁移**；需要时用 `className` 在本仓做局部样式（属于壳 chrome 层，不是 primitive）。 |
| 额外尺寸 | `chip`（h-4） | 无 | 用 `Badge` 或 `<span>` + `text-3xs`，不要自造尺寸档。 |

尺寸要贴合所在行高——不要把 `default`（h-7）塞进 24px 的状态栏。

## 选型表

| 你想要… | 用 | 不要用 |
| --- | --- | --- |
| 图标按钮的悬停标签 | `Tooltip` | `HoverCard`（太重）、title 属性 |
| 富内容预览（头像 + 摘要） | `HoverCard` | `Tooltip`（放不下富内容） |
| 点击展开的操作菜单 | `DropdownMenu` | `Popover` 手搓列表 |
| 右键上下文操作 | `ContextMenu` | `DropdownMenu`（调用方式不同） |
| 点击展开的任意内容（表单、选择器） | `Popover` | `Dialog`（会抢焦点并压暗） |
| 必须先做决定才能继续的模态 | `Dialog` / `AlertDialog` | `Popover`、内联遮罩 |
| 从边缘滑入的面板 | `Sheet` / `Drawer` | 居中的 `Dialog` |
| 已知列表里的单选 | `Select` | 手搓 listbox |
| 需要搜索/模糊匹配的单选 | `Command` + `Popover` | `Select`（不能搜） |
| 多选 + 搜索 | `Command` + `Popover` + `CommandItem` 多选态 | 见下方缺口清单 |
| 瞬时确认（"已保存"） | `sonner` toast | `Dialog`、内联横幅 |
| 常驻状态（"3 个错误"） | 内联文字 + `Badge` | toast（会消失） |

如果发现自己在绕着 primitive 改样式（把 `Popover` 打扮成 `Dialog`），停下来重新选——两者的焦点管理语义不同，后来的维护者会被误导。

## Tooltip

Tooltip 用来**给控件命名**，不是用来教学、说服或警告——用户需要边操作边读的内容属于可见 UI。

- **该用**：图标按钮、紧凑 chip 需要标签时。工具栏图标、缩写徽标、被截断的路径。
- **不该用**：控件已有可见文字、内容可交互（链接、按钮）、信息是关键性的（错误、阻塞性警告走内联）。
- **挂载**：`<TooltipProvider>` 放 app 根。`@innate/ui` 的 `TooltipProvider` 默认 `delay={0}`（orca 用的是 400ms）。**密集工具栏用 `<TooltipProvider delay={400}>` 包一层**，避免鼠标扫过就闪。
- **触发**：Base UI 用 `render` prop，不是 `asChild`：
  ```tsx
  <Tooltip>
    <TooltipTrigger render={<Button variant="ghost" size="icon-sm" onClick={openSettings} />}>
      <Settings />
    </TooltipTrigger>
    <TooltipContent side="top" sideOffset={4}>
      Settings
    </TooltipContent>
  </Tooltip>
  ```
- **位置**：默认 `side="top" sideOffset={4}`。只有默认会被视口裁掉时才换边。
- **Tooltip 里的快捷键 chip**：追加 `<Kbd>`（`TooltipContent` 已针对 `data-[slot=kbd]` 做过 padding 与层级处理）。不要把按键写进文案字符串。

## 图标

只用 `lucide-react`。**不要引入第二个图标库。**

- **默认尺寸**：`@innate/ui` 的 `Button` 会把内部 `<svg>` 压到 `size-3`（`[&_svg:not([class*='size-'])]:size-3`），多数调用点不用自己写。内容区图标要 16px 时显式 `size-4`。
- **`size-3` / `size-3.5`**：元信息、说明、密集列表行。
- **`size-7`+**：只用于空态 / hero 图标。
- **描边粗细**：lucide 默认，不逐个覆盖。
- **颜色**：继承外层文字色（`text-muted-foreground` 等）。父级已经带颜色时不要再给 SVG 单独上 token。
- **加载态**：用 `@innate/ui` 的 `<Spinner />`（内置 `role="status"` + `aria-label="Loading"` + `size-4 animate-spin`）。它比裸 `<Loader2>` 多了无障碍语义。超过 3 秒的多步任务优先用阶段文案（"克隆中…" → "安装中…"）而不是无标签 spinner。

## 快捷键 chip

用 **`@innate/ui` 的 `Kbd`**（`h-5 min-w-5 rounded border bg-muted px-1 font-mono text-[11px] text-muted-foreground`）。菜单里的右键 chip 用 `DropdownMenuShortcut` / `CommandShortcut`。

`Kbd` **只渲染键帽**，不转换按键字符串——**平台字形由调用方给**：

```tsx
const isMac = navigator.userAgent.includes("Mac")
const mod = isMac ? "⌘" : "Ctrl"
const shift = isMac ? "⇧" : "Shift"
<Kbd>{mod}</Kbd>
```

orca 的 `ShortcutKeyCombo` 会在 Win/Linux 键之间插 `+`；`Kbd` 不做这个分隔，多个键要各自渲染：

```tsx
<span className="inline-flex items-center gap-0.5">
  <Kbd>{mod}</Kbd>
  <Kbd>{shift}</Kbd>
  <Kbd>N</Kbd>
</span>
```

**不要自造 `<kbd>`**——各人自己写样式，键帽的形状和颜色很快就会漂。

出现在哪里：

- **图标按钮的 tooltip** —— 追加在标签后面（trailing）。
- **下拉 / 右键菜单项** —— 用 `DropdownMenuShortcut`，不要自己定位。
- **绝不**用在 Cancel、Dismiss、`link` 变体的内联动作上（见 [ux-rules.md](./ux-rules.md)）。

**标签必须与真实绑定一致。** 处理函数在 Mac 读 `metaKey`、其它平台读 `ctrlKey`，chip 就必须 Mac 显示 `⌘`、其它平台显示 `Ctrl`。对不上的 chip 比没有 chip 更糟。

## 表单

用 `@innate/ui` 的 `Field` / `Label` / `Control`（或 `Form` + `react-hook-form`）：

- **标签组**：`Field` 里放 `Label` + `text-xs text-muted-foreground` 的说明。
- **控件**：`Input`、`Textarea`、`Select`、`Checkbox` 等 primitive。错误靠 `aria-invalid`——primitive 已经把它映射成 destructive 描边，不要自己画 ring。
- **尾部元信息**：`text-2xs text-muted-foreground` 放在控件**下方**（例如 "当前 14px · 默认 13px"），不放在标签旁边。
- **密度**：整节表单 `space-y-3`，紧凑单控件字段 `space-y-2`。按密度选，不按偏好。

## 滚动条

三种滚动条类定义在本仓 `packages/theme/src/shell.css`（orca 原样迁入）。给溢出容器用其中一种，**不要写第四种**：

- **`.scrollbar-sleek`** —— 默认细滚动条，给侧栏、列表、浮层。配 `.scrollbar-sleek-parent` 在 hover 目标祖先上，可让滑块只在父级 hover 时淡入。
- **`.scrollbar-editor`** —— 稍重，给 Monaco 周边面板。
- **`.worktree-sidebar-scrollbar`** —— 不预留槽位：配 `overflow-y-auto`，滚动条只在真的溢出时存在，短列表与固定表头齐平；滑块在 `.scrollbar-sleek-parent` hover 前不可见。只用在工作树侧栏。

## orca 专属能力与本仓缺口

orca 有一部分能力 `@innate/ui` 还没有。**逐项给出方案**，不要因为"基础仓没有"就在本仓自建 primitive。

| orca 能力 | `@innate/ui` 现状 | 方案 |
| --- | --- | --- |
| `SecuritySurface` / `DialogContent surface="security"` —— 安全确认面 | `DialogContent` **没有** `surface` prop（见 `dialog.tsx`） | **两步走**：① 过渡方案——在 `packages/theme/src/tokens.css` 里加 `--security-*` token 家族（照 orca 的 `--orca-security-*` 改名，明暗成对），在 `DialogContent` 上用 `className` 挂 `data-surface="security"` 的样式；② 正式方案——向基础仓提 `ui:add`，给 `DialogContent` 加 `surface` 变体，做完回本仓 `pnpm ui:sync:bump`。**红线**：要求用户信任、批准、执行或移除代码的对话框必须走安全面，不得用普通 `Dialog` 顶替。 |
| `ShortcutKeyCombo` | 有 `Kbd`，但没有 Win/Linux 的 `+` 分隔与平台字形转换 | 用 `Kbd` + 调用方按平台给字形（见上）。若需要分隔符，向基础仓提 `ui:add`（`ShortcutKeyCombo`）。 |
| `repo-multi-combobox`（多选 + 搜索） | 有 `command`（cmdk）+ `popover` + `checkbox`，没有组合好的多选 combobox | 用 `Command` in `Popover` + `CommandItem` 自管多选状态（`aria-selected` / `data-selected`）实现；**不要**在 `Select` 上硬加搜索。需要现成件时向基础仓提 `ui:add`。 |
| `.jump-palette-item[data-selected='true']` 选中配方 | 无 | 已迁到本仓 `packages/theme/src/shell.css`（`color-mix` + inset ring），配合 `data-selected="true"`。这是**壳 chrome 层**，不是 primitive，留在本仓是正确归属。 |
| 三种滚动条类 | 无（在 `@innate/ui` 之外） | 已迁到本仓 `packages/theme/src/shell.css`。 |
| `pane-title` / `pane-title-close` 按钮变体 | 无 | 不迁移成 primitive。面板标题栏是壳 chrome，用本仓 `shell.css` 的类名 + `Button` 的 `className` 实现。 |
| orca 自建 `components/ui/*`（38 个） | `@innate/ui` 已提供 58 个，覆盖绝大多数 | 缺件向基础仓提 `ui:add`；**不要**在本仓建 `components/ui/`。 |
| orca 的 `--chat-*` / `--terminal-pane-title-on-*` token | 无 | 随对应功能一起实现；实现前先在产品层加 token（明暗成对）。 |

## 补件流程

缺组件或要改组件时：

1. 去基础仓 `framework/innate-fe`，用它的 `.agents/skills/fe-ui` 技能（`pnpm ui:add` / `pnpm ui:update`）。
2. 基础仓改完、发布新版本后，回本仓 `pnpm ui:sync:bump` 重装（脚本见 `tools/ui-sync.mjs`）。
3. 本仓 `packages/theme` 的测试会重新校验 token 成对声明；`pnpm verify` 通过再提交。

`pnpm ui:sync` 会把 `@innate/*` 发布到私有 registry、写入本仓 `.npmrc`、把 `workspace:` 依赖改写成 `^version`、然后 `pnpm install`。基础仓路径由 `--root` > `INNATE_FE_ROOT` > `.innate-fe-cli.json` 决定。
