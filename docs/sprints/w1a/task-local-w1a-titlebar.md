---
schemaVersion: 1.0.0
id: task-local-w1a-titlebar
title: W1a.3 替换窗口 titlebar 并保留状态空槽
createdAt: 2026-10-28T08:42:58.087378Z
updatedAt: 2026-10-28T10:34:52.392356Z
status: done
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

UI 基座就位后，需要只替换窗口 titlebar，而不带入 W1b/W2 范围。

### 目标

实现三区 TitlebarStrip，保留窗口控制、拖拽、双击最大化，并预留空状态槽。

### 范围

- Titlebar.tsx 到 shell/TitlebarStrip 的替换
- 三区 DOM、窗口行为与明暗验证

### 非目标

- 不重写 magpie/DSH 启动协议，不实现 terminal/browser。
- 不降低 W0 行为与安全断言，不把认证 URL、token、key 写入快照或证据。
- 不复制 @innate/ui primitive，不在组件中硬编码颜色、字号或像素间距。
- W1a 不重写 Sidebar、不拆页面、不接 W2 pill，也不改变 Surface 多标签语义。

### 依赖

- W0 已全绿：W0.1–W0.8 全部 done，产品树已迁入 innate-dogic/。
- T2 全绿

### 假设

- W1b 的 Sidebar/页面和 W2 的 pill 均不在本任务修改。

### 未决问题


## 全局上下文

### 摘要

仅改变 innate-dogic/apps/desktop renderer titlebar 组合，沿用现有窗口 IPC 与 @innate/ui Button primitive。

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

W0 Titlebar 提供窗口控制和拖拽行为。

### 目标行为

左侧品牌、中间空 tabs 槽、右侧窗口控制/右栏开关位与空状态槽组成唯一新顶栏。

### 决策

- toolbar 用 outline Button，图标用 ghost Button。
- 状态槽无数据、无假 pill。

### 风险

- 顶栏改造可能破坏拖拽区与窗口控制，需 DOM 和真机双重验证。

### 全局影响

无；不超出 W1 已定义的壳组合与 Surface 边界。

## 功能与验证点

### F1 · 三区顶栏与空槽

目标：窗口铬面符合 W1a 边界
模块：M1
Spec：S1

- F1-V1 [passed] DOM 包含品牌、#titlebar-tabs、窗口控制、右栏开关位和空状态槽
  - 方法：运行 TitlebarStrip DOM 断言
  - 证据：docs/susu/plan/evidence/W1a/titlebar.md：3 文件 10 测试；真机三区、空槽和 3×46 控件通过
- F1-V2 [passed] 控件只消费 @innate/ui Button 与语义 token
  - 方法：静态检查 import、class 和 token 使用
  - 证据：TitlebarStrip.tsx 仅从 @innate/ui 引入 Button；语义 token，无深引、无 W2 pill

### F2 · 窗口行为与视觉回归

目标：替换顶栏不改变现有行为
模块：M1
Spec：S1

- F2-V1 [passed] 拖拽、双击最大化及窗口控制行为不回退
  - 方法：运行窗口控制测试与真实 Electron 冒烟
  - 证据：docs/susu/plan/evidence/W1a/titlebar.md：窗口 DOM 测试及真机最大化、双击还原通过
- F2-V2 [passed] 明暗截图和 T1/T2 行为基线均通过
  - 方法：保存截图并重跑全部 W1a 基线
  - 证据：docs/susu/plan/evidence/W1a/titlebar-smoke/theme-light.png 与 theme-dark.png；完整 W1a 真机冒烟通过

## 涉及模块

- M1 [add] innate-dogic/apps/desktop/src/renderer/src/shell/TitlebarStrip.tsx — 新增三区顶栏组合
- M2 [modify] innate-dogic/apps/desktop/src/renderer/src/Titlebar.tsx — 收敛到 TitlebarStrip，保留现有窗口 API

## Spec 关联

- S1 [modify/done] docs/susu/plan/phases/W1-shell.md — 已登记 W1a.3 实际行为、验证结果与证据链接。
- S2 [none/-] docs/CONTEXT.md — 全局 Context 已定义模式门控、壳 IPC 与 Surface 安全约束，本任务按既有边界实施。

## 交付记录

- 计划已完成；等待 W0 全绿后按依赖实施
- W1a.2 构建、类型、基线与明暗真机全绿，开始替换顶栏
- 3 文件 10 测试、桌面 build/typecheck 与完整真机冒烟通过

## 来源原文

### 本地文件：docs/susu/plan/phases/W1-shell.md

> W1a：UI 基座接入与窗口 titlebar **前置**：W0 全绿。 **明确不做**：不重写 Sidebar，不拆页面，不改 surface 多标签语义，不接 magpie pill。 ### W1a.0 字体决策（决策门，不开工不写码） > **已拍板（2026-10-28，setup 任务交付时一并落地）**：选 **(c) 产品层接管**——桌面端字体的事实源是本仓产品 token 层，基础仓保持 Inter 默认不动。 - **改动位置**：本仓 `packages/theme/src/tokens.css`（产品 token 层，本仓唯一允许字面量的地方）+ `packages/theme/src/fonts/`（字库随包分发）。基础仓 `innate-fe packages/ui/src/tokens.css` **不改**。 - **实施**：原二选一之外补第三种落法——产品层在 `:root` 声明 `--font-sans: "Geist", …` 与 `--font-mono`，并用 `@font-face` 加载随包分发的 Geist 可变字重（100–900）；产品层先 `@import "@innate/ui/tokens.css"` 再声明同名 token，靠源码顺序覆盖基础层的 Inter 默认。基础仓的 Inter 默认服务其它消费方，不为桌面端单方面改动。**产品代码禁止另写 `font-family`**，一律走 `--font-sans` / `--font-mono`。 - **验证**：决策记录在案；产品层已含字库与 token 声明；桌面 renderer 消费 `@innate-desktop/theme/index.css` 后字体生效。 - **完成标准**：W1a.2 开工前字体有唯一事实源（桌面端 = `packages/theme/src/tokens.css`）。 - **回退**：不适用（纯决策）。 ### W1a.1 固定现有页面与 Surface 行为基线 - **改动位置**：desktop renderer/main 测试、tools/smoke-desktop。 - **实施**： 1. 为 simple/dev 页面集合、默认页、模式切换和 Harness 启动状态补回归断言。 2. 记录 Harness 与 magpie 控制台 show/hide/bounds/close 的现有行为。 3. 增加“离开对话再返回，URL 未变不 reload”和“显式停止才 close”的测试。 4. 保存当前窗口尺寸、resize 与 WebContents bounds 计算证据。 - **验证**：测试在 W0 实现上通过；后续重构使用同一组断言。 - **完成标准**：行为基线覆盖现有公开页面和两个 WebContents Surface。 - **回退**：纯新增测试，无回退。 ### W1a.2 接入 Tailwind + token + ThemeProvider - **改动位置**：`apps/desktop/package.json`、electron-vite renderer 配置、renderer 入口 CSS。 - **实施**： 1. 添加 `@innate/ui`、`@innate-desktop/theme`、`tailwindcss`、`@tailwindcss/vite`（app devDependencies；只挂 renderer 配置）；`globals.css` 按已验证模式：`@import "tailwindcss"` + `@import "@innate-desktop/theme/index.css"` + 两条 `@source`（本仓源码与 `@innate/ui/src`，`@source` 写在入口文件、放所有 `@import` 之后）。入口**只引产品层入口**这一个主题入口——`@innate-desktop/theme/index.css` 内部已按「基础 token → 产品 token → 壳 chrome」的顺序串好，不必（也不应）在入口再单独引 `@innate/ui/tokens.css`，否则产品层的覆盖会被顺序打乱。 2. 引入宿主 ThemeProvider，明暗只经 `.dark` class，禁写 `prefers-color-scheme` 媒体查询。 3. 建立旧 CSS 到语义 token 的映射，先桥接壳样式，不要求一次重写所有业务页。 4. 禁止深引 `@innate/ui` 内部路径，不在本仓复制 primitive。 - **验证**：桌面明暗截图各一张；构建与 typecheck 通过；代表页面无裸样式；旧 simple/dev 行为不变。 - **完成标准**：桌面 renderer 可消费 UI 基座，主题和 token 有唯一来源。 - **回退**：摘除 renderer 的 Tailwind 插件与入口 import，恢复 W0 样式。 ### W1a.3 只换窗口 titlebar，状态槽留空 - **改动位置**：renderer `Titlebar.tsx` → `shell/TitlebarStrip`。 - **实施**： 1. 按 orca 窗口铬面形态重组顶栏：左 = 品牌/应用标识（Windows 形态），中 = 预留 `#titlebar-tabs` 空槽（本门留空），右 = 窗口控制占位（3×46px 语义）与右栏开关位；背景用 `--card` 系。 2. 顶栏控件按规范取 `@innate/ui` Button（`outline`）与图标按钮（`ghost`），不拷 orca 的裸 `titlebar-icon-button` class；不造 Toolbar 原语。 3. 右侧留一个空状态槽节点（W2 的网关 pill 挂这里），本门不接数据。 4. 窗口拖拽区、双击最大化等现行为保持。 - **验证**：DOM 断言三区结构 + 状态槽存在；窗口控制行为不回退；明暗下顶栏视觉截图。 - **完成标准**：titlebar 是唯一被替换的壳件；Sidebar/页面原样。 - **回退**：恢复 W0 `Titlebar.tsx`。

### Issue

> （未同步）

### PR

> （未同步）
