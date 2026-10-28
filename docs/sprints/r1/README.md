---
schemaVersion: 1.0.0
id: sprint-r1
title: R1：Harness 收敛与 DSH 真实集成链
createdAt: 2026-10-28T10:55:38.299804Z
updatedAt: 2026-10-28T11:01:41.741371Z
status: analyzed
repository: 
sourceKind: file
sourcePath: docs/susu/plan/phases/R1-harness.md
issueNumber: 
issueUrl: 
issueState: 
issueTitle: 
issueUpdatedAt: 
---

## 任务上下文

### 问题

desktop main/harness.ts 与 services/harness-runtime 两套 Harness 实现并存（DSH_HOME 语义/首启/停止行为有差异）；Q3 的 agent:tools 路径需要单一实现与真实闭环背书。注意：这是进程实现合一，不属于 Provider 层（04 §6.1 边界）。

### 目标

按 plan R1 卡：单测护栏（收敛前后同断言）→ 共享实现收敛（desktop 弃私有，仅留状态/IPC/Surface adapter）→ 隔离环境 boot→wire→chat 真实链路+降级 → 回归交接（Q3 前提）。

### 范围

- - services/harness-runtime 收纳共享逻辑
- - desktop main/harness.ts 删除私有实现
- - W2.1 矩阵 Harness 部分逐项终态

### 非目标

- 不引入第二运行时
- 不改 magpie 协议
- 不动 renderer（可与 Q1/Q2 并行的原因）

### 依赖


### 假设

- W0–W1b 交付的门禁/测试基建/smoke 可用

### 未决问题


## 全局上下文

### 摘要

innate-desktop 唯一前向仓；plan（docs/susu/plan/）为执行源；本 Sprint 为 R1 Harness 收敛与 DSH 真实集成链 的拆解与实施单元。

### 来源

- docs/susu/plan/phases/R1-harness.md
- docs/susu/plan/README.md
- docs/susu/plan/04-platform-gap-review.md

### 约束

- 一 task 一提交；并发协作协议见 plan README §5 第 7 条
- 测试基线只增不减；认证信息不进证据

### 全局更新

- 需要：否
- 计划：收口时回写 plan README §4 与投影

## 设计影响

### 是否受影响

否

### 现状行为

见问题节。

### 目标行为

见目标节。

### 决策


### 风险

- 实施前置门禁未满足时任务保持 blocked；行为回退由门禁+smoke 兜底

### 全局影响

无

## 分解任务

- T1 task-local-r1-1-harness.md — R1.1 harness 关键路径单测护栏
- T2 task-local-r1-2.md — R1.2 收敛共享实现并保留桌面语义
- T3 task-local-r1-3-dsh.md — R1.3 隔离环境 DSH 真实集成链
- T4 task-local-r1-4.md — R1.4 回归与交接

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/R1-harness.md — Sprint 级验收定义

## 交付记录

- 2026-10-28 拆解为计划态（analyzed 前置），未实施任何子任务。
- 拆解完成（计划态）；实施按门禁：待 W2，可与 Q1/Q2 并行)

## 来源原文

### 本地文件：docs/susu/plan/phases/R1-harness.md

> （未读取）

### Issue

> （未同步）
