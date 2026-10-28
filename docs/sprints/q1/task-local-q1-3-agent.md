---
schemaVersion: 1.0.0
id: task-local-q1-3-agent
title: Q1.3 规划 Agent 受限适配器
createdAt: 2026-10-28T10:55:47.609876Z
updatedAt: 2026-10-28T10:55:47.609876Z
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

规划模型调用无受限适配。

### 目标

输入仅目的/workspace 引用/模块摘要/指令（无文件内容无密钥）；只返回 JSON 文本无工具；经 magpie 网关（Provider 层纪律）；提取唯一 JSON；超时/取消/requestId 幂等。

### 范围

- - planning adapter
- - 网关断线显式错误

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

Sprint Q1（docs/sprints/q1/README.md）子任务；需求细节见其来源原文快照与 plan 对应卡。

### 来源

- docs/sprints/q1/README.md
- docs/susu/plan/phases/Q1-plan.md
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

### F1 · 有效/非 JSON/多 JSON/超…

目标：有效/非 JSON/多 JSON/超时/取消/重复事件/无运行时
模块：M1
Spec：S1

- F1-V1 [pending] 有效/非 JSON/多 JSON/超时/取消/重复事件/无运行时
  - 方法：契约测试
  - 证据：-

## 涉及模块

- M1 [add] innate-dogic/plugins/light-app-host — 适配器落位（开工时按 04 §6.2 定载体）

## Spec 关联

- S1 [none] docs/susu/plan/phases/Q1-plan.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。

## 来源原文

### 本地任务

需求来自 plan 对应卡；全文快照见 docs/sprints/q1/README.md 来源原文节，此处不重复。
