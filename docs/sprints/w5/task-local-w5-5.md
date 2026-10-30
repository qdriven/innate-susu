---
schemaVersion: 1.0.0
id: task-local-w5-5
title: W5.5 受控下载
createdAt: 2026-10-28T10:55:20.310881Z
updatedAt: 2026-10-28T10:55:20.310881Z
status: done
branch: qdriven/implement-w4-w5
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

下载不受控。

### 目标

will-download→系统保存对话框；取消/完成/失败/重复名/恶意名路径。

### 范围

- - 下载 handler 与状态提示

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

Sprint W5（docs/sprints/w5/README.md）子任务；需求细节见其来源原文快照与 plan 对应卡。

### 来源

- docs/sprints/w5/README.md
- docs/susu/plan/phases/W5-browser.md
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

### F1 · 下载各路径测试…

目标：下载各路径测试
模块：M1
Spec：S1

- F1-V1 [done] 下载各路径测试
  - 方法：测试
  - 证据：docs/susu/plan/evidence/W5/downloads.md

## 涉及模块

- M1 [modify] innate-dogic/plugins/browser/src/main — 下载

## Spec 关联

- S1 [none] docs/susu/plan/phases/W5-browser.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。
- 2026-10-30 W5.5 完成：受控下载（系统保存对话框确认路径 +
  脱敏下载事件 + 关闭取消在途下载）。下载策略纯模块
  `plugins/browser/src/main/download.ts`（文件名净化/终态映射/进度
  归一）+ 接线 `electron-view.ts` 的 `attachDownloadPolicy`
  （will-download 一律经系统保存对话框确认路径，取消即 cancel；
  事件按来源 webContents 路由，每分区 session 只挂一次）；
  `cancelDownloads` 在 close 前取消在途下载并清理 tracker。服务层
  `download` 事件按会话转发，面板呈现完成/取消/失败/在途进度，
  desktop ipc 透传。单元测试 browser 61/61（新增 7）、desktop 97/97，
  typecheck 退出码 0；electron 技术 spike 扩展至 34/34（取消/完成/
  恶意文件名净化/关闭取消在途/失败路径不落隐式路径/事件脱敏）。
  interrupted→failed 映射由单元测试覆盖（Chromium 下载重试策略使
  网络/保存机制均无法确定性触发终态 interrupted，已记录 6 种机制
  实验结论）。证据见 docs/susu/plan/evidence/W5/downloads.md。

## 来源原文

### 本地任务

需求来自 plan 对应卡；全文快照见 docs/sprints/w5/README.md 来源原文节，此处不重复。
