---
schemaVersion: 1.0.0
id: task-local-w5-3
title: W5.3 导航与外链规则
createdAt: 2026-10-28T10:55:19.484615Z
updatedAt: 2026-10-30T00:00:00.000Z
status: done
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

导航与外链规则未实现。

### 目标

地址栏+back/forward/reload/stop+进度；非法 URL 显式拒；window.open/外链系统浏览器；返回历史。

### 范围

- - renderer 地址栏
- - 导航守卫

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

### F1 · 普通/非法协议/重定向/window…

目标：普通/非法协议/重定向/window.open/错误页/历史
模块：M1
Spec：S1

- F1-V1 [done] 普通/非法协议/重定向/window.open/错误页/历史
  - 方法：测试
  - 证据：docs/susu/plan/evidence/W5/navigation.md（单元测试 browser 43/43、
    desktop 95/95；electron spike 20/20；全量门禁退出码 0）

## 涉及模块

- M1 [modify] innate-dogic/plugins/browser/src/renderer — 地址栏与守卫

## Spec 关联

- S1 [none] docs/susu/plan/phases/W5-browser.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。
- 2026-10-30 完成：地址栏面板（renderer `plugins/browser/src/renderer/`）
  + 导航守卫（`will-frame-navigate`/`will-redirect` 逐跳拦截 + 服务层
  最终地址复验 + 错误消息净化 + window.open 交系统浏览器）；browser
  43/43、desktop 95/95（面板渲染测试 8）、spike 20/20、门禁退出码 0。
  证据 docs/susu/plan/evidence/W5/navigation.md。

## 来源原文

### 本地任务

需求来自 plan 对应卡；全文快照见 docs/sprints/w5/README.md 来源原文节，此处不重复。
