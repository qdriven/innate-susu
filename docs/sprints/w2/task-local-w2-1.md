---
schemaVersion: 1.0.0
id: task-local-w2-1
title: W2.1 运行链路和行为对照矩阵
createdAt: 2026-10-28T10:53:31.956883Z
updatedAt: 2026-10-28T10:53:31.956883Z
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

launcher/core/plugin/service 四处网关职责重叠未对照；两套 Harness 差异需记录供 R1。

### 目标

产出 behavior-matrix.md：网关侧每项重叠有保留/收口/删除决定；Harness 差异只记录并定方案（实施在 R1）。

### 范围

- - evidence/W2/behavior-matrix.md 编写
- - 差异对照不实施代码

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

### F1 · 矩阵每项有决定与对应测试挂钩…

目标：矩阵每项有决定与对应测试挂钩
模块：M1
Spec：S1

- F1-V1 [pending] 矩阵每项有决定与对应测试挂钩
  - 方法：评审+文档检查
  - 证据：-
- F1-V2 [pending] 网关侧目标链定义（gateway→模型→接线→状态事件）
  - 方法：文档检查
  - 证据：-

## 涉及模块

- M1 [add] docs/susu/plan/evidence/W2 — 矩阵文档目录

## Spec 关联

- S1 [none] docs/susu/plan/phases/W2-runtime.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。

## 来源原文

### 本地任务

需求来自 plan 对应卡；全文快照见 docs/sprints/w2/README.md 来源原文节，此处不重复。
