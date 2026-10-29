---
schemaVersion: 1.0.0
id: sprint-w4
title: W4：主进程 PTY Terminal
createdAt: 2026-10-28T10:55:16.156381Z
updatedAt: 2026-10-28T11:01:34.281000Z
status: analyzed
repository: 
sourceKind: file
sourcePath: docs/susu/plan/phases/W4-terminal.md
issueNumber: 
issueUrl: 
issueState: 
issueTitle: 
issueUpdatedAt: 
---

## 任务上下文

### 问题

壳没有终端；Q3 的 process:execute 没有执行面。terminal 是首个高权限 Surface，也是 capability 体系与 handler registry 机制的诞生地（04 §4bis：registry 按通用机制设计，非 terminal 专属表）。

### 目标

按 plan W4 卡：PTY/打包 spike → terminal+process capability 契约（含通用 handler registry 首版）→ TerminalService → renderer Terminal Surface → root 变更语义 → process:execute 受控首片 → 安全便携回收验收。

### 范围

- - 新 plugins/terminal 包（main+renderer）
- - core/surface 必要类型与 preload 窄通道
- - capability registry 通用机制首版

### 非目标

- 不发明通用 shell IPC（唯一入口 process:execute 白名单）
- simple 模式不可见
- 不做 browser（W5）

### 依赖


### 假设

- W0–W1b 交付的门禁/测试基建/smoke 可用

### 未决问题


## 全局上下文

### 摘要

innate-desktop 唯一前向仓；plan（docs/susu/plan/）为执行源；本 Sprint 为 W4 主进程 PTY Terminal 的拆解与实施单元。

### 来源

- docs/susu/plan/phases/W4-terminal.md
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

- T1 task-local-w4-1-pty-electron.md — W4.1 验证 PTY 与 Electron 打包技术链
- T2 task-local-w4-2-terminal-process-capability.md — W4.2 terminal 与 process capability 契约
- T3 task-local-w4-3-terminalservice.md — W4.3 主进程 TerminalService
- T4 task-local-w4-4-renderer-terminal-surface.md — W4.4 renderer Terminal Surface
- T5 task-local-w4-5-root.md — W4.5 接通工作区 root 与变更语义
- T6 task-local-w4-6-process-execute.md — W4.6 受控 process execute 首片
- T7 task-local-w4-7.md — W4.7 安全便携与故障回收验收

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W4-terminal.md — Sprint 级验收定义

## 交付记录

- 2026-10-28 拆解为计划态（analyzed 前置），未实施任何子任务。
- 2026-10-29 W4.1–W4.7 全部完成（一 task 一提交）：PTY spike（spike-pty.cjs + spike.md）→ terminal/process capability 契约（handler registry 首版 + contract.md）→ TerminalService（service.md）→ renderer Terminal Surface（renderer.md）→ root 变更语义（root.md）→ 受控 process:execute（process.md）→ 安全便携与故障回收（portable.md）。门禁全绿：全量 `pnpm verify` 退出码 0，plugin-terminal 44/44，desktop 82/82；真实桌面冒烟 dev 与便携 `--packaged` 均 `[smoke] OK`（smoke-w4-7/、smoke-w4-7-portable/）。证据见 docs/susu/plan/evidence/W4/。W5 可进入开工门禁。

## 来源原文

### 本地文件：docs/susu/plan/phases/W4-terminal.md

> （未读取）

### Issue

> （未同步）
