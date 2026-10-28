---
schemaVersion: 1.0.0
id: task-local-w1b-right-panel-host
title: W1b.3 可拆卸 RightPanelHost 空容器
createdAt: 2026-10-28T08:21:20.626874Z
updatedAt: 2026-10-28T10:07:13.693125Z
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

三栏壳需要稳定的右栏扩展点，但 W1b 不能提前实现 W3 工作区业务 Panel。

### 目标

提供可拆卸的 RightPanelHost 空容器，接入 App 组合并保持 simple/dev 门控与中栏行为不变。

### 范围

- 新增 RightPanelHost 容器及 App 挂载。
- 测试空状态、拆卸和 simple/dev 可见性。

### 非目标

- 不实现 W1c 多 Surface 标签，不改变 attach/detach 或 destroy 生命周期。
- 不修改 magpie/DSH 启动、IPC、preload 或 SurfaceHost 协议。
- 不接 W2 网关 pill，不实现 W3 业务 Panel，不增加 terminal/browser 入口。
- 不重写 @innate/ui primitive，不新增私有 token，不复制 orca 组件。

### 依赖

- W0 与 W1a 全绿后才允许实施；当前仅完成分析。
- T2 task-local-w1b-shell-layout 完成并通过验证。

### 假设

- 右栏的具体业务内容与数据契约由 W3 决定，本任务不预设。

### 未决问题


## 全局上下文

### 摘要

RightPanelHost 是 apps/desktop 的 L2 壳扩展点，不是新 primitive、插件协议或工作区实现；不改变全局 Surface/Panel 契约。

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

当前壳没有独立可拆卸的右栏挂载点。

### 目标行为

App 可挂载或移除空 RightPanelHost；容器不加载业务模块，simple 不显示开发 Panel/入口，dev 保留现有功能。

### 决策

- 只建立组合边界和空状态，不创建工作区面板、IPC 或假数据。
- 容器移除不得影响 Sidebar、ContentArea 与既有 Surface。

### 风险

- 过早定义业务 props 会把 W3 设计耦合进 W1b；空容器应保持最小接口。

### 全局影响

无；页面门控、进程边界和 Surface 契约保持不变。

## 功能与验证点

### F1 · 可拆卸右栏空容器

目标：建立稳定但不带业务语义的右栏挂载点
模块：M1
Spec：S1

- F1-V1 [passed] 挂载时呈现可访问的空右栏，未加载 W3 业务 Panel 或发起新 IPC
  - 方法：渲染 App 并断言右栏空状态、业务模块未导入且无新增 API 调用
  - 证据：RightPanelHost 空容器无业务导入无新 IPC（代码+测试断言）
- F1-V2 [passed] 移除 RightPanelHost 后，导航、模式切换和中栏页面仍正常工作
  - 方法：以有/无右栏两种组合运行同一组壳交互测试
  - 证据：rightPanel=false 时导航/模式/中栏不受影响（组件测试）
- F1-V3 [passed] simple 不暴露开发 Panel 或入口，dev 既有入口不减少
  - 方法：对照 T1/W1a 门控基线运行双模式断言
  - 证据：simple 不渲染右栏（queryByTestId null），dev 入口不减

## 涉及模块

- M1 [add] apps/desktop/src/renderer/shell/RightPanelHost.tsx — 提供 RightPanelHost 最小空容器。
- M2 [modify] apps/desktop/src/renderer/App.tsx — 以可拆卸方式组合右栏，不接业务。

## Spec 关联

- S1 [modify/done] docs/susu/plan/phases/W1-shell.md — W1b 原始任务卡；实施完成（证据 evidence/W1b/smoke/ + desktop 19 测试）。
- S2 [none/-] docs/CONTEXT.md — 全局架构、协议与模块职责不因本次内部组合重构而变化。

## 交付记录

- 拆解完成；等待 W0/W1a 全绿及 T2 完成
- W1b 全链验证齐

## 来源原文

### 本地文件：docs/susu/plan/phases/W1-shell.md

> W1b：Sidebar / ContentArea 与 App 拆分 **前置**：W1a 全绿。 **明确不做**：不改 attach/多标签语义（W1c），不动 magpie/DSH 启动。 ### W1b.1 壳组合抽取 - **改动位置**：renderer `App.tsx`、pages、新增 `shell/`（Sidebar、ContentArea、RightPanelHost 容器）。 - **实施**： 1. Sidebar 直接消费 `@innate/ui` 的 Sidebar primitive（不在 `shell/` 重写），只承载导航注册与底部状态位；ContentArea 承载页面；右栏先放可拆卸空容器（W3 填充）。 2. App 只负责组合与顶层状态；`pages.ts` 注册表扩展 slot/mode 元数据，页面 id 与门控不变。 3. simple 模式隐藏开发 Panel 和入口，dev 保持现有全部功能。 4. 新组合只用 `@innate/ui` primitive 与语义 token；业务逻辑保持原实现。 - **验证**：导航、模式切换、窗口控制、状态轮询与旧行为一致；删除一个可选页面注册时壳仍启动（负路径单测）；W0 冒烟全绿。 - **完成标准**：三栏布局可运行，App 不再直接实现每块壳 UI。 - **回退**：恢复 W1a 末的 App 组合。

### Issue

> （未同步）

### PR

> （未同步）
