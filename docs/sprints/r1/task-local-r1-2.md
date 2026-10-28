---
schemaVersion: 1.0.0
id: task-local-r1-2
title: R1.2 收敛共享实现并保留桌面语义
createdAt: 2026-10-28T10:55:39.129418Z
updatedAt: 2026-10-28T10:55:39.129418Z
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

两套 Harness 实现并存。

### 目标

系统 Node 解析/端口/URL 捕获/就绪/脱敏日志/状态事件/停止入 services/harness-runtime；配置显式覆盖（DSH_HOME/patch/超时）；矩阵逐项对照后 desktop 删私有实现，仅留 adapter。

### 范围

- - 共享实现收敛
- - desktop adapter 化

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

Sprint R1（docs/sprints/r1/README.md）子任务；需求细节见其来源原文快照与 plan 对应卡。

### 来源

- docs/sprints/r1/README.md
- docs/susu/plan/phases/R1-harness.md
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

### F1 · shim/首启/patch/重复 l…

目标：shim/首启/patch/重复 launch/超时/异常退出/停止/脱敏（T1 断言重跑）
模块：M1
Spec：S1

- F1-V1 [pending] shim/首启/patch/重复 launch/超时/异常退出/停止/脱敏（T1 断言重跑）
  - 方法：契约测试
  - 证据：-
- F1-V2 [pending] 单一实现+行为与 W1c 基线一致
  - 方法：smoke
  - 证据：-

## 涉及模块

- M1 [modify] innate-dogic/services/harness-runtime/src/index.ts — 收纳共享
- M2 [modify] innate-dogic/apps/desktop/src/main/harness.ts — 删除私有实现

## Spec 关联

- S1 [none] docs/susu/plan/phases/R1-harness.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。

## 来源原文

### 本地任务

需求来自 plan 对应卡；全文快照见 docs/sprints/r1/README.md 来源原文节，此处不重复。
