---
schemaVersion: 1.0.0
id: task-local-w0-5
title: W0.5 迁入并适配工程工具与根脚本
createdAt: 2026-10-28T08:20:10.816625Z
updatedAt: 2026-10-28T09:20:49.023193Z
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

tools 与根脚本按 labs 根写死路径（innate-dogic/sites/tools 扫描根、INNATE_WORKSPACE_ROOT 等），迁入后需适配目标根并补齐门禁命令。

### 目标

迁入并适配 smoke-desktop/verify-overlay/package-portable/check-typescript/start-all；根脚本补齐 build/typecheck/test/check:typescript/dev/dev:shell/smoke:desktop/verify:overlay/package*；check-typescript 扫描根改目标布局并容忍缺失目录；verify-overlay 内置 dsh 入口反解（W0.1 试验已验证路径）；新桌面构建纳入总门禁。

### 范围

- tools/ 五个工具的路径与扫描根适配
- 根 package.json 门禁脚本补齐；tsconfig/vitest 配置

### 非目标


### 依赖


### 假设


### 未决问题


## 全局上下文

### 摘要

Sprint w0 子任务；W0.5 卡是需求定义。

### 来源

- docs/sprints/w0/README.md
- docs/susu/plan/phases/W0-baseline.md
- docs/susu/plan/evidence/W0/workflow-trial-log.md

### 约束

- 工具不引用 labs 绝对路径；保留环境变量覆盖
- passed 必须有可核查证据

### 全局更新

- 需要：否
- 计划：无

## 设计影响

### 是否受影响

否

### 现状行为

工具绑定 labs 根路径。

### 目标行为

工具按目标根解析，保留环境变量覆盖。

### 决策


### 风险


### 全局影响

无

## 功能与验证点

### F1 · 门禁在目标根全绿

目标：一套命令验证全部已迁入模块
模块：M1
Spec：S1

- F1-V1 [passed] build+typecheck+test+check:typescript 四门禁目标根全绿
  - 方法：逐项运行记录退出码
  - 证据：desktop 根 build/typecheck/test/check:typescript 四门禁 exit 0 — evidence/W0/commands.md desktop 节
- F1-V2 [passed] 测试数不少于源基线 83
  - 方法：汇总行对照 W0.1 commands.md
  - 证据：实测 106/106（dogic 92=源基线 92 含脱敏 9 + canvas 4 + theme 10）
- F1-V3 [passed] 工具不引用 labs 绝对路径
  - 方法：grep 绝对路径检查 tools 与脚本
  - 证据：grep tools/*.ts labs 绝对路径 0 处；dsh 入口改 shim 自动反解（无参 overlay 7/7 实证）

### F2 · 画布引擎 evidence 根适配

目标：plan 投影 done 卡可登记真实证据路径
模块：M3
Spec：S1

- F2-V1 [passed] extractEvidence 接受 docs/susu/plan/evidence/ 前缀且旧前缀兼容
  - 方法：引擎单测两种前缀；投影重跑 audit 0 错
  - 证据：引擎 extractEvidence 支持 docs/susu/plan/evidence/ 前缀+多基解析；repo 引擎 audit plan 投影 0 错（快照 3ab53b37）

## 涉及模块

- M1 [modify] tools — 扫描根/入口反解/路径适配（check-typescript/verify-overlay/smoke-desktop/package-portable/start-all）
- M2 [modify] package.json — 根脚本补齐
- M3 [modify] innate-project-canvas/src/markdown.ts — extractEvidence 支持 plan 投影的 evidence 根（docs/susu/plan/evidence/），消除 done 卡证据无法登记的引擎缺陷（2026-10-28 实测：T0.1 done 报 done-evidence-missing）

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W0-baseline.md — W0.5 卡即验收定义

## 交付记录

- 2026-10-28 建档并入 Sprint w0 拆解。
- 工具适配+引擎 evidence 根修复
- 四门禁+引擎修复全绿

## 来源原文

### Issue

> （未同步）

### PR

> （未同步）
