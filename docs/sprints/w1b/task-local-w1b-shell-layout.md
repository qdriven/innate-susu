---
schemaVersion: 1.0.0
id: task-local-w1b-shell-layout
title: W1b.2 Sidebar ContentArea 与 App 壳组合
createdAt: 2026-10-28T08:21:19.677426Z
updatedAt: 2026-10-28T10:07:13.428133Z
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

T1 提供页面元数据后，需要把 Sidebar 与 ContentArea 从 App 中抽出，同时保留现有导航和顶层状态行为。

### 目标

形成直接消费 @innate/ui Sidebar 的左栏和承载页面的中栏，使 App 只保留组合与顶层状态。

### 范围

- 新增 shell 组合并调整 App.tsx。
- 覆盖导航、模式切换、窗口控制与状态轮询的组合测试。

### 非目标

- 不实现 W1c 多 Surface 标签，不改变 attach/detach 或 destroy 生命周期。
- 不修改 magpie/DSH 启动、IPC、preload 或 SurfaceHost 协议。
- 不接 W2 网关 pill，不实现 W3 业务 Panel，不增加 terminal/browser 入口。
- 不重写 @innate/ui primitive，不新增私有 token，不复制 orca 组件。

### 依赖

- W0 与 W1a 全绿后才允许实施；当前仅完成分析。
- T1 task-local-w1b-page-registry 完成并通过验证。

### 假设

- W1a 的 titlebar 与 ThemeProvider 保持原样，本任务不重写这些部件。

### 未决问题


## 全局上下文

### 摘要

本任务只改变 apps/desktop renderer 壳组合；main/preload/IPC 与 DSH/magpie 生命周期保持不变，页面业务组件继续复用。

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

App 直接实现导航与中栏壳 UI，页面切换和顶层状态与壳 markup 耦合。

### 目标行为

App 只组合 shell 与维护顶层状态；Sidebar 承载导航及底部状态位，ContentArea 按注册表渲染中栏页面。

### 决策

- 直接导入 @innate/ui Sidebar primitive，不在 shell 内重写 Sidebar。
- 保持 W1a titlebar 和现有窗口控制连接；状态轮询的启动/清理时序不变。

### 风险

- 拆分组件可能改变 effect 生命周期、默认导航或开发入口可见性；需组合测试和 W1a 基线对照。

### 全局影响

无；页面门控、进程边界和 Surface 契约保持不变。

## 功能与验证点

### F1 · Sidebar 与 ContentArea 抽取

目标：左栏导航和中栏页面由独立壳组合承担
模块：M1
Spec：S1

- F1-V1 [passed] Sidebar 从 @innate/ui 单入口消费 primitive，未在本仓复制 primitive 或硬编码视觉 token
  - 方法：静态检查 import 与样式，并运行 shell 组件测试
  - 证据：ShellSidebar 消费 @innate/ui Sidebar 原语（data-sidebar 铬面），nav-item[title] DOM 契约保持；无复制 primitive/无硬编码 token
- F1-V2 [passed] 点击导航只切换既有页面；simple 隐藏开发入口，dev 显示完整入口
  - 方法：以 simple/dev 两种模式渲染 App，触发导航并断言活动页面及入口集合
  - 证据：App.shell.test：simple 入口 2/dev 入口 6，点击导航切换既有页面

### F2 · App 顶层行为保持

目标：壳抽取不改变窗口与状态行为
模块：M1
Spec：S1

- F2-V1 [passed] 窗口控制仍调用原有 API，状态轮询只启动一次且卸载时清理
  - 方法：mock window.innate，断言窗口调用、轮询订阅数量及 unmount 清理
  - 证据：mock window.innate：窗口控制走原 API（winMin 等），轮询卸载后停止
- F2-V2 [passed] W1a titlebar 结构及默认页行为不回退
  - 方法：复用 W1a DOM 与默认页回归断言，对照基线结果
  - 证据：smoke --with-harness 全绿（W1a 顶栏断言+默认页行为不回退）

## 涉及模块

- M1 [add] apps/desktop/src/renderer/shell/ — 新增 Sidebar/ContentArea 壳组合并收敛 App 顶层组合。
- M2 [modify] apps/desktop/src/renderer/App.tsx — 移除逐块壳 UI，只保留组合与顶层状态。

## Spec 关联

- S1 [modify/done] docs/susu/plan/phases/W1-shell.md — W1b 原始任务卡；实施完成（证据 evidence/W1b/smoke/ + desktop 19 测试）。
- S2 [none/-] docs/CONTEXT.md — 全局架构、协议与模块职责不因本次内部组合重构而变化。

## 交付记录

- 拆解完成；等待 W0/W1a 全绿及 T1 完成
- W1b 全链验证齐

## 来源原文

### 本地文件：docs/susu/plan/phases/W1-shell.md

> W1b：Sidebar / ContentArea 与 App 拆分 **前置**：W1a 全绿。 **明确不做**：不改 attach/多标签语义（W1c），不动 magpie/DSH 启动。 ### W1b.1 壳组合抽取 - **改动位置**：renderer `App.tsx`、pages、新增 `shell/`（Sidebar、ContentArea、RightPanelHost 容器）。 - **实施**： 1. Sidebar 直接消费 `@innate/ui` 的 Sidebar primitive（不在 `shell/` 重写），只承载导航注册与底部状态位；ContentArea 承载页面；右栏先放可拆卸空容器（W3 填充）。 2. App 只负责组合与顶层状态；`pages.ts` 注册表扩展 slot/mode 元数据，页面 id 与门控不变。 3. simple 模式隐藏开发 Panel 和入口，dev 保持现有全部功能。 4. 新组合只用 `@innate/ui` primitive 与语义 token；业务逻辑保持原实现。 - **验证**：导航、模式切换、窗口控制、状态轮询与旧行为一致；删除一个可选页面注册时壳仍启动（负路径单测）；W0 冒烟全绿。 - **完成标准**：三栏布局可运行，App 不再直接实现每块壳 UI。 - **回退**：恢复 W1a 末的 App 组合。

### Issue

> （未同步）

### PR

> （未同步）
