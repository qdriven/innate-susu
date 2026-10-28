---
schemaVersion: 1.0.0
id: task-local-w4-3-terminalservice
title: W4.3 主进程 TerminalService
createdAt: 2026-10-28T10:55:17.110109Z
updatedAt: 2026-10-28T10:55:17.110109Z
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

终端进程底座不存在。

### 目标

TerminalService：spawn/write/resize/exit/流转发；宿主退出与面板关闭进程树回收；异常退出显式事件；cwd 绑 WorkspaceContext root。

### 范围

- - main 服务实现
- - 回收与并发上限

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

Sprint W4（docs/sprints/w4/README.md）子任务；需求细节见其来源原文快照与 plan 对应卡。

### 来源

- docs/sprints/w4/README.md
- docs/susu/plan/phases/W4-terminal.md
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

### F1 · 真命令/中文/大数据/resize/…

目标：真命令/中文/大数据/resize/退出码/重复 id/无 root/root 替换/孤儿检查
模块：M1
Spec：S1

- F1-V1 [pending] 真命令/中文/大数据/resize/退出码/重复 id/无 root/root 替换/孤儿检查
  - 方法：契约测试
  - 证据：-

## 涉及模块

- M1 [modify] innate-dogic/plugins/terminal/src/main — 服务实现

## Spec 关联

- S1 [none] docs/susu/plan/phases/W4-terminal.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。

## 来源原文

### 本地任务

需求来自 plan 对应卡；全文快照见 docs/sprints/w4/README.md 来源原文节，此处不重复。
