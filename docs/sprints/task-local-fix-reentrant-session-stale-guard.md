---
schemaVersion: 1.0.0
id: task-local-fix-reentrant-session-stale-guard
title: 修复会话重入提交的 stale 误报
createdAt: 2026-10-28T06:49:12.229639Z
updatedAt: 2026-10-28T06:54:52.626384Z
status: in_review
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

Skill 工具完成后触发会话内重入提交时，`SessionRunGateService.begin()` 重复检查 wire 日志长度，将宿主正常追加误判为其他客户端修改，导致 `onDidExecuteTool` 返回 `session.stale`。

### 目标

区分首次进入会话与持有运行锁期间的重入提交，消除重入误报，同时保留首次进入时的外部修改保护。

### 范围

- 在原始运行内核上复现首次进入保护及重入失败
- 最小修改 `SessionRunGateService.begin()` 的重入分支
- 增加直接针对实际 bundle 的 TypeScript 回归测试
- 备份原始 bundle、验证补丁并同步到当前 Kimi Work 安装

### 非目标

- 不修改 Canvas、Widget 的提交、校验或布局契约
- 不全局禁用 stale 检查或会话锁
- 不重写整个运行内核，不处理其他会话并发问题

### 依赖

- 当前安装的 `kernel-bundle.mjs` 与 Node.js 24 TypeScript 测试环境
- 当前进程持锁状态可通过 `sessionLocks.held(sessionId)` 判断

### 假设

- Skill 重入提交发生在当前进程已经持有同一会话运行锁期间
- 首次进入检查仍是防止其他客户端修改的必要保护，不能删除

### 未决问题


## 全局上下文

### 摘要

当前仓库不包含 Kimi Work 会话内核源码；问题位于已安装的外部 Agent runtime。仓库全局 Context 将外部 Agent 会话执行与桌面宿主分层，本修复只调整运行门禁，不改变产品模块或 Canvas 契约。

### 来源

- docs/CONTEXT.md
- docs/README.md
- docs/build-path/session-stale-guard.md

### 约束

- 保留原始 bundle 备份，只修改最小代码片段
- 首次进入的外部修改检测必须继续拒绝真实 stale
- 不记录认证信息，不执行 Git 或 GitHub 写操作

### 全局更新

- 需要：否
- 计划：产品架构与协议未变化；新增独立修复 Spec，不更新全局 CONTEXT。

## 设计影响

### 是否受影响

是

### 现状行为

首次用户提交和 Skill 等会话内重入提交都执行相同的外部修改检查，宿主日志追加可能触发误报。

### 目标行为

只有当前进程首次持有会话锁时执行 stale 检查；已持锁的重入提交直接继续。

### 决策

- 在调用 `hold` 前记录 `wasHeld`；重入时返回，首次进入时保留原有全 Agent wire 检查。

### 风险


### 全局影响

仅改变已安装 Kimi Work runtime 的重入门禁，不影响 innate-desktop 产品架构、模块依赖或 Canvas 数据协议。

## 功能与验证点

### F1 · 修复会话重入 stale 误报

目标：重入提交不再因宿主日志追加失败，首次进入保护不变。
模块：M1, M2
Spec：S1

- F1-V1 [passed] 原始 bundle 能复现重入失败，同时首次进入保护测试通过。
  - 方法：对原始 bundle 运行三项回归测试，确认前两项通过、第三项抛出 session.stale。
  - 证据：原始 bundle 测试输出 fresh accept=ok、fresh reject=ok，reentrant submission 抛出 session.stale
- F1-V2 [passed] 补丁后三项回归测试全部通过。
  - 方法：对工作区补丁 bundle 运行同一测试脚本。
  - 证据：补丁 bundle：fresh accept、fresh reject、reentrant accept 三项测试全部通过

### F2 · 验证并部署最小运行补丁

目标：补丁语法有效，安装文件与验证过的补丁一致。
模块：M1, M3
Spec：S1

- F2-V1 [passed] 补丁 bundle 通过 Node.js 语法检查。
  - 方法：运行 `node --check`。
  - 证据：node --check artifacts/session-stale-guard/kernel-bundle.patched.mjs 通过
- F2-V2 [passed] 当前安装 bundle 与工作区补丁逐字节一致，原始文件保留备份。
  - 方法：部署后运行二进制比较，并检查原始备份存在。
  - 证据：安装 bundle 与工作区补丁 cmp 一致；原始备份存在；安装路径 node --check 与三项回归测试通过

## 涉及模块

- M1 [add] artifacts/session-stale-guard — 保存原始 bundle 备份与最小补丁工作副本。
- M2 [add] tools/session-run-guard/test-session-run-guard.ts — 从实际 bundle 提取门禁类并验证首次进入与重入行为。
- M3 [modify] C:/Users/anyda/AppData/Roaming/kimi-desktop/daimon-bundle/app/daimon/dist/kimi-code-v2/kernel-bundle.mjs — 当前 Kimi Work 安装的运行门禁补丁目标。
- M4 [add] docs/build-path/session-stale-guard.md — 记录重入与首次进入的并发契约。

## Spec 关联

- S1 [add/done] docs/build-path/session-stale-guard.md — 定义 stale 检查边界、最小实现与回归验证。
- S2 [none/-] docs/CONTEXT.md — 产品架构与协议未变化，无需更新。

## 交付记录

- 已定位到 SessionRunGateService.begin，并在原始 bundle 上复现重入 stale；未关联 Issue/PR。
- 原始内核重入误报已复现，最小补丁三项回归测试通过
- 补丁已部署；当前进程需重载客户端后使用新门禁

## 来源原文

### Issue

> （未同步）

### PR

> （未同步）
