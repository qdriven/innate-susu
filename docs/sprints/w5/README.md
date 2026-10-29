---
schemaVersion: 1.0.0
id: sprint-w5
title: W5：独立 Browser Surface
createdAt: 2026-10-28T10:55:18.513563Z
updatedAt: 2026-10-28T11:01:37.724365Z
status: analyzed
repository: 
sourceKind: file
sourcePath: docs/susu/plan/phases/W5-browser.md
issueNumber: 
issueUrl: 
issueState: 
issueTitle: 
issueUpdatedAt: 
---

## 任务上下文

### 问题

无受控浏览器；外链目前只能系统浏览器打开；Q3 的 network:navigate 能力需要受控执行面（navigate/capture）。

### 目标

按 plan W5 卡：provider+安全策略（协议白名单/独立分区/network:navigate capability 预留）→ WebContents 生命周期 → 导航与外链 → 权限默认拒 → 受控下载 → 布局快照 → 端到端便携验收。

### 范围

- - 新 plugins/browser 包（main provider+renderer 地址栏）
- - session 权限/下载 handler
- - 快照与负路径测试

### 非目标

- 不在 DSH 内嵌浏览器
- 不做收藏/历史/多窗口（v0 不做）
- 无用户侧 devtools 入口

### 依赖


### 假设

- W0–W1b 交付的门禁/测试基建/smoke 可用

### 未决问题


## 全局上下文

### 摘要

innate-desktop 唯一前向仓；plan（docs/susu/plan/）为执行源；本 Sprint 为 W5 独立 Browser Surface 的拆解与实施单元。

### 来源

- docs/susu/plan/phases/W5-browser.md
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

- T1 task-local-w5-1-browser-provider.md — W5.1 browser provider 与安全策略
- T2 task-local-w5-2-webcontents.md — W5.2 独立 WebContents 生命周期
- T3 task-local-w5-3.md — W5.3 导航与外链规则
- T4 task-local-w5-4.md — W5.4 默认拒绝敏感权限
- T5 task-local-w5-5.md — W5.5 受控下载
- T6 task-local-w5-6.md — W5.6 安全浏览布局状态
- T7 task-local-w5-7.md — W5.7 端到端与便携验收

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W5-browser.md — Sprint 级验收定义

## 交付记录

- 2026-10-28 拆解为计划态（analyzed 前置），未实施任何子任务。
- 2026-10-29 W5.1 完成：新包 `plugins/browser`——browser 契约（协议白名单
  http/https、独立持久分区 `persist:innate-browser`、`network:navigate`
  capability 声明、非法 descriptor/capability 拒绝、凭据内嵌 URL 拒绝）
  与 `BrowserProvider` 策略层实现（会话/历史状态机、activate/deactivate
  不销毁、close 隔离、并发上限 8、dispose 统一回收）；单元测试 26/26，
  全量门禁 `pnpm verify` 退出码 0。证据见 docs/susu/plan/evidence/W5/contract.md。

## 来源原文

### 本地文件：docs/susu/plan/phases/W5-browser.md

> （未读取）

### Issue

> （未同步）
