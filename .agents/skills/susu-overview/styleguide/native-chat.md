# Native chat typography and color

> **适用状态：尚未实现。** innate-desktop 还没有原生对话区。本文是**前瞻规格**——等对话区落地时照着实现，不要照抄 orca 的目录结构。
>
> 读它之前先确认：对话区的 token 走**本仓产品层**（`packages/theme/src/tokens.css`），primitive 走 `@innate/ui`。核心规则：[`../STYLEGUIDE.md`](../STYLEGUIDE.md)。

## 落地前置：token 先到位

orca 的对话区配色靠一组 `--chat-*` token 实现（`--chat-canvas`、`--chat-foreground` / `-strong` / `-faint`、`--chat-user` / `-border`、`--chat-code`、`--chat-inline-code`、`--chat-composer`、`--chat-focus-ring`、`--chat-warning`、`--chat-diff-added` / `-removed`、`--chat-unread`、`--chat-content-max-width`），它们由一组 mix 百分比从画布与前景推导。

**这些 token 目前不在本仓。** 实现对话区时：

1. 在 `packages/theme/src/tokens.css` 里补齐，**明暗成对**声明（`--chat-*-mix` 这类百分比明暗不同，其余同值）；
2. 在 `@theme inline` 里映射成 Tailwind 工具类；
3. 同步更新 `packages/theme/src/theme.ts` 的 `PRODUCT_TOKENS`（测试会校验成对声明）。

不要把对话区的配色直接写进组件，也不要写 hex。

## 字号阶梯

对话区只用这些档位，**不写任意字号**（`text-[13px]` 这类）。

| 档位 | 默认 | 用于 |
| --- | --- | --- |
| `text-sm` | 14px | 用户要读的一切：消息正文、工具与 agent 活动行、卡片标题与正文、输入区 |
| `text-xs` | 12px | 标签、时间戳、计数、行下的次级信息 |
| `text-2xs` | 11px | 说明、署名、全大写分类标签 |
| `text-3xs` | 10px | 徽标与等宽 pill |
| `text-chat-code` | 12px | 代码块、diff、命令与工具输出 |

对话区根节点（`.native-chat-appearance`）把这些档位重定义为「正文字号」的**比例**，所有层级一起缩放；`text-chat-code` 跟随「代码字号」设置。根节点还把间距单位绑到字号（默认 14px 时为 4px），让图标、间距、内边距、行走高一起长大。

- 用间距刻度工具类（`size-3.5`、`min-h-6.5`、`pl-3.25`），**不要**写像素长度（`min-h-[26px]`）——否则元素固定不动而其余部分在缩放。
- 一个元素只用上述工具类定尺寸：CSS 规则里另写 `font-size` 会静默覆盖它们。

## 文字颜色、hover 与 focus

- **画布上的主要文字**用 `text-chat-foreground`，标题与强调用 `text-chat-foreground-strong`；两者跟随「对比度」设置。**不要**手工柔化 `text-foreground`（`text-foreground/85`）。`text-foreground` 用于对话区**内部抬起表面**（卡片、菜单、浮层）上的文字。
- **画布上的次级文字**（转录行、提示、消息之间的标签）用 `text-chat-foreground-faint`。`text-muted-foreground` 用于对话区**内部抬起表面**（卡片、菜单、浮层、输入区上方的 dock）上的文字。
- **转录行 hover**：`hover:bg-accent/20`。按钮、菜单项、卡片控件用 `hover:bg-accent`。
- **focus ring**：整宽的转录行用内嵌 ring（`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`），避免被滚动容器裁掉；独立控件用 `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`。对话区内的 `--ring` 是 `--chat-focus-ring`，它在画布上要过 3:1——**不要**降它的透明度。
- **状态色**：警告用 `text-chat-warning`；diff 行用 `text-chat-diff-added` / `text-chat-diff-removed`；用户还没读到的用 `text-chat-unread`。这些色都朝前景方向混过，明暗都能过文字对比。**不要**用原始调色板色（`text-yellow-500`），也**不要**把 git 装饰 token 用在染色行上的文字。

## 与全局规则的差异点

对话区是唯一允许偏离「14px 正文」默认的地方（它用比例缩放而非固定档位）。其余规则照旧：几何中性、用 `muted` / `accent` / `border`、明暗只走 `.dark` class、primitive 只从 `@innate/ui` 来。

## 不要照抄 orca 的部分

| orca | 本仓 |
| --- | --- |
| `src/renderer/src/components/native-chat/` | 未来的 `apps/desktop/src/renderer/src/components/native-chat/`（W1 应用落地后再定） |
| `config/ast-grep/rules/native-chat-*.yml` lint 规则 | 本仓暂无 lint 基座；实现对话区时按上面的阶梯自己加 lint 规则 |
| `--chat-*` token 定义在 orca 的 `main.css` | 定义在本仓 `packages/theme/src/tokens.css`（产品层） |
