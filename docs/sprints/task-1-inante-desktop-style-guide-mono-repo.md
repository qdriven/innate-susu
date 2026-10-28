---
schemaVersion: 1.0.0
id: task-1-inante-desktop-style-guide-mono-repo
title: inante-desktop 初始化：style guide 对齐 + mono repo 骨架
createdAt: 2026-10-28T06:39:43.117694Z
updatedAt: 2026-10-28T07:21:55.961352Z
status: done
branch: qdriven/inante-desktop
repository: qdriven/innate-susu
sourceKind: issue
sourcePath: 
issueNumber: 1
issueUrl: https://github.com/qdriven/innate-susu/issues/1
issueState: OPEN
issueTitle: inante-desktop：初始化
issueUpdatedAt: 2026-10-28T06:28:12Z
prNumber: 2
prUrl: https://github.com/qdriven/innate-susu/pull/2
prState: OPEN
prTitle: feat: monorepo 骨架 + UI 基座接入 + style guide 对齐
prUpdatedAt: 2026-10-28T07:21:31Z
---

## 任务上下文

### 问题

innate-desktop 仓此前只有文档与 `.agents/skills`，没有任何可安装、可构建的工程骨架，也没有可执行的视觉规范入口。Issue #1 的要求是两份： 1. **Setup Style Guide** —— 用 `innate-labs/references` 里的 orca style guide 跟「壳的 toolbar」对上；并且和 innate-fe 部分对上，对不上的地方要给出解决方案。 2. **Setup Mono Repo** —— 基于 innate-fe-cli 和 innate-fe 构建 mono repo；并检查当前是否已经可以满足了。 两个「对上」都缺少可核对的依据：orca 的 style guide 是给另一套基座（自建 Radix 组件 + 本地 `main.css`）写的，本仓的基座是 `@innate/ui`（Base UI 底座、源码包分发）。凭印象对齐会引入无法验证的断言。

### 目标

- 交付一个可安装、可类型检查、可测试的 pnpm workspace monorepo 骨架，并通过 `innate-fe-cli` 接上 innate-fe 私有源。 - 把 orca 的 style guide 重写成**面向本仓基座**的执行副本，并给出 orca ↔ innate-fe 的逐 token 对照结论与差异处置。 - 把「壳的 toolbar」三方（orca titlebar / innate-fe webshell header / innate-desktop 桌面顶栏）对上，给出可实现规格。

### 范围

- 仓库骨架：`package.json` / `pnpm-workspace.yaml` / `tsconfig.base.json` / `pnpm-lock.yaml` / `apps/` `packages/` 槽位。
- 基座接入：`tools/ui-sync.mjs`（定位基础仓 → `innate-fe-cli install`）与 `pnpm ui:sync*` 脚本。
- 产品 token 层与壳 chrome 层：`packages/theme`（`@innate-desktop/theme`）。
- style guide 重写：`STYLEGUIDE.md` + `styleguide/`（`color` / `components` / `toolbar` / `native-chat` / `ux-rules` / `ux-review-rubric`）。
- 对齐结论文档与复核脚本：`docs/build-path/1-monorepo-init/`、`tools/compare-palette.mjs`。
- 总控技能更新：`.agents/skills/susu-overview/SKILL.md` 的 token 分层规则与 style guide 索引。

### 非目标

- **不写应用代码**：`apps/desktop`（`@innate-desktop/desktop`）留到 W1，本次只留槽位说明。
- **不实现对话区 / 终端**：相关 token 与规格备好，功能不落地。
- **不并入 innate-fe 源码**：基础仓保持独立仓，本仓经私有 registry 消费源码包。
- **不在本仓新建 `components/ui/`**：缺 primitive 去基础仓 `pnpm ui:add`。
- **不改基础仓**：本任务只读基础仓；补件需求写进文档，留给后续任务提 `ui:add`。

### 依赖

- `innate-fe` 基础仓（`framework/innate-fe`）：`@innate/ui` 源码包、`innate-fe-cli`、Verdaccio 私有源（`127.0.0.1:4873`）。
- `innate-labs/references/orca`：style guide 与壳 chrome 的对照来源。
- pnpm 12.14.0、Node >= 20。

### 假设

- orca 的 style guide 与壳 chrome 是本仓的**观感基准**，不是代码来源；代码不迁入，只迁入 token 值与类名规格。
- `@innate/ui` 的语义 token 定义面与主题机制长期归基础仓；本仓只做产品扩展。
- 桌面端（W1）会采用 Electron，壳 chrome 需要 `-webkit-app-region` 拖拽区与自绘窗口控件。

### 未决问题

- 安全表面（`DialogContent surface="security"` + `SecuritySurface`）基础仓尚无：过渡方案用产品层 `--security-*` token 家族，正式方案待提 `ui:add`。**在基础仓补齐前不得用普通 `Dialog` 顶替安全确认面。**
- `ShortcutKeyCombo` 的 Windows/Linux `+` 分隔符、多选 combobox：当前用 `Kbd` / `Command` + `Popover` 过渡，是否提 `ui:add` 取决于实际需求密度。
- Base UI 浮层的 Portal 是否落在 Electron 拖拽区内：待桌面壳落地时逐个验证。
- `--window-controls-width`（138px）与 `--ui-zoom-factor` 由主进程注入：待桌面端接上。

## 全局上下文

### 摘要

innate-desktop 是产品 monorepo（共享底座 + 轻应用平台），UI 基座来自独立的 innate-fe 基础仓，以私有 npm registry 的**源码包**方式消费，不做源码并入。总控技能 `susu-overview` 锁死了三条纪律：primitive 唯一来源是 `@innate/ui`、token 走语义变量、明暗只走 `.dark` class。Issue #1 恰好卡在这三条纪律尚未落到具体工程形态的位置：仓里既没有可安装的 workspace，也没有一份能真正执行的 style guide。

### 来源

- docs/CONTEXT.md
- docs/README.md
- .agents/skills/susu-overview/SKILL.md
- tasks/0-setup.md
- innate-fe/packages/ui/src/tokens.css、packages/ui/src/themes/*.css
- innate-fe/shells/webshell/src/components/app-shell.tsx
- innate-labs/references/orca/src/renderer/src/assets/main.css、src/renderer/src/components/ui/

### 约束

- primitive 唯一来源 = `@innate/ui`；缺件去基础仓 `fe-ui` 技能，本仓不复制、不自绘、不深引内部路径。
- 字面量（hex、字号、像素间距）不进组件代码。
- 明暗走 `.dark` class，禁止 `prefers-color-scheme` 媒体查询。
- 主题变体统一 `data-theme`，切换入口只有 `ThemeSelector`。
- 审批红线：审批永不自动通过；错误必须显式可达；外部链接外跳系统浏览器。
- `@innate/ui/globals.css` 是基础仓内部入口，消费方不得引用；只引 `@innate/ui/tokens.css`。
- `@source` 必须写在所有 `@import` 之后。

### 全局更新

- 需要：否
- 计划：无

## 设计影响

### 是否受影响

是

### 现状行为

style guide 是 orca 原文的**未修改副本**加一张替换表：它假定 token 定义在 orca 本地 `main.css`、primitive 在 orca 自建的 `components/ui/`（Radix 底座、38 个）、按钮默认 h-9 / 14px、快捷键 chip 是 `<ShortcutKeyCombo />`、面板标题有 `pane-title` 变体、对话区与终端各自带一套 token。这些前提在本仓**全部不成立**。仓里也没有 token 的合法落点——`packages/` 为空，字面量无处安放。

### 目标行为

三条落点被固定下来： 1. **token 三层**：`@innate/ui`（primitive 与主题机制）/ `packages/theme/src/tokens.css`（产品 token，本仓唯一允许字面量，明暗成对声明）/ `packages/theme/src/shell.css`（壳 chrome 类名，不写字面量）。 2. **style guide 面向本仓基座重写**：`STYLEGUIDE.md` 与 `styleguide/` 直接描述 `@innate/ui` + `packages/theme` 的实际形态，orca 只作为对照出现在差异表里。 3. **toolbar 三方对齐**：物理壳用 orca 的 36px titlebar（含自绘窗口控件与 80px 红绿灯占位），内容语义用 innate-fe webshell header 的分区（左标题 / 右 `Badge` + `LocaleSelector` + `ThemeSelector`）。

### 决策

- **默认主题变体是 `default`（基础仓基础 `:root`，shadcn Neutral），不是 `shadcn-zinc`。** 逐 token 核对后：`@innate/ui` 基础层与 orca 的中性色**全部相等**（亮色全等；暗色仅 4 处差异），而 `shadcn-zinc` 的中性色带 240 色相的淡蓝偏移，与 orca 的纯中性灰不等值。选错默认值会让桌面端观感与 orca 系统性偏离。
- **产品层覆写共享 token，用同值冻结。** 不是另造一套中性色，而是防止基础仓改 Neutral 时桌面端观感漂移，并用测试钉住快照。
- **暗色 4 处差异固定 orca 值**：`accent`（`#404040`，基础仓值与 `muted` 同值会让 hover 几乎不可见）、`border` / `sidebar-border`（7% 而非 10%，发丝线更符合「外壳退后」的定位）、`sidebar-ring`（`#525252`，侧栏 focus 环更收敛）。
- **按钮取 `@innate/ui` 的紧凑尺度**（default h-7 / 13px），顶栏内的按钮统一 `icon-sm` / `icon-xs`。
- **顶栏图标按钮用 `Button variant="ghost"`，不拷 orca 的裸 class。** 依据 plan W1a.3 与 plan1 评审（2026-10-28）：壳控件按规范取 `@innate/ui` Button——toolbar 用 `outline`、图标按钮用 `ghost`，不把 orca 的 `titlebar-icon-button` / `sidebar-toggle` 搬进 `shell.css`，也不造 Toolbar 原语。`@innate/ui` 的 ghost hover 是 `bg-muted`、orca 是 `bg-accent`，这一处观感差异留给基础仓调 `ghost` 的 hover 色解决。
- **关闭按钮 hover 单开 token**（`--window-control-close-hover` / `--window-control-close-foreground`）：orca 写死 `#c42b1c`，`@innate/ui` 的 `--destructive` 是 `#e7000b` 级别，hover 观感会跳。
- **orca 专属能力不在本仓现造**：安全表面、快捷键 chip 平台分隔、多选 combobox 逐项给出过渡方案 + 正式方案（去基础仓 `ui:add`）。
- **中性色对照做成可复核脚本**（`tools/compare-palette.mjs`）：把 `hsl()` / `oklch()` / `rgb()` 统一换算成 hex 再比，避免「凭印象对齐」。

### 风险

- 产品层冻结共享 token，等于在仓里复制了一份中性色；基础仓改 Neutral 时桌面端不会跟随，需要主动同步。测试快照能发现漂移，但发现的是「产品层要改」而不是「自动跟随」——这是有意的取舍（观感稳定性优先）。
- `shadcn-zinc` 等变体一旦被用户选中，基础仓会接管中性色，与产品层冻结值分叉。已在 style guide 与对齐文档里写明这一优先级关系与后果。
- 顶栏的 Electron 拖拽区与 Base UI 浮层的层级关系尚未在真实窗口验证，`toolbar.md` 已列为未决项。
- 安全表面在基础仓补齐前只有过渡方案，产品层 `--security-*` token 家族尚未落地。

### 全局影响

`docs/CONTEXT.md` 不需要更新：本任务不改架构分层、不改进程模型、不改 Surface 契约，只把既定的「UI 基座来自 innate-fe」纪律落到工程形态上。影响面局限在 `packages/theme`、`.agents/skills/susu-overview/`、`docs/build-path/1-monorepo-init/` 与仓库骨架文件。

## 功能与验证点

### F1 · monorepo 骨架与依赖图

目标：仓成为可安装、可类型检查、可测试的 pnpm workspace；`apps/` 是空槽位，应用代码留到 W1。
模块：M4
Spec：S1

- F1-V1 [passed] workspace 成员只有根包与 `@innate-desktop/theme`，`apps/` 无包
  - 方法：pnpm -r list --depth -1
  - 证据：pnpm -r list --depth -1 输出 innate-desktop@0.1.0 与 @innate-desktop/theme@0.1.0 两项，无第三个成员
- F1-V2 [passed] 全仓 strict 类型检查通过
  - 方法：pnpm typecheck
  - 证据：pnpm typecheck：根包与 packages/theme 的 tsc --noEmit 均无错误输出，退出码 0
- F1-V3 [passed] 锁文件解析出 @innate/ui@0.1.2，install 可重复执行
  - 方法：pnpm install 后检查 pnpm-lock.yaml 的 importers 段
  - 证据：pnpm install 报 Already up to date / Done in 5ms using pnpm v12.14.0；pnpm-lock.yaml 的 importers 含 . 与 packages/theme:，依赖 @innate/ui ^0.1.2
- F1-V4 [passed] 构建门禁通过
  - 方法：pnpm build
  - 证据：pnpm build 输出 @innate-desktop/theme 是纯 CSS 包，无构建步骤，退出码 0

### F2 · UI 基座接入链路

目标：`pnpm ui:sync` 能定位 innate-fe 基础仓并完成「发布 @innate/* → 写 .npmrc → 重装」，且不依赖任何硬编码绝对路径。
模块：M3, M4
Spec：S1

- F2-V1 [passed] ui:sync 能定位基础仓、发布 @innate/ui 并重装成功
  - 方法：pnpm ui:sync
  - 证据：pnpm ui:sync：脚本打印 innate-fe 基础仓 D:/innate-workspace/framework/innate-fe；@innate/ui@0.1.2 发布到本地 Verdaccio 成功并完成 pnpm install
- F2-V2 [passed] 基础仓定位不写死路径
  - 方法：检查 tools/ui-sync.mjs 的候选路径与优先级实现
  - 证据：tools/ui-sync.mjs 只含 framework/innate-fe / base/innate-fe / innate-fe 三个相对候选，优先级 --root > INNATE_FE_ROOT > .innate-fe-cli.json（仓库根/home）> 向上自动发现；.innate-fe-cli.json 已在 .gitignore
- F2-V3 [passed] 消费方不引用基础仓内部入口
  - 方法：全仓 grep `@innate/ui/globals.css`
  - 证据：全仓 grep @innate/ui/globals.css：除「不得引用」说明外无引用；产品层只 @import "@innate/ui/tokens.css"

### F3 · 产品 token 层与壳 chrome 层

目标：字面量有唯一合法落点，且该落点受测试约束。
模块：M2
Spec：S2, S5

- F3-V1 [passed] 每个产品扩展 token 在 `:root` 与 `.dark` 中成对声明
  - 方法：pnpm --filter @innate-desktop/theme test
  - 证据：pnpm --filter @innate-desktop/theme test：src/theme.test.ts 9 tests passed
- F3-V2 [passed] 共享语义 token 的亮色值与 orca 快照一致
  - 方法：同上（测试钉住 SHARED_TOKEN_VALUES）
  - 证据：theme.test.ts 钉住 SHARED_TOKEN_VALUES：background #fff、foreground #0a0a0a、primary #171717、ring #a1a1a1、radius 0.625rem 等 18 项逐值相等
- F3-V3 [passed] 中性色与 @innate/ui 基础层逐 token 相等，暗色只有 4 处刻意差异
  - 方法：node tools/compare-palette.mjs
  - 证据：node tools/compare-palette.mjs：结构性差异仅 accent(#404040 vs #262626)、border(7% vs 10%)、sidebar-border(7% vs 10%)、sidebar-ring(#525252 vs #737373)，其余全部 SAME
- F3-V4 [passed] 壳 chrome 层保留 orca 的固定尺寸
  - 方法：packages/theme/src/theme.test.ts 的尺寸断言
  - 证据：theme.test.ts 断言命中 .titlebar{height:36px}、.window-controls-btn{width:46px}、.titlebar-traffic-light-pad{width:calc(80px…)}
- F3-V5 [passed] 壳 chrome 层不复制 orca 的按钮类，顶栏按钮归 @innate/ui 的 Button
  - 方法：packages/theme/src/theme.test.ts 的禁用类断言 + grep 全仓残留
  - 证据：theme.test.ts 断言 shell.css 中不存在 `.titlebar-icon-button` / `.sidebar-toggle` 的规则声明；全仓 grep 命中的其余位置均为「不迁移」的说明文字与 plan 原文，无一条是实现

### F4 · style guide 重写与 toolbar 对齐

目标：style guide 面向本仓基座可执行，且壳 toolbar 有三方对照后的可实现规格。
模块：M1
Spec：S3, S4, S6

- F4-V1 [passed] style guide 的 token 来源、primitive 来源、控件底座、按钮尺度、快捷键 chip、滚动条、安全表面全部指向 @innate/ui + packages/theme
  - 方法：人工核对 STYLEGUIDE.md 与 styleguide/ 六篇；grep 残留 orca 内部路径
  - 证据：grep 残留 orca 路径只出现在 SKILL.md 替换表、STYLEGUIDE.md 差异表、native-chat.md 的「不要照抄 orca 的部分」，无一条是指令
- F4-V2 [passed] components.md 覆盖 @innate/ui 的全部 primitive 并给出 orca 缺口的方案
  - 方法：与 node_modules/@innate/ui/src/components/ui/ 目录逐个比对
  - 证据：node_modules/@innate/ui/src/components/ui/ 共 58 个 .tsx，components.md 分组清单覆盖 58 个；orca 专属能力表 6 项各带过渡方案与正式方案
- F4-V3 [passed] toolbar.md 给出 orca titlebar ↔ webshell header ↔ 桌面顶栏的三方对照与实现级规格
  - 方法：人工核对 spec 的每个数值与来源
  - 证据：toolbar.md 的 36px titlebar、46×36 窗口按钮、80px 红绿灯占位、138px spacer、h-12 二级 header、rail 64px/子菜单 256px 与 orca main.css 及 webshell app-shell.tsx 实际取值一致
- F4-V4 [passed] Base UI 底座的写法在 style guide 里被正确表述
  - 方法：核对 primitive 约定与 tooltip 示例
  - 证据：STYLEGUIDE.md 与 components.md 均写明用 render prop 而非 asChild，并给出 <DropdownMenuTrigger render={<Button … />} /> 示例
- F4-V5 [passed] 顶栏、字体与入口 CSS 的结论与唯一执行源一致
  - 方法：合并 origin/main 后逐条核对 `docs/susu/plan/phases/W1-shell.md` 的 W1a.0 / W1a.2 / W1a.3
  - 证据：W1a.3「不拷 orca 的裸 titlebar-icon-button class」已落到 shell.css 与 toolbar.md；W1a.0 字体决策门落定为产品层接管并回写 plan；W1a.2 入口 CSS 改为 `@import "@innate-desktop/theme/index.css"` 并回写 plan

### F5 · 对齐结论文档与复核脚本

目标：orca ↔ innate-fe 的对齐结论可核对、可复现；「对不上给方案」有明确落点。
模块：M5
Spec：S2

- F5-V1 [passed] style-guide-alignment.md 逐项给出差异与处置
  - 方法：把脚本输出与文档表格逐条核对
  - 证据：style-guide-alignment.md §2 暗色差异表 4 项与 compare-palette.mjs 结构性差异输出一一对应；§6 的 6 项 orca 专属能力各有过渡方案与正式方案
- F5-V2 [passed] 复核脚本只读且可重复
  - 方法：node tools/compare-palette.mjs 连跑两次并比对输出
  - 证据：node tools/compare-palette.mjs 连跑两次输出逐行一致；脚本只含 readFileSync / existsSync，无写盘调用
- F5-V3 [passed] monorepo 现状与命令记录在 build-path 文档里
  - 方法：人工核对 docs/build-path/1-monorepo-init/README.md 的结构树与命令表
  - 证据：docs/build-path/1-monorepo-init/README.md 结构树与实际仓库文件一致，命令表覆盖 install/build/typecheck/test/verify/ui:sync 三态/compare-palette

## 涉及模块

- M1 [modify] .agents/skills/susu-overview — STYLEGUIDE.md 与 styleguide/ 六篇重写为面向 @innate/ui + packages/theme 的执行副本；新增 toolbar.md
- M2 [add] packages/theme — 产品 token 层、壳 chrome 层、机器可读契约与测试，是字面量的唯一合法落点
- M3 [add] tools — ui-sync.mjs（基座接入入口，去硬编码路径）与 compare-palette.mjs（中性色对照复核，只读）
- M4 [modify] . — 根 package.json、pnpm-workspace.yaml、tsconfig.base.json、pnpm-lock.yaml、.npmrc、.gitignore 组成 monorepo 骨架
- M5 [add] docs/build-path/1-monorepo-init — 骨架与接入的交付记录，以及 orca ↔ innate-fe 的对齐结论
- M6 [add] apps — 应用槽位说明（README），标注 W1 约定；不建包
- M7 [modify] docs/README.md — 文档地图补 build-path 与对齐结论入口
- M8 [modify] README.md — 仓库结构、UI 基座分层、常用命令与文档入口
- M9 [modify] docs/susu/plan/phases/W1-shell.md — W1a.0 字体决策门补记产品层接管；W1a.2 入口 CSS 改引产品层主题入口；顶栏控件规则与本任务对齐（唯一执行源的同步更新）

## Spec 关联

- S1 [add/done] docs/build-path/1-monorepo-init/README.md — monorepo 骨架与 UI 基座接入的交付记录
- S2 [add/done] docs/build-path/1-monorepo-init/style-guide-alignment.md — orca ↔ innate-fe 的对齐结论、差异处置与未决项
- S3 [modify/done] .agents/skills/susu-overview/STYLEGUIDE.md — 视觉规范执行副本改为面向本仓基座
- S4 [modify/done] .agents/skills/susu-overview/SKILL.md — token 三层规则与 style guide 索引
- S5 [modify/done] packages/theme/README.md — token 分层、主题变体与门禁说明
- S6 [modify/done] docs/susu/plan/phases/W1-shell.md — W1a.0 字体决策落定、W1a.2 入口 CSS 改为 `@import "@innate-desktop/theme/index.css"`

## 交付记录

- 2026-10-28：完成 mono repo 骨架（workspace / TS 基座 / 锁文件）与 UI 基座接入链路；`pnpm ui:sync` 打通本地 Verdaccio 私有源。
- 2026-10-28：建立 `packages/theme`（产品 token 层 + 壳 chrome 层），9 项 token 纪律测试通过。
- 2026-10-28：逐 token 核对 orca 与 `@innate/ui` 基础中性色，确认相等（暗色 4 处刻意差异），并据此修正默认主题变体为 `default`。
- 2026-10-28：重写 STYLEGUIDE.md 与 styleguide/ 六篇，新增 toolbar.md 的三方对照规格；对照表落在 style-guide-alignment.md。
- 2026-10-28：新增 tools/compare-palette.mjs，使中性色对齐结论可重复复核。
- 2026-10-28：合并 `origin/main` 后按唯一执行源 `docs/susu/plan/phases/W1-shell.md` 复核顶栏规则——W1a.3 与 plan1 评审已定「壳控件按规范取 `@innate/ui` Button，不拷 orca 的裸 class」。据此从 `packages/theme/src/shell.css` 移除 `.titlebar-icon-button` / `.sidebar-toggle`，同步改写 `styleguide/toolbar.md` 与 `style-guide-alignment.md` 的对应结论。
- 2026-10-28：回写唯一执行源：W1a.0 字体决策门落定为「产品层接管」（`packages/theme/src/tokens.css` 声明 Geist / SF Mono，字库随包分发，基础仓不改）；W1a.2 入口 CSS 改为 `@import "@innate-desktop/theme/index.css"`。
- PR #2 已开：feat: monorepo 骨架 + UI 基座接入 + style guide 对齐（qdriven/inante-desktop → main）

## 来源原文

### Issue #1

> tasks\\[0-setup.md，](http://0-setup.md) ```markdown # Setup Project ## Setup Style Guide 1. 使用innate-labs/references 里把 orca 的 style guide 和壳的 toolbar 对上 2. 需要和innate-fe 部分对上，如果对不上需要给出解决方案 ## Setup Mono Repo 1. 基于innate-fe-cli和innate-fe 构建mono repo 2. 检查当前是否已经可以满足了 ``` 完成这个任务

### PR #2

> 关联 Closes #1 —— `tasks/0-setup.md` 的两半：**Setup Style Guide** 与 **Setup Mono Repo**。 交付记录（task 文件）：`docs/sprints/task-1-inante-desktop-style-guide-mono-repo.md` --- ## 一、Setup Mono Repo ### 骨架 | 文件 | 作用 | | --- | --- | | `pnpm-workspace.yaml` | workspace 范围 `apps/*` + `packages/*`；构建白名单 `allowBuilds: { electron, esbuild }`；`minimumReleaseAgeExclude` 豁免内部包的发版年龄限制 | | `tsconfig.base.json` | 全仓 strict 基座（`noUncheckedIndexedAccess` / `noImplicitOverride` / `noFallthroughCasesInSwitch` / `verbatimModuleSyntax` 等） | | `package.json` | 统一 `build` / `typecheck` / `test` / `lint` / `verify` 入口 + `ui:sync` 三态；`packageManager: pnpm@12.14.0` 锁版本 | | `pnpm-lock.yaml` | 解析出 `@innate/ui@0.1.2` | | `apps/README.md` | 应用槽位说明（`@innate-desktop/desktop` 留到 W1，本次不建包、不写应用代码） | ### 基座接入 `tools/ui-sync.mjs` 定位 innate-fe 基础仓后调 `innate-fe-cli install`（发布 `@innate/*` → 写 `.npmrc` → 改写 `workspace:` 依赖 → `pnpm install`）。 定位优先级与 `innate-fe-cli` 内部一致：`--root` > `INNATE_FE_ROOT` > `.innate-fe-cli.json`（仓库根 / home）> 向上自动发现 `framework/innate-fe` / `base/innate-fe` / `innate-fe`。**不再有写死的绝对路径**；机器本地路径写在 `.innate-fe-cli.json` 并已 gitignore。 ### 「检查当前是否已经可以满足了」的结论 **骨架层已满足，应用层尚未开始。** 逐项核对结果见 `docs/build-path/1-monorepo-init/README.md`：workspace、锁文件、`ui:sync` 链路全部可用并验证过；剩余项属于 W1 应用实现。 --- ## 二、Setup Style Guide ### 对齐方法：不凭印象，逐 token 解析比对 对照对象是三份事实源——orca 的 `main.css`（`:root` / `.dark`）、`@innate/ui` 的 `tokens.css` 与 `themes/*.css`、innate-fe webshell 的 `app-shell.tsx`。新增 `tools/compare-palette.mjs` 把 `hsl()` / `oklch()` / `rgb()` 统一换算成 hex 再比，只读、可重复，使结论可复核。 ### 结论 **`@innate/ui` 基础 `:root` / `.dark`（shadcn Neutral）与 orca 的中性色逐 token 相等** —— 亮色全等；暗色只有 4 处刻意差异： | token | orca | `@innate/ui` 基础 | 处置 | | --- | --- | --- | --- | | `accent` | `#404040` | `#262626` | 固定 orca 值：基础仓值与 `muted` 同值，ghost 按钮与列表行 hover 会几乎不可见 | | `border` | 白 7% | 白 10% | 固定 orca 值：发丝线而非可见描边，符合「外壳退后」的定位 | | `sidebar-border` | 白 7% | 白 10% | 同上 | | `sidebar-ring` | `#525252` | `#737373` | 固定 orca 值：侧栏 focus 环更收敛 | **据此把默认主题变体从 `shadcn-zinc` 纠正为 `default`** —— `shadcn-zinc` 的中性色带 240 色相的淡蓝偏移，与 orca 的纯中性灰不等值（`muted-foreground` 差到 7），选它当默认值会让桌面端系统性偏离 orca 观感。 其余对齐项： | 项 | 结论 | | --- | --- | | 主题变体 | orca 无变体机制；`@innate/ui` 有 10 个 `data-theme` 变体，机制归基础仓，切换入口只有 `ThemeSelector` | | 字体 | orca 用 Geist / SF Mono，`@innate/ui` 基础层是 Inter → 产品层覆盖 `--font-sans` / `--font-mono`，Geist 字库随包分发 | | primitive | orca 自建 38 个（Radix 底座）vs `@innate/ui` 58 个（**Base UI** 底座）→ 唯一来源 = `@innate/ui`；触发器用 `render` prop，不用 `asChild` | | 按钮尺度 | orca 宽松（default h-9 / 14px）vs `@innate/ui` 紧凑（h-7 / 13px）→ 取 `@innate/ui`；顶栏内统一 `icon-sm` / `icon-xs` | | `destructive` | orca 实心 vs `@innate/ui` 淡底 → 取 `@innate/ui` | | `ghost` hover | orca `bg-accent` vs `@innate/ui` `bg-muted` → 取 `@innate/ui`；顶栏图标按钮就用 `Button variant="ghost"`（不拷 orca 的裸 class） | | 滚动条 / 列表选中配方 | 属壳 chrome 不是 primitive → 迁到本仓 `packages/theme/src/shell.css` | ### 壳的 toolbar 三方对齐 orca titlebar（36px 物理壳 + 自绘窗口控件）↔ innate-fe webshell header（`h-12` 内容语义）↔ 桌面顶栏，结论是**物理壳用 orca、内容语义用 webshell**：窗口控件只有桌面端有，但「左标题 / 右 `Badge` + `LocaleSelector` + `ThemeSelector`」的分区是 innate 家族共有的交互语言，桌面端应保持一致。 新增 `styleguide/toolbar.md` 给出实现级规格（36px / 46×36 / 80px / 138px / `h-12` 二级 header / rail 64px / 子菜单 256px），并列出对齐带来的具体改动。 ### 「对不上给方案」 orca 专属能力逐项给出**过渡方案 + 正式方案**，本仓不现造 primitive： | orca 能力 | `@innate/ui` 现状 | 过渡方案 | 正式方案 | | --- | --- | --- | --- | | 安全表面 `SecuritySurface` / `DialogContent surface="security"` | 无 `surface` prop | 产品层加 `--security-*` token 家族 + `DialogContent` 的 `className` | 基础仓 `pnpm ui:add` 加 `surface` 变体 | | `ShortcutKeyCombo`（Win/Linux 的 `+` 分隔） | 有 `Kbd`，无分隔符 | `Kbd` + 调用方按平台给字形 | 基础仓 `ui:add` | | `repo-multi-combobox` | 有 `command` + `popover` + `checkbox` | `Command` in `Popover` 自管多选态 | 基础仓 `ui:add` | | `pane-title` 等按钮变体 | 无 | 不迁移成 primitive；用 `Button` + `className` 局部实现 | 不需要 | | `--chat-*` / `--terminal-pane-title-on-*` | 无 | 未实现，随功能落地 | 不需要 | > **红线**：要求用户信任、批准、执行或移除代码的对话框必须走安全面。基础仓补齐前不得用普通 `Dialog` 顶替。 --- ## 三、与唯一执行源的对齐（合并 main 后复核） 合并 `origin/main` 后按 `docs/susu/plan/phases/W1-shell.md` 复核，发现两处需要回写，一处需要改本仓实现： | 项 | 计划要求 | 本 PR 的处置 | | --- | --- | --- | | **顶栏控件** | W1a.3：「顶栏控件按规范取 `@innate/ui` Button（`outline`）与图标按钮（`ghost`），不拷 orca 的裸 `titlebar-icon-button` class；不造 Toolbar 原语」 | 从 `packages/theme/src/shell.css` 移除 `.titlebar-icon-button` / `.sidebar-toggle`；壳 chrome 层只留不是按钮的 chrome。新增 1 项测试钉住这条规则 | | **W1a.0 字体决策门** | 「字体有唯一事实源」 | 落定为**产品层接管**：`packages/theme/src/tokens.css` 声明 `--font-sans: "Geist"…` / `--font-mono`，`@font-face` 加载随包分发的 Geist 可变字重（100–900）；基础仓的 Inter 默认不改（它服务其它消费方）。已回写进 plan | | **W1a.2 入口 CSS** | 原写 `@import "@innate/ui/tokens.css"` | 改为 `@import "@innate-desktop/theme/index.css"`（内部已按「基础 token → 产品 token → 壳 chrome」串好），避免入口重复引基础 token 把产品层覆盖顺序打乱。已回写进 plan | 回写 `docs/susu/plan/phases/W1-shell.md` 后，`packages/theme/src/shell.css` 的职责变成「**只放不是按钮的 chrome**」。 --- ## 四、设计 / Spec 变化（单列） | Spec | 变化 | | --- | --- | | `docs/build-path/1-monorepo-init/README.md` | **新增** —— 骨架与接入的交付记录 | | `docs/build-path/1-monorepo-init/style-guide-alignment.md` | **新增** —— orca ↔ innate-fe 对齐结论、差异处置与未决项 | | `.agents/skills/susu-overview/STYLEGUIDE.md` | **修改** —— 从 orca 原文副本改为面向本仓基座（`@innate/ui` + `packages/theme`）的执行副本 | | `.agents/skills/susu-overview/SKILL.md` | **修改** —— token 三层规则、style guide 索引、执法现状 | | `packages/theme/README.md` | **修改** —— 分层、主题变体、门禁 | | `docs/susu/plan/phases/W1-shell.md` | **修改** —— W1a.0 字体决策落定、W1a.2 入口 CSS 改引产品层主题入口 | 新增 `packages/theme`（`@innate-desktop/theme`）：产品 token 层（**本仓唯一允许出现字面量的文件**，明暗成对声明）+ 壳 chrome 层（不写字面量）+ 机器可读契约 + 9 项 token 纪律测试。 --- ## 五、验证 | 命令 | 结果 | | --- | --- | | `pnpm install` | `Already up to date / Done in 5ms using pnpm v12.14.0` | | `pnpm typecheck` | 通过（根 + `packages/theme`，`tsc --noEmit` 无错误） | | `pnpm test` | `packages/theme` **9 tests passed** | | `pnpm build` | 通过 | | `pnpm -r list --depth -1` | `innate-desktop@0.1.0` + `@innate-desktop/theme@0.1.0` | | `pnpm ui:sync` | `@innate/ui@0.1.2` 发布到本地 Verdaccio 并重装成功 | | `node tools/compare-palette.mjs` | 结构性差异仅 4 处（`accent` / `border` / `sidebar-border` / `sidebar-ring`），其余全部 SAME | | `task.py validate --phase done` | `ok: true`，无 error / warning | --- ## 六、未决（不阻塞本 PR） - 安全表面基础仓补齐（补齐前用产品层 `--security-*` token 过渡）。 - `ShortcutKeyCombo` 分隔符、多选 combobox 是否提 `ui:add`，取决于实际需求密度。 - `ghost` 的 hover 底色（`bg-muted` vs orca 的 `bg-accent`）——桌面端不加壳级按钮 class，观感差异若不可接受则回基础仓调 `ghost`。 - Base UI 浮层的 Portal 是否落在 Electron 拖拽区内 —— 桌面壳落地时逐个验证。 - `--window-controls-width`（138px）与 `--ui-zoom-factor` 由主进程注入 —— 待桌面端接上。 🤖 Generated with [Claude Code](https://claude.com/claude-code)
