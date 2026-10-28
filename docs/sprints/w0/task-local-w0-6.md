---
schemaVersion: 1.0.0
id: task-local-w0-6
title: W0.6 恢复桌面开发和基线行为
createdAt: 2026-10-28T08:20:11.934396Z
updatedAt: 2026-10-28T08:20:11.934396Z
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

迁入后的桌面是否与 labs 行为一致未经真机对照；行为差异必须在本任务消除，不能留给 W1。

### 目标

隔离 userData/DSH_HOME 下逐项对照：单实例/窗口控制/simple-dev 选择；magpie 检测/模型状态/Harness 启动/控制台 Surface；工作区选根与文件/Markdown/图片/Git；overlay 7/7；Surface 切换不重载；日志脱敏仍有效。每项与 labs 记录相同/差异。

### 范围

- 隔离 userData/DSH_HOME 下的真机行为对照
- 仅路径适配必要的 desktop 配置修改；资源解析原语义

### 非目标

不改布局/协议（W1）；不用 mock 替代真实集成。

### 依赖

T4（门禁可跑）。

### 假设

本机 dsh/magpie 环境可用（W0.1 已证）。

### 未决问题

无

## 全局上下文

### 摘要

Sprint w0 子任务；W0.6 卡是需求定义。

### 来源

- docs/sprints/w0/README.md
- docs/susu/plan/phases/W0-baseline.md
- docs/susu/plan/evidence/W0/commands.md

### 约束

- 隔离 userData/DSH_HOME；不用 mock 替代
- passed 必须有可核查证据

### 全局更新

- 需要：否
- 计划：无

## 设计影响

### 是否受影响

否

### 现状行为

未对照。

### 目标行为

行为矩阵全一致。

### 决策

差异在本任务消除；消除不了即回退修复，不开 W1。

### 风险

环境差异导致假差异 → 隔离 HOME/userData 排除用户配置干扰。

### 全局影响

无

## 功能与验证点

### F1 · 行为矩阵对照恢复

目标：M0–M2 行为与源基线一致
模块：M1
Spec：S1

- F1-V1 [pending] verify:overlay 7/7 + smoke:desktop 目标根全绿
  - 方法：目标根运行，结果入证据
  - 证据：-
- F1-V2 [pending] 行为矩阵逐项一致（差异清零）
  - 方法：evidence/W0/behavior.md 矩阵逐行对照 labs
  - 证据：-
- F1-V3 [pending] 日志脱敏在真机生效
  - 方法：smoke 后检查目标 userData/logs/harness.log 无 token
  - 证据：-

## 涉及模块

- M1 [modify] innate-dogic/apps/desktop — 仅路径适配必要项

## Spec 关联

- S1 [none] docs/susu/plan/phases/W0-baseline.md — W0.6 卡即验收定义

## 交付记录

- 2026-10-28 建档并入 Sprint w0 拆解。

## 来源原文

### 本地任务

需求来自 docs/susu/plan/phases/W0-baseline.md 的 W0.6 卡；全文快照见 docs/sprints/w0/README.md 来源原文节。
