---
schemaVersion: 1.0.0
id: task-local-w1b-page-registry
title: W1b.1 页面注册表 slot/mode 元数据
createdAt: 2026-10-28T08:21:18.776019Z
updatedAt: 2026-10-28T08:24:52.465221Z
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

页面注册表需要同时表达页面归属槽位与模式门控，否则壳组合会继续散落导航与 simple/dev 判断。

### 目标

在不改页面 ID、默认页与门控结果的前提下扩展 slot/mode 元数据，为后续三栏组合提供单一注册入口。

### 范围

- 扩展 renderer pages.ts 的注册项类型与数据。
- 增加注册表、模式过滤和可选页面缺失的单元测试。

### 非目标

- 不实现 W1c 多 Surface 标签，不改变 attach/detach 或 destroy 生命周期。
- 不修改 magpie/DSH 启动、IPC、preload 或 SurfaceHost 协议。
- 不接 W2 网关 pill，不实现 W3 业务 Panel，不增加 terminal/browser 入口。
- 不重写 @innate/ui primitive，不新增私有 token，不复制 orca 组件。

### 依赖

- W0 与 W1a 全绿后才允许实施；当前仅完成分析。

### 假设

- 现有页面 ID、默认页和 simple/dev 页面集合以 W1a 行为基线为准。

### 未决问题


## 全局上下文

### 摘要

页面注册表属于 apps/desktop renderer 的组合层；只扩展元数据，不进入 core/kernel，也不改变插件装配与 Surface 契约。

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

页面注册承担现有页面和模式门控，但尚无 W1b 所需 slot/mode 壳元数据。

### 目标行为

每个注册项显式声明 slot 与 mode；simple/dev 过滤结果与旧行为一致，缺失的可选页面被安全忽略。

### 决策

- 保持既有页面 ID 与默认页，不做顺手重命名。
- 把模式过滤集中在注册表选择层，避免 Sidebar/ContentArea 各自复制门控。

### 风险

- 元数据默认值设计不当可能让 simple 泄露开发入口；需用双模式测试固定页面集合。

### 全局影响

无；页面门控、进程边界和 Surface 契约保持不变。

## 功能与验证点

### F1 · 页面 slot/mode 注册

目标：用单一注册表描述壳槽位与模式门控
模块：M1
Spec：S1

- F1-V1 [pending] 每个现有页面保留原 ID，并声明合法 slot/mode；默认页不变
  - 方法：运行 pages 注册表单测，逐项对照 W1a 页面清单与默认页基线
  - 证据：-
- F1-V2 [pending] simple 只得到原有公开页面，dev 保留原有完整页面集合
  - 方法：分别构造 simple/dev 模式，断言过滤后的 ID 集合与 W1a 基线完全一致
  - 证据：-

### F2 · 可选页面安全解析

目标：注册项缺失不拖垮壳启动
模块：M1
Spec：S1

- F2-V1 [pending] 删除一个可选页面注册后，选择器安全省略该项且无未捕获异常
  - 方法：使用可选页面缺失夹具运行负路径单测，断言其余页面与默认回退可用
  - 证据：-

## 涉及模块

- M1 [modify] apps/desktop/src/renderer/pages.ts — 扩展页面注册元数据与模式选择，保持既有 ID 和门控。

## Spec 关联

- S1 [modify/pending] docs/susu/plan/phases/W1-shell.md — W1b 原始任务卡；实施后补充页面元数据、壳组合与验收证据。
- S2 [none/-] docs/CONTEXT.md — 全局架构、协议与模块职责不因本次内部组合重构而变化。

## 交付记录

- 拆解完成；W0 由另一任务推进，等待 W0/W1a 全绿后实施

## 来源原文

### 本地文件：docs/susu/plan/phases/W1-shell.md

> W1b：Sidebar / ContentArea 与 App 拆分 **前置**：W1a 全绿。 **明确不做**：不改 attach/多标签语义（W1c），不动 magpie/DSH 启动。 ### W1b.1 壳组合抽取 - **改动位置**：renderer `App.tsx`、pages、新增 `shell/`（Sidebar、ContentArea、RightPanelHost 容器）。 - **实施**： 1. Sidebar 直接消费 `@innate/ui` 的 Sidebar primitive（不在 `shell/` 重写），只承载导航注册与底部状态位；ContentArea 承载页面；右栏先放可拆卸空容器（W3 填充）。 2. App 只负责组合与顶层状态；`pages.ts` 注册表扩展 slot/mode 元数据，页面 id 与门控不变。 3. simple 模式隐藏开发 Panel 和入口，dev 保持现有全部功能。 4. 新组合只用 `@innate/ui` primitive 与语义 token；业务逻辑保持原实现。 - **验证**：导航、模式切换、窗口控制、状态轮询与旧行为一致；删除一个可选页面注册时壳仍启动（负路径单测）；W0 冒烟全绿。 - **完成标准**：三栏布局可运行，App 不再直接实现每块壳 UI。 - **回退**：恢复 W1a 末的 App 组合。

### Issue

> （未同步）

### PR

> （未同步）
