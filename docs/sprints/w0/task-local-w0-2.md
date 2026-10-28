---
schemaVersion: 1.0.0
id: task-local-w0-2
title: W0.2 在源基线修复启动日志脱敏
createdAt: 2026-10-28T08:20:06.511272Z
updatedAt: 2026-10-28T09:03:00.539864Z
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

labs 的 apps/desktop/src/main/harness.ts 把 DSH stdout 原行（含 ?token= 的认证 URL）写入内存日志并落盘 userData/logs/harness.log；services/harness-runtime 的 log callback 同样记录原始输出。违反「认证 URL/token/key 不进日志」硬约束，污染会随 W0.4 拷贝进入目标仓。

### 目标

在 labs 源头加最小 redactLaunchSecrets：token/k/key 查询参数替换为 [redacted]；运行态仍持真实 URL，仅日志输出脱敏；桌面内存日志、落盘日志、service 回调走同一边界；带测试；修复后 W0.1 六门禁重新全绿并更新源基线记录。

### 范围

- labs 的 harness.ts 与 services/harness-runtime/src/index.ts 两文件加最小脱敏函数
- 新增对应 *.test.ts；不动进程启动参数与 UI

### 非目标


### 依赖


### 假设


### 未决问题


## 全局上下文

### 摘要

Sprint w0 子任务；W0.2 卡是需求定义（见 sprint README 来源原文快照）。

### 来源

- docs/sprints/w0/README.md
- docs/susu/plan/phases/W0-baseline.md
- docs/CONTEXT.md

### 约束

- 改动限于本任务范围；passed 必须有可核查证据
- token/认证 URL 不进日志、快照与证据

### 全局更新

- 需要：否
- 计划：无

## 设计影响

### 是否受影响

否

### 现状行为

启动认证 URL 原样进内存日志、落盘日志与 service 回调。

### 目标行为

同一 URL 在运行态状态中原样保留（供嵌入/认证用），一切日志路径输出 [redacted]。

### 决策


### 风险


### 全局影响

目标仓从此无该泄漏（W0.4 拷贝含修复）。

## 功能与验证点

### F1 · 统一日志脱敏边界

目标：token/k/key 查询参数在一切日志路径上被 [redacted] 替换
模块：M1
Spec：S1

- F1-V1 [passed] 脱敏单测通过（畸形 URL/正常 URL/非敏感错误仍可读）
  - 方法：vitest 新用例，夹具含 dsh ?token= 与 magpie ?k=
  - 证据：core redact.test.ts 9/9（dsh token/magpie k/key/多参数保序/双出现/无秘密原样/空值/大小写）— evidence/W0/commands.md W0.2 节
- F1-V2 [passed] labs 六门禁修复后重新全绿（83 项不减）
  - 方法：重跑 W0.1 六命令，结果更新 evidence/W0/commands.md
  - 证据：六门禁复跑全绿，实测 96/96（83+9 脱敏用例+canvas 4）；首次 6 失败为 magpie 孤儿进程环境问题，清理后全过（过程如实记录）
- F1-V3 [passed] 运行态仍持真实认证 URL（URL 捕获不回归）
  - 方法：现有 harness 就绪/URL 断言 + smoke:desktop 真机过
  - 证据：smoke 真机全过=URL 捕获/嵌入认证不回归；smoke 输出 grep 原始 token 0 处；设计说明 evidence/W0/redaction-design.md

## 涉及模块

- M1 [modify] ../innate-labs/innate-dogic/apps/desktop/src/main/harness.ts — 内存/落盘日志过脱敏边界
- M2 [modify] ../innate-labs/innate-dogic/services/harness-runtime/src/index.ts — log callback 过同一脱敏
- M3 [add] docs/susu/plan/evidence/W0/redaction-design.md — 脱敏边界设计说明（测试用例落在 M1/M2 同目录 *.test.ts）

## Spec 关联

- S1 [add/done] docs/susu/plan/evidence/W0/redaction-design.md — 脱敏边界设计说明（已交付，evidence/W0/redaction-design.md）

## 交付记录

- 2026-10-28 建档并入 Sprint w0 拆解。
- 开始实施：共享 redact 落 @dogic/core，两消费点接线
- 六门禁复绿+96实测+真机脱敏验证

## 来源原文

### Issue

> （未同步）

### PR

> （未同步）
