---
schemaVersion: 1.0.0
id: task-local-w5-4
title: W5.4 默认拒绝敏感权限
createdAt: 2026-10-28T10:55:19.947315Z
updatedAt: 2026-10-30T00:00:00.000Z
status: done
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

权限默认策略未定。

### 目标

setPermissionRequestHandler 全 deny；拒绝日志脱敏落盘；其他 Surface 不受影响。

### 范围

- - 权限 handler

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

### F1 · 逐类权限请求均拒…

目标：逐类权限请求均拒
模块：M1
Spec：S1

- F1-V1 [done] 逐类权限请求均拒
  - 方法：测试页验证
  - 证据：docs/susu/plan/evidence/W5/permissions.md（单元测试 browser 49/49、
    desktop 96/96；electron spike 23/23；全量门禁退出码 0）

## 涉及模块

- M1 [modify] innate-dogic/plugins/browser/src/main — 权限策略

## Spec 关联

- S1 [none] docs/susu/plan/phases/W5-browser.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。
- 2026-10-30 完成：权限策略纯模块 `permission.ts`（origin 脱敏提取 +
  全拒决策，不依赖 electron）+ 接线 `attachPermissionPolicy`（只挂
  `persist:innate-browser` 分区 session 的 request/check handler，
  request/check 一律拒绝，事件按来源 webContents 路由）；服务层
  `permission-denied` 事件按会话转发；面板呈现脱敏拒绝文案。
  browser 49/49、desktop 96/96、spike 23/23、门禁退出码 0。
  证据 docs/susu/plan/evidence/W5/permissions.md。

## 来源原文

### 本地任务

需求来自 plan 对应卡；全文快照见 docs/sprints/w5/README.md 来源原文节，此处不重复。
