---
schemaVersion: 1.0.0
id: task-local-w1a-behavior-baseline
title: W1a.1 固定页面与 Surface 行为基线
createdAt: 2026-10-28T08:42:55.466189Z
updatedAt: 2026-10-28T08:46:54.261479Z
status: blocked
branch: 
repository: 
sourceKind: file
sourcePath: docs/susu/plan/phases/W1-shell.md
issueNumber: 
issueUrl: 
issueState: 
issueTitle: 
issueUpdatedAt: 
prNumber: 
prUrl: 
prState: 
prTitle: 
prUpdatedAt: 
---

## 任务上下文

### 问题

后续壳重构需要可重复的 simple/dev、Harness、控制台与窗口行为基线。

### 目标

在未经 UI 改造的 W0 实现上补齐公开页面与两个 WebContents Surface 的回归断言。

### 范围

- renderer/main 行为测试
- 窗口尺寸、resize 与 bounds 证据

### 非目标

- 不重写 magpie/DSH 启动协议，不实现 terminal/browser。
- 不降低 W0 行为与安全断言，不把认证 URL、token、key 写入快照或证据。
- 不复制 @innate/ui primitive，不在组件中硬编码颜色、字号或像素间距。
- W1a 不重写 Sidebar、不拆页面、不接 W2 pill，也不改变 Surface 多标签语义。

### 依赖

- W0 全绿；当前 W0.2–W0.8 仍为 draft，目标产品源码尚未迁入。

### 假设

- 真实 DSH/Electron 环境不可用时记录 failed，不用 mock 结果冒充真机通过。

### 未决问题


## 全局上下文

### 摘要

只新增行为测试和证据，固定 apps/desktop 与 tools/smoke-desktop 当前契约。

### 来源

- docs/CONTEXT.md
- docs/susu/plan/README.md
- docs/susu/plan/phases/W1-shell.md

### 约束

- 前置阶段未全绿时只允许计划，不实施产品代码。
- 严格使用 @innate/ui 单入口、产品主题入口和语义 token，明暗只经 .dark。
- 保持 strict TypeScript、W0 行为基线与进程/安全边界，验证证据必须来自真实执行。

### 全局更新

- 需要：否
- 计划：无；按 W1 既定架构实施，完成时只补阶段证据与任务状态。

## 设计影响

### 是否受影响

是

### 现状行为

W0 行为由真实桌面实现提供，但尚缺 W1 重构专用回归断言。

### 目标行为

simple/dev 页面、默认页、模式切换、Harness 状态与两个 Surface 生命周期均有可重复基线。

### 决策

- 先测旧行为再改 UI。
- URL 未变不 reload，显式停止才 close。

### 风险

- 环境差异可能导致真机验证失败，必须显式收口。

### 全局影响

无；不超出 W1 已定义的壳组合与 Surface 边界。

## 功能与验证点

### F1 · 页面与 Harness 基线

目标：固定导航、模式及对话行为
模块：M1
Spec：S1

- F1-V1 [pending] simple/dev 页面集合、默认页、模式切换和 Harness 启动状态与 W0 一致
  - 方法：运行 renderer/main 基线测试并保存结果
  - 证据：-
- F1-V2 [pending] 离开对话再返回且 URL 未变时不 reload，显式停止才 close
  - 方法：用 WebContents 生命周期测试记录 reload/close 调用
  - 证据：-

### F2 · 控制台与窗口基线

目标：固定 show/hide/bounds/close 和 resize 行为
模块：M1
Spec：S1

- F2-V1 [pending] 控制台 show/hide/bounds/close 与窗口 resize 行为有真实证据
  - 方法：运行桌面测试与 smoke，保存窗口尺寸和 bounds 摘要
  - 证据：-

## 涉及模块

- M1 [modify] apps/desktop/src/ — 新增 W0 行为基线测试
- M2 [modify] tools/smoke-desktop/ — 保存窗口与 Surface 真机基线

## Spec 关联

- S1 [modify/pending] docs/susu/plan/phases/W1-shell.md — 对应 W1 阶段任务卡；实施完成后登记实际行为与证据。
- S2 [none/-] docs/CONTEXT.md — 全局 Context 已定义模式门控、壳 IPC 与 Surface 安全约束，本任务按既有边界实施。

## 交付记录

- 计划已完成；等待 W0 全绿后按依赖实施

## 来源原文

### 本地文件：docs/susu/plan/phases/W1-shell.md

> W1a：UI 基座接入与窗口 titlebar **前置**：W0 全绿。 **明确不做**：不重写 Sidebar，不拆页面，不改 surface 多标签语义，不接 magpie pill。 ### W1a.0 字体决策（决策门，不开工不写码） > **已拍板（2026-10-28，setup 任务交付时一并落地）**：选 **(c) 产品层接管**——桌面端字体的事实源是本仓产品 token 层，基础仓保持 Inter 默认不动。 - **改动位置**：本仓 `packages/theme/src/tokens.css`（产品 token 层，本仓唯一允许字面量的地方）+ `packages/theme/src/fonts/`（字库随包分发）。基础仓 `innate-fe packages/ui/src/tokens.css` **不改**。 - **实施**：原二选一之外补第三种落法——产品层在 `:root` 声明 `--font-sans: "Geist", …` 与 `--font-mono`，并用 `@font-face` 加载随包分发的 Geist 可变字重（100–900）；产品层先 `@import "@innate/ui/tokens.css"` 再声明同名 token，靠源码顺序覆盖基础层的 Inter 默认。基础仓的 Inter 默认服务其它消费方，不为桌面端单方面改动。**产品代码禁止另写 `font-family`**，一律走 `--font-sans` / `--font-mono`。 - **验证**：决策记录在案；产品层已含字库与 token 声明；桌面 renderer 消费 `@innate-desktop/theme/index.css` 后字体生效。 - **完成标准**：W1a.2 开工前字体有唯一事实源（桌面端 = `packages/theme/src/tokens.css`）。 - **回退**：不适用（纯决策）。 ### W1a.1 固定现有页面与 Surface 行为基线 - **改动位置**：desktop renderer/main 测试、tools/smoke-desktop。 - **实施**： 1. 为 simple/dev 页面集合、默认页、模式切换和 Harness 启动状态补回归断言。 2. 记录 Harness 与 magpie 控制台 show/hide/bounds/close 的现有行为。 3. 增加“离开对话再返回，URL 未变不 reload”和“显式停止才 close”的测试。 4. 保存当前窗口尺寸、resize 与 WebContents bounds 计算证据。 - **验证**：测试在 W0 实现上通过；后续重构使用同一组断言。 - **完成标准**：行为基线覆盖现有公开页面和两个 WebContents Surface。 - **回退**：纯新增测试，无回退。 ### W1a.2 接入 Tailwind + token + ThemeProvider - **改动位置**：`apps/desktop/package.json`、electron-vite renderer 配置、renderer 入口 CSS。 - **实施**： 1. 添加 `@innate/ui`、`@innate-desktop/theme`、`tailwindcss`、`@tailwindcss/vite`（app devDependencies；只挂 renderer 配置）；`globals.css` 按已验证模式：`@import "tailwindcss"` + `@import "@innate-desktop/theme/index.css"` + 两条 `@source`（本仓源码与 `@innate/ui/src`，`@source` 写在入口文件、放所有 `@import` 之后）。入口**只引产品层入口**这一个主题入口——`@innate-desktop/theme/index.css` 内部已按「基础 token → 产品 token → 壳 chrome」的顺序串好，不必（也不应）在入口再单独引 `@innate/ui/tokens.css`，否则产品层的覆盖会被顺序打乱。 2. 引入宿主 ThemeProvider，明暗只经 `.dark` class，禁写 `prefers-color-scheme` 媒体查询。 3. 建立旧 CSS 到语义 token 的映射，先桥接壳样式，不要求一次重写所有业务页。 4. 禁止深引 `@innate/ui` 内部路径，不在本仓复制 primitive。 - **验证**：桌面明暗截图各一张；构建与 typecheck 通过；代表页面无裸样式；旧 simple/dev 行为不变。 - **完成标准**：桌面 renderer 可消费 UI 基座，主题和 token 有唯一来源。 - **回退**：摘除 renderer 的 Tailwind 插件与入口 import，恢复 W0 样式。 ### W1a.3 只换窗口 titlebar，状态槽留空 - **改动位置**：renderer `Titlebar.tsx` → `shell/TitlebarStrip`。 - **实施**： 1. 按 orca 窗口铬面形态重组顶栏：左 = 品牌/应用标识（Windows 形态），中 = 预留 `#titlebar-tabs` 空槽（本门留空），右 = 窗口控制占位（3×46px 语义）与右栏开关位；背景用 `--card` 系。 2. 顶栏控件按规范取 `@innate/ui` Button（`outline`）与图标按钮（`ghost`），不拷 orca 的裸 `titlebar-icon-button` class；不造 Toolbar 原语。 3. 右侧留一个空状态槽节点（W2 的网关 pill 挂这里），本门不接数据。 4. 窗口拖拽区、双击最大化等现行为保持。 - **验证**：DOM 断言三区结构 + 状态槽存在；窗口控制行为不回退；明暗下顶栏视觉截图。 - **完成标准**：titlebar 是唯一被替换的壳件；Sidebar/页面原样。 - **回退**：恢复 W0 `Titlebar.tsx`。

### Issue

> （未同步）

### PR

> （未同步）
