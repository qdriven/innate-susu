---
schemaVersion: 1.0.0
id: sprint-q3
title: Q3：一次执行一条任务
createdAt: 2026-10-28T10:56:02.072313Z
updatedAt: 2026-10-28T11:01:48.613888Z
status: analyzed
repository: 
sourceKind: file
sourcePath: docs/susu/plan/phases/Q3-task.md
issueNumber: 
issueUrl: 
issueState: 
issueTitle: 
issueUpdatedAt: 
---

## 任务上下文

### 问题

快照里的任务没有执行面；执行必须单飞串行、按 capability 路由、fail closed、证据回写经校验+audit。capability 路由 = handler registry 能力键的落地（04 §4bis：与 open-with/目的网关共用 registry 机制）。

### 目标

按 plan Q3 卡：task-run 最小契约（sdk 子入口）→ capability registry 与路由 → 单运行调度器（取消/孤儿恢复）→ process/DSH/browser 三类接入 → 证据回写+人工确认 → 全系统验收（无 magpie/DSH 纯终端可跑）。

### 范围

- - packages/sdk task-run 子入口
- - 执行服务/调度器与三类 adapter
- - 证据目录与回写通道

### 非目标

- 不并行多任务
- 不经 Innate 才能开 GitHub issue（只投影）
- 失败不自动跳下一条（fail closed）

### 依赖


### 假设

- W0–W1b 交付的门禁/测试基建/smoke 可用

### 未决问题


## 全局上下文

### 摘要

innate-desktop 唯一前向仓；plan（docs/susu/plan/）为执行源；本 Sprint 为 Q3 单任务串行执行与证据回写 的拆解与实施单元。

### 来源

- docs/susu/plan/phases/Q3-task.md
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

- T1 task-local-q3-1.md — Q3.1 最小任务执行契约
- T2 task-local-q3-2-capability-registry.md — Q3.2 capability registry 与执行路由
- T3 task-local-q3-3.md — Q3.3 单运行调度器
- T4 task-local-q3-4-process.md — Q3.4 接通 process 执行任务
- T5 task-local-q3-5-dsh-agent.md — Q3.5 接通可选 DSH Agent 任务
- T6 task-local-q3-6-browser.md — Q3.6 接通 browser 导航任务
- T7 task-local-q3-7.md — Q3.7 证据回写与人工确认
- T8 task-local-q3-8.md — Q3.8 三类任务与全系统验收

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/Q3-task.md — Sprint 级验收定义

## 交付记录

- 2026-10-28 拆解为计划态（analyzed 前置），未实施任何子任务。
- 拆解完成（计划态）；实施按门禁：待 Q2+R1)

## 来源原文

### 本地文件：docs/susu/plan/phases/Q3-task.md

> （未读取）

### Issue

> （未同步）
