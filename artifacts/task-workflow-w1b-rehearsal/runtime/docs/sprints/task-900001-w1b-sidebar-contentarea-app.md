---
schemaVersion: 1.0.0
id: task-900001-w1b-sidebar-contentarea-app
title: W1b Sidebar ContentArea App 拆分（隔离预演）
createdAt: 2026-10-28T07:18:49.053647Z
updatedAt: 2026-10-28T07:18:49.987143Z
status: blocked
branch: 
repository: fixture/rehearsal-only
sourceKind: issue
sourcePath: 
issueNumber: 900001
issueUrl: 
issueState: open
issueTitle: W1b Sidebar ContentArea App 拆分（隔离预演）
issueUpdatedAt: 
prNumber: 
prUrl: 
prState: 
prTitle: 
prUpdatedAt: 
---

## 任务上下文

### 问题

计划要求把桌面壳组合抽取为 Sidebar、ContentArea 与 RightPanelHost；当前仓库尚未迁入 W0 产品源码。

### 目标

在不改变 Surface 与 DSH/magpie 协议的前提下形成三栏壳，并保留原有页面门控和行为。

### 范围

- 抽取壳组合
- 扩展 pages slot/mode 元数据
- 增加可拆卸右栏空容器
- 补行为与负路径验证

### 非目标

- 不实现 W1c 多标签
- 不修改 DSH/magpie 启动协议
- 不自绘 Sidebar primitive

### 依赖

- W1a 全绿；当前状态板仍为待执行，开工门禁未满足

### 假设


### 未决问题

- 真实 Issue 关联需在 gh 可用后确认；本任务仅使用隔离夹具

## 全局上下文

### 摘要

W1b 只改变 desktop renderer 的组合边界，继续使用 @innate/ui primitive 与语义 token，不改变 Surface、DSH 或 magpie 契约。

### 来源

- docs/CONTEXT.md
- docs/susu/plan/phases/W1-shell.md

### 约束

- primitive 唯一来源为 @innate/ui
- simple/dev 门控不回退
- renderer 不获得 Node/shell
- 未经要求不执行 Git/GitHub 写操作

### 全局更新

- 需要：否
- 计划：无；W1b 是既定壳组合计划，不新增全局架构事实

## 设计影响

### 是否受影响

是

### 现状行为

计划现状为 App 直接组合各块壳 UI；当前仓库尚未迁入 W0 产品源码，需在依赖完成后复核实现。

### 目标行为

App 只保留组合与顶层状态，Sidebar、ContentArea、RightPanelHost 分别承担壳区域。

### 决策

- 直接消费 @innate/ui Sidebar primitive
- pages 只扩展 slot/mode 元数据，页面 id 与门控不变
- 右栏只建可拆卸空容器

### 风险

- W0/W1a 未完成导致源码与行为基线缺失
- 导航或 simple/dev 门控回归

### 全局影响

不改变全局架构；完成后按证据同步阶段状态与关联 Spec

## 功能与验证点

### F1 · 抽取 Sidebar 与 ContentArea 壳组合

目标：三栏可运行且 App 不再直接实现每块壳 UI
模块：M1, M2
Spec：S1

- F1-V1 [pending] 导航、模式切换、窗口控制与状态轮询行为不回退
  - 方法：复用 W1a 行为断言并运行桌面冒烟
  - 证据：-
- F1-V2 [pending] 删除一个可选页面注册时壳仍启动
  - 方法：运行可选页面缺失的负路径单测
  - 证据：-

### F2 · 扩展 pages slot/mode 元数据

目标：保持页面 id 和 simple/dev 门控不变
模块：M3
Spec：S1

- F2-V1 [pending] simple 隐藏开发 Panel 和入口，dev 保留现有功能
  - 方法：运行注册表与两种模式的页面集合测试
  - 证据：-

### F3 · 增加可拆卸 RightPanelHost 空容器

目标：为 W3 提供右栏挂载点但本门不实现业务 Panel
模块：M2, M4
Spec：S1

- F3-V1 [pending] 右栏容器可拆卸且 W0 冒烟全绿
  - 方法：运行容器生命周期测试与 W0 桌面冒烟
  - 证据：-

## 涉及模块

- M1 [modify] innate-dogic/apps/desktop/src/renderer/App.tsx — 收敛为壳组合与顶层状态；目标文件需由 W0/W1a 提供
- M2 [add] innate-dogic/apps/desktop/src/renderer/shell — 承载 Sidebar、ContentArea 与 RightPanelHost 组合
- M3 [modify] innate-dogic/apps/desktop/src/renderer/pages.ts — 扩展 slot/mode 元数据；目标文件需由 W0/W1a 提供
- M4 [add] innate-dogic/apps/desktop/src/renderer/shell.test.tsx — 覆盖壳组合、门控和可选页面缺失负路径

## Spec 关联

- S1 [modify/pending] docs/susu/plan/phases/W1-shell.md — W1b.1 的直接设计与验收 Spec
- S2 [none/-] docs/CONTEXT.md — 全局架构与协议不变

## 交付记录

- 隔离预演：仅填写分析与验证计划，不实施 W1b
- 预演：W1a 未全绿且 W0 产品源码尚未迁入，停止在实施前

## 来源原文

### Issue #900001

> TEST FIXTURE ONLY，不是真实 GitHub Issue。内容取自 docs/susu/plan/phases/W1-shell.md 的 W1b.1。

### PR

> （未同步）
