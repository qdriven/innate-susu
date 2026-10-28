---
schemaVersion: 1.0.0
id: task-local-w1b-shell-regression
title: W1b.4 壳行为回归与阶段证据
createdAt: 2026-10-28T08:21:21.448889Z
updatedAt: 2026-10-28T08:24:53.289370Z
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

前三个任务分别改变元数据和壳组合，需要统一证据证明 W1b 没有破坏 W0/W1a 行为。

### 目标

收口壳行为负路径、真实 Electron 冒烟和 W1b 证据，明确完成或失败，不以单测替代真实桌面验收。

### 范围

- 补齐壳组合与 smoke 断言。
- 运行全量门禁、W0 桌面冒烟并保存 W1b 证据。

### 非目标

- 不实现 W1c 多 Surface 标签，不改变 attach/detach 或 destroy 生命周期。
- 不修改 magpie/DSH 启动、IPC、preload 或 SurfaceHost 协议。
- 不接 W2 网关 pill，不实现 W3 业务 Panel，不增加 terminal/browser 入口。
- 不重写 @innate/ui primitive，不新增私有 token，不复制 orca 组件。

### 依赖

- W0 与 W1a 全绿后才允许实施；当前仅完成分析。
- T2 与 T3 完成并通过各自验证。

### 假设

- 执行时本机具备 W0 所需 Electron/DSH 冒烟环境；不可用时记录 failed，不降级为通过。

### 未决问题


## 全局上下文

### 摘要

本任务是 W1b 出口门禁，验证 apps/desktop 与 tools/smoke-desktop 的行为契约；不修改运行时协议，不替代 W1c 多标签验收。

### 来源

- docs/CONTEXT.md
- docs/susu/plan/README.md
- docs/susu/plan/phases/W1-shell.md

### 约束

- 实施门禁为 W1a 全绿；W0 由另一任务推进，本 Sprint 当前仅拆解，不越过门禁。
- 只从 @innate/ui 单入口消费 primitive，使用语义 token，明暗由 .dark class 控制。
- 保持 strict TypeScript、现有页面 ID 与 simple/dev 门控，业务逻辑留在原实现。
- 不降低 W0 行为与安全断言；认证 URL、token、key 不进入证据。

### 全局更新

- 需要：否
- 计划：无；W1b 只调整 renderer 内部组合，不改变全局架构、模块职责或协议。

## 设计影响

### 是否受影响

是

### 现状行为

分散的组件验证不足以证明真实 Electron 中三栏组合、窗口控制和状态行为一致。

### 目标行为

以组件负路径、真实 Electron CDP 冒烟和证据文件共同构成 W1b 出口；任何 W0 回退都阻止进入 W1c。

### 决策

- 保留旧断言并新增三栏断言，不通过删除测试或放宽安全门禁取得通过。
- 记录实际命令、退出码、测试数和截图路径，不预写结果。

### 风险

- 环境缺失或旧行为回退会使验收失败；必须显式记录并修复，不能标记 done。

### 全局影响

无；页面门控、进程边界和 Surface 契约保持不变。

## 功能与验证点

### F1 · 壳行为与负路径回归

目标：统一覆盖 W1b 公开行为及缺失可选页降级
模块：M1
Spec：S1

- F1-V1 [pending] 导航、模式切换、窗口控制、状态轮询与 W1a 基线一致
  - 方法：运行 desktop 组件/集成测试并保存实际结果
  - 证据：-
- F1-V2 [pending] 删除一个可选页面注册时壳仍启动，其余页面可导航
  - 方法：运行缺失可选注册的负路径单测并保存实际结果
  - 证据：-
- F1-V3 [pending] simple 不显示开发 Panel/入口，dev 保持全部现有功能
  - 方法：在真实 Electron simple/dev 两种模式下执行 DOM 与交互断言
  - 证据：-

### F2 · W0 冒烟与阶段证据

目标：W1b 全量门禁和真实桌面验收可复查
模块：M1
Spec：S1

- F2-V1 [pending] pnpm build、pnpm typecheck、pnpm test 均通过且记录实际测试数
  - 方法：在仓库根依次执行三项命令，保存退出码和测试汇总
  - 证据：-
- F2-V2 [pending] pnpm smoke:desktop 的 W0 基线断言全绿，新增三栏断言通过
  - 方法：运行真实 Electron CDP 冒烟，保存断言、截图与退出码；环境失败则标 failed
  - 证据：-
- F2-V3 [pending] W1b 证据完整且不含认证 URL、token 或 key
  - 方法：核对 docs/susu/plan/evidence/W1b/ 的命令摘要与截图并执行敏感信息检查
  - 证据：-

## 涉及模块

- M1 [modify] tools/smoke-desktop/ — 扩展真实 Electron 三栏、双模式和旧行为回归。
- M2 [add] docs/susu/plan/evidence/W1b/ — 保存 W1b 实际命令、测试数、截图和限制。

## Spec 关联

- S1 [modify/pending] docs/susu/plan/phases/W1-shell.md — W1b 原始任务卡；实施后补充页面元数据、壳组合与验收证据。
- S2 [none/-] docs/CONTEXT.md — 全局架构、协议与模块职责不因本次内部组合重构而变化。

## 交付记录

- 拆解完成；等待 W0/W1a 全绿及 T2、T3 完成

## 来源原文

### 本地文件：docs/susu/plan/phases/W1-shell.md

> W1b：Sidebar / ContentArea 与 App 拆分 **前置**：W1a 全绿。 **明确不做**：不改 attach/多标签语义（W1c），不动 magpie/DSH 启动。 ### W1b.1 壳组合抽取 - **改动位置**：renderer `App.tsx`、pages、新增 `shell/`（Sidebar、ContentArea、RightPanelHost 容器）。 - **实施**： 1. Sidebar 直接消费 `@innate/ui` 的 Sidebar primitive（不在 `shell/` 重写），只承载导航注册与底部状态位；ContentArea 承载页面；右栏先放可拆卸空容器（W3 填充）。 2. App 只负责组合与顶层状态；`pages.ts` 注册表扩展 slot/mode 元数据，页面 id 与门控不变。 3. simple 模式隐藏开发 Panel 和入口，dev 保持现有全部功能。 4. 新组合只用 `@innate/ui` primitive 与语义 token；业务逻辑保持原实现。 - **验证**：导航、模式切换、窗口控制、状态轮询与旧行为一致；删除一个可选页面注册时壳仍启动（负路径单测）；W0 冒烟全绿。 - **完成标准**：三栏布局可运行，App 不再直接实现每块壳 UI。 - **回退**：恢复 W1a 末的 App 组合。

### Issue

> （未同步）

### PR

> （未同步）
