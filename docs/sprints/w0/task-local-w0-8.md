---
schemaVersion: 1.0.0
id: task-local-w0-8
title: W0.8 切换执行源并冻结基线
createdAt: 2026-10-28T08:20:13.534258Z
updatedAt: 2026-10-28T08:20:13.534258Z
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

W0 收口需要执行源状态切换、证据归档、技能核对与回退点固化，否则新会话可能仍被旧入口分流。

### 目标

plan README §4 状态板与投影 S0 回写；W0 全部证据（environment/commands/migration-inventory/behavior/便携清单）齐备；技能组（susu-overview/module-kit/task-workflow）W0 后路径与命令核对有效，labs 的 innate-dsh-playbook 迁回本仓适配；创建可回退 W0 基线工作点；labs 建议初始 commit（未决待用户确认）。

### 范围

- docs/README.md 与 docs/susu/plan/README.md §4、canvas 投影回写
- .agents/skills 技能核对与 dsh-playbook 迁回；W0 证据归档

### 非目标

不开 W1；不改产品代码。

### 依赖

T6（便携回退点就绪）。

### 假设

plan 投影 canvas 三步（audit/sync/board）可用（W0.1 已证）。

### 未决问题

labs 初始 commit 是否执行待用户确认。

## 全局上下文

### 摘要

Sprint w0 子任务；W0.8 卡是需求定义。

### 来源

- docs/sprints/w0/README.md
- docs/susu/plan/phases/W0-baseline.md
- docs/README.md

### 约束

- 投影状态以子任务 done 为准单向回写
- passed 必须有可核查证据

### 全局更新

- 需要：否
- 计划：本任务回写 plan README §4 与投影 S0（计划内回写）

## 设计影响

### 是否受影响

否

### 现状行为

plan 状态板 W0 待执行；投影 S0 全 todo。

### 目标行为

W0 完成、投影与状态板一致、W1a 唯一入口。

### 决策

投影状态以本 Sprint 子任务 done 为准逐卡回写。

### 风险

双进度源漂移 → 仅投影单向回写，不反向。

### 全局影响

无

## 功能与验证点

### F1 · 执行源切换与基线冻结

目标：W0 可收口、W1 可唯一入口
模块：M1
Spec：S1

- F1-V1 [pending] plan 投影 S0 全部置已完成且 audit 0 错
  - 方法：改投影状态字段 → canvas_audit → canvas_sync
  - 证据：-
- F1-V2 [pending] 新会话从 README 唯一定位 W1a（无 P0 分流）
  - 方法：按 docs/README 阅读顺序走一遍核对
  - 证据：-
- F1-V3 [pending] 技能核对通过 + dsh-playbook 迁回本仓
  - 方法：逐技能路径/命令验证；playbook 落位并适配头部
  - 证据：-
- F1-V4 [pending] W0 证据齐全（五类文件）且便携包保留
  - 方法：evidence/W0 目录清单核对
  - 证据：-

## 涉及模块

- M1 [modify] docs/susu/plan/README.md — §4 状态板回写（docs/README 与投影随之同步）
- M2 [add] .agents/skills/innate-dsh-playbook — 自 labs 迁回适配

## Spec 关联

- S1 [modify] docs/susu/plan/README.md — §4 状态板 W0 行回写（计划内回写）

## 交付记录

- 2026-10-28 建档并入 Sprint w0 拆解。

## 来源原文

### 本地任务

需求来自 docs/susu/plan/phases/W0-baseline.md 的 W0.8 卡；全文快照见 docs/sprints/w0/README.md 来源原文节。
