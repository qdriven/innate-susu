---
schemaVersion: 1.0.0
id: task-local-w2-6
title: W2.6 隔离环境网关真实链路
createdAt: 2026-10-28T10:55:13.264271Z
updatedAt: 2026-10-28T10:55:13.264271Z
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

网关链路无隔离环境的真实端到端验证。

### 目标

临时 DSH_HOME/userData/配置：magpie 起→模型列表→健康检查→直连一次最小 LLM 调用（Q1 网关前提）；wire/unwire 隔离验证并恢复；无 magpie 降级冒烟。

### 范围

- - tools 集成脚本（不入默认门禁）
- - 证据无 key/token

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

### F1 · 真实链路与降级链路分别通过…

目标：真实链路与降级链路分别通过
模块：M1
Spec：S1

- F1-V1 [pending] 真实链路与降级链路分别通过
  - 方法：脚本执行记录
  - 证据：-
- F1-V2 [pending] 临时目录清理
  - 方法：脚本断言
  - 证据：-

## 涉及模块

- M1 [add] tools/smoke-magpie.ts — 隔离链路脚本

## Spec 关联

- S1 [none] docs/susu/plan/phases/W2-runtime.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。

## 来源原文

### 本地任务

需求来自 plan 对应卡；全文快照见 docs/sprints/w2/README.md 来源原文节，此处不重复。
