---
schemaVersion: 1.0.0
id: task-local-w5-2-webcontents
title: W5.2 独立 WebContents 生命周期
createdAt: 2026-10-28T10:55:19.123311Z
updatedAt: 2026-10-28T10:55:19.123311Z
status: draft
branch: 
repository: 
sourceKind: local
sourcePath: 
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

WebContents 生命周期未接 provider 槽。

### 目标

多浏览器标签；切换不重载；关闭回收；崩溃隔离；挂 W1c registry。

### 范围

- - main provider 实现

### 非目标

- 仅限本任务范围；不越段实施

### 依赖

前置段全绿（见 Sprint README）；T 序串行。

### 假设

- 门禁与测试基建（W0/W1b 已建）可用

### 未决问题

见 Sprint README。

## 全局上下文

### 摘要

Sprint W5（docs/sprints/w5/README.md）子任务；需求细节见其来源原文快照与 plan 对应卡。

### 来源

- docs/sprints/w5/README.md
- docs/susu/plan/phases/W5-browser.md
- docs/susu/plan/04-platform-gap-review.md（如涉及）

### 约束

- passed 必须有可核查证据；token/认证 URL 不进日志快照证据
- 严格 TS；测试基线只增不减

### 全局更新

- 需要：否
- 计划：无

## 设计影响

### 是否受影响

否

### 现状行为

见问题节。

### 目标行为

见目标节。

### 决策

按 plan 卡与 04 文档约束执行。

### 风险

行为回退风险由门禁+smoke 兜底。

### 全局影响

无

## 功能与验证点

### F1 · 多标签/切换/关闭/加载失败/崩溃隔…

目标：多标签/切换/关闭/加载失败/崩溃隔离/窗口关闭
模块：M1
Spec：S1

- F1-V1 [done] 多标签/切换/关闭/加载失败/崩溃隔离/窗口关闭
  - 方法：契约测试+smoke
  - 证据：docs/susu/plan/evidence/W5/webcontents.md

## 涉及模块

- M1 [modify] innate-dogic/plugins/browser/src/main — 生命周期

## Spec 关联

- S1 [none] docs/susu/plan/phases/W5-browser.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。
- 2026-10-29 完成：`BrowserSurfaceService`（plugins/browser/src/main/index.ts）+
  electron 视图工厂（electron-view.ts）+ SurfaceHost provider 钩子
  （createView/deferredUrl/onViewAttached/onViewDetached/onViewClosed）+
  desktop ipc 窄通道 + renderer 挂 W1c registry。browser 34/34、desktop
  87/87、`pnpm verify` EXIT=0、electron spike 12/12。
  证据：docs/susu/plan/evidence/W5/webcontents.md。

## 来源原文

### 本地任务

需求来自 plan 对应卡；全文快照见 docs/sprints/w5/README.md 来源原文节，此处不重复。
