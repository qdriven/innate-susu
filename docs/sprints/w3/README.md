---
schemaVersion: 1.0.0
id: sprint-w3
title: W3：只读工作区与共享项目上下文
createdAt: 2026-10-28T10:55:13.796371Z
updatedAt: 2026-10-28T11:01:31.481462Z
status: analyzed
repository: 
sourceKind: file
sourcePath: docs/susu/plan/phases/W3-workspace.md
issueNumber: 
issueUrl: 
issueState: 
issueTitle: 
issueUpdatedAt: 
---

## 任务上下文

### 问题

工作区是 dev 模式下的一页，文件树/Git 面板耦合在页面内；root 不是全局单源（W4 终端 cwd、Q3 任务执行都需共享）；预览主题未消费宿主 .dark 语义 token。

### 目标

按 plan W3 卡：安全契约测试固定 → WorkspaceContext+rootChanged 窄 IPC → 右栏 Panel 化 → 文件/diff 进中栏 document 标签 → 主题适配 → 快照版本化 → 端到端验收。

### 范围

- - plugins/workspace 的 renderer 重组与右栏/中栏挂载
- - desktop main/preload 的 root 单源契约
- - 快照版本化与负路径

### 非目标

- 不开写入/commit（Q3 capabilities 审批后再议）
- 不改 magpie/Harness（与 W2 并行互不触碰）

### 依赖


### 假设

- W0–W1b 交付的门禁/测试基建/smoke 可用

### 未决问题


## 全局上下文

### 摘要

innate-desktop 唯一前向仓；plan（docs/susu/plan/）为执行源；本 Sprint 为 W3 只读工作区与共享项目上下文 的拆解与实施单元。

### 来源

- docs/susu/plan/phases/W3-workspace.md
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

- T1 task-local-w3-1-workspaceservice.md — W3.1 固定 WorkspaceService 安全与行为契约
- T2 task-local-w3-2-workspacecontext-ipc.md — W3.2 WorkspaceContext 与窄 IPC
- T3 task-local-w3-3-git-panel.md — W3.3 文件树与 Git 拆为右栏 Panel
- T4 task-local-w3-4-diff.md — W3.4 文件与 diff 接入中栏文档标签
- T5 task-local-w3-5-markdown.md — W3.5 Markdown 高亮与主题适配
- T6 task-local-w3-6-root.md — W3.6 root 展开状态与文档快照
- T7 task-local-w3-7.md — W3.7 只读工作区端到端验收

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W3-workspace.md — Sprint 级验收定义

## 交付记录

- 2026-10-28 拆解为计划态（analyzed 前置），未实施任何子任务。
- 拆解完成（计划态）；实施按门禁：待 W1c（可与 W2 并行）)

## 来源原文

### 本地文件：docs/susu/plan/phases/W3-workspace.md

> （未读取）

### Issue

> （未同步）
