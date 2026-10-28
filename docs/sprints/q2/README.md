---
schemaVersion: 1.0.0
id: sprint-q2
title: Q2：给人看的项目看板
createdAt: 2026-10-28T10:55:55.265799Z
updatedAt: 2026-10-28T11:01:46.919420Z
status: analyzed
repository: 
sourceKind: file
sourcePath: docs/susu/plan/phases/Q2-canvas.md
issueNumber: 
issueUrl: 
issueState: 
issueTitle: 
issueUpdatedAt: 
---

## 任务上下文

### 问题

快照的进度无人可读视图；看板必须给人看（草稿≠正式、HTML≠数据源、不当 Agent 工作面）。

### 目标

按 plan Q2 卡：只读 SnapshotStore → 总览/任务依赖/模块审计四视图（React，@innate/ui）→ 草稿隔离 → Surface 恢复与安全引用 → 端到端（HTML 生成器缺失不影响 React 视图）。

### 范围

- - 新 plugins/project-canvas 包（main store+renderer 视图）
- - 消费已审计快照，不复制事实源

### 非目标

- 看板只读（状态只经证据或人确认改变）
- 不把 canvas HTML 当数据源

### 依赖


### 假设

- W0–W1b 交付的门禁/测试基建/smoke 可用

### 未决问题


## 全局上下文

### 摘要

innate-desktop 唯一前向仓；plan（docs/susu/plan/）为执行源；本 Sprint 为 Q2 人侧项目看板 的拆解与实施单元。

### 来源

- docs/susu/plan/phases/Q2-canvas.md
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

- T1 task-local-q2-1-projectsnapshotstore.md — Q2.1 只读 ProjectSnapshotStore
- T2 task-local-q2-2-surface.md — Q2.2 项目总览 Surface
- T3 task-local-q2-3.md — Q2.3 任务与依赖视图
- T4 task-local-q2-4.md — Q2.4 模块与审计视图
- T5 task-local-q2-5.md — Q2.5 草稿与正式状态隔离
- T6 task-local-q2-6-surface.md — Q2.6 项目 Surface 与安全引用恢复
- T7 task-local-q2-7.md — Q2.7 人侧看板端到端验收

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/Q2-canvas.md — Sprint 级验收定义

## 交付记录

- 2026-10-28 拆解为计划态（analyzed 前置），未实施任何子任务。
- 拆解完成（计划态）；实施按门禁：待 Q1)

## 来源原文

### 本地文件：docs/susu/plan/phases/Q2-canvas.md

> （未读取）

### Issue

> （未同步）
