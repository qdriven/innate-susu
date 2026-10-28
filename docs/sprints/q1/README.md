---
schemaVersion: 1.0.0
id: sprint-q1
title: Q1：一句话生成经审计的本地项目快照
createdAt: 2026-10-28T10:55:43.053264Z
updatedAt: 2026-10-28T11:01:45.681704Z
status: analyzed
repository: 
sourceKind: file
sourcePath: docs/susu/plan/phases/Q1-plan.md
issueNumber: 
issueUrl: 
issueState: 
issueTitle: 
issueUpdatedAt: 
---

## 任务上下文

### 问题

用户一句话无法变成可执行计划；规划模型只能经 magpie 网关（Agent Provider 层交 magpie，04 §6.1）；Agent 输出必须过完整 Schema+语义 audit+人工确认才落盘。

### 目标

按 plan Q1 卡：编号映射 → 完整 JSON Schema 运行时校验 → 受限规划适配器（只返回 JSON，超时/取消/requestId）→ 语义 audit+安全路径 → 预览+人工确认 → 原子保存 → 真实+负路径验收。

### 范围

- - innate-project-canvas schema/validate 强化
- - 新 planning 适配器（经网关，输入不含文件内容/密钥）
- - desktop 预览确认 UI 与原子落盘

### 非目标

- 不做 GitHub 任务系统
- 不让模型直接写 docs
- 不自动执行任务（Q3）

### 依赖


### 假设

- W0–W1b 交付的门禁/测试基建/smoke 可用

### 未决问题


## 全局上下文

### 摘要

innate-desktop 唯一前向仓；plan（docs/susu/plan/）为执行源；本 Sprint 为 Q1 一句话生成经审计的本地项目快照 的拆解与实施单元。

### 来源

- docs/susu/plan/phases/Q1-plan.md
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

- T1 task-local-q1-1.md — Q1.1 固定快照输入与编号映射
- T2 task-local-q1-2-json-schema.md — Q1.2 完整 JSON Schema 运行时校验
- T3 task-local-q1-3-agent.md — Q1.3 规划 Agent 受限适配器
- T4 task-local-q1-4-audit.md — Q1.4 语义 audit 与安全路径检查
- T5 task-local-q1-5.md — Q1.5 计划预览与人工确认
- T6 task-local-q1-6.md — Q1.6 原子保存本地快照
- T7 task-local-q1-7.md — Q1.7 真实规划与负路径验收

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/Q1-plan.md — Sprint 级验收定义

## 交付记录

- 2026-10-28 拆解为计划态（analyzed 前置），未实施任何子任务。
- 拆解完成（计划态）；实施按门禁：待 W5)

## 来源原文

### 本地文件：docs/susu/plan/phases/Q1-plan.md

> （未读取）

### Issue

> （未同步）
