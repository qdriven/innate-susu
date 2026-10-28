---
schemaVersion: 1.0.0
id: sprint-w2
title: W2：magpie 运行链路收口（网关侧）
createdAt: 2026-10-28T10:53:30.522033Z
updatedAt: 2026-10-28T11:01:30.653909Z
status: analyzed
repository: 
sourceKind: file
sourcePath: docs/susu/plan/phases/W2-runtime.md
issueNumber: 
issueUrl: 
issueState: 
issueTitle: 
issueUpdatedAt: 
---

## 任务上下文

### 问题

magpie 能力分散在三处（desktop launcher 私有 serve 生命周期、plugins/model-gateway 的 MagpieCli facade、services/model-gateway 的 MagpieGateway），状态靠 5s 轮询且无 pill，控制台生命周期未接 W1c 通用 Surface 槽；两套 Harness 的差异需对照记录（实施归 R1）。

### 目标

按 plan W2 卡完成网关侧收口：行为矩阵 → sidecar 生命周期统一 → CLI/模型/接线 facade → 受管控制台 → 壳状态接入 → 隔离环境真实链路 → 回归交接；矩阵的 Harness 部分移交 R1。

### 范围

- - evidence/W2/ 行为矩阵与链路证据
- - services/model-gateway 与 desktop launcher/ipc/plugins 的收口改动
- - W1a titlebar 状态槽的网关 pill 接线

### 非目标

- 不做两套 Harness 收敛（R1）
- 不复制 per-agent 账号/Provider 体系（magpie 独占，04 §6.1）
- 不做双向设置（M5 后置）

### 依赖


### 假设

- W0–W1b 交付的门禁/测试基建/smoke 可用

### 未决问题


## 全局上下文

### 摘要

innate-desktop 唯一前向仓；plan（docs/susu/plan/）为执行源；本 Sprint 为 W2 magpie 运行链路收口（网关侧） 的拆解与实施单元。

### 来源

- docs/susu/plan/phases/W2-runtime.md
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

- T1 task-local-w2-1.md — W2.1 运行链路和行为对照矩阵
- T2 task-local-w2-2-magpie-sidecar.md — W2.2 统一 magpie sidecar 生命周期
- T3 task-local-w2-3-magpie-cli.md — W2.3 收口 magpie CLI 模型与接线操作
- T4 task-local-w2-4-magpie.md — W2.4 保留并适配受管 magpie 控制台
- T5 task-local-w2-5.md — W2.5 运行状态接入壳状态区
- T6 task-local-w2-6.md — W2.6 隔离环境网关真实链路
- T7 task-local-w2-7.md — W2.7 全量回归与交接

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W2-runtime.md — Sprint 级验收定义

## 交付记录

- 2026-10-28 拆解为计划态（analyzed 前置），未实施任何子任务。
- 拆解完成（计划态）；实施按门禁：待 W1c)

## 来源原文

### 本地文件：docs/susu/plan/phases/W2-runtime.md

> （未读取）

### Issue

> （未同步）
