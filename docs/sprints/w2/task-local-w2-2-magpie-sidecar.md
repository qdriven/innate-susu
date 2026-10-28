---
schemaVersion: 1.0.0
id: task-local-w2-2-magpie-sidecar
title: W2.2 统一 magpie sidecar 生命周期
createdAt: 2026-10-28T10:53:33.446092Z
updatedAt: 2026-10-28T10:53:33.446092Z
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

desktop 私有 serve 生命周期与 services MagpieGateway 并存重复。

### 目标

复用 MagpieGateway ensureRunning/healthcheck/退避；已运行实例复用不重复启动；状态映射 GatewayStatus；保留直连降级但 UI 明示。

### 范围

- - services/model-gateway 注入化改造
- - desktop launcher 接线

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

Sprint W2（docs/sprints/w2/README.md）子任务；需求细节见其来源原文快照与 plan 对应卡。

### 来源

- docs/sprints/w2/README.md
- docs/susu/plan/phases/W2-runtime.md
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

### F1 · 复用/未安装/超时/恢复/退避/显式…

目标：复用/未安装/超时/恢复/退避/显式停止不重启契约测试全过
模块：M1
Spec：S1

- F1-V1 [pending] 复用/未安装/超时/恢复/退避/显式停止不重启契约测试全过
  - 方法：vitest 契约用例
  - 证据：-
- F1-V2 [pending] 桌面不再有第二套等价 serve 生命周期
  - 方法：代码审查+矩阵回写
  - 证据：-

## 涉及模块

- M1 [modify] innate-dogic/services/model-gateway/src/index.ts — 注入化与状态映射
- M2 [modify] innate-dogic/apps/desktop/src/main/launcher.ts — 接线统一实现

## Spec 关联

- S1 [none] docs/susu/plan/phases/W2-runtime.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。

## 来源原文

### 本地任务

需求来自 plan 对应卡；全文快照见 docs/sprints/w2/README.md 来源原文节，此处不重复。
