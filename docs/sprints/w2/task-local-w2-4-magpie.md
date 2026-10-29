---
schemaVersion: 1.0.0
id: task-local-w2-4-magpie
title: W2.4 保留并适配受管 magpie 控制台
createdAt: 2026-10-28T10:55:12.726286Z
updatedAt: 2026-10-29T07:40:38.087249Z
status: in_progress
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

控制台生命周期未接 W1c 通用 Surface 槽；key 管理与失败隔离未验证。

### 目标

独立回环端口+受管 key（stdout 只在 main 解析）；用 W1c 通用生命周期；启动失败只影响控制台；stop 只回收自己启动的进程。

### 范围

- - launcher 控制台段接 Surface provider
- - key 存储测试

### 非目标

- 仅限本任务范围；不越段实施

### 依赖


### 假设

- 门禁与测试基建（W0/W1b 已建）可用

### 未决问题


## 全局上下文

### 摘要

Sprint W2（docs/sprints/w2/README.md）子任务；需求细节见其来源原文快照与 plan 对应卡。

### 来源

- docs/sprints/w2/README.md
- docs/susu/plan/phases/W2-runtime.md
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


### 风险


### 全局影响

无

## 功能与验证点

### F1 · 重复 show 不重复 spawn/…

目标：重复 show 不重复 spawn/URL 不变不 reload/缺 key 报错/退出可见/关闭无孤儿
模块：M1
Spec：S1

- F1-V1 [passed] 重复 show 不重复 spawn/URL 不变不 reload/缺 key 报错/退出可见/关闭无孤儿
  - 方法：契约测试+smoke
  - 证据：T4: 契约测试 10 例全过（重复 show 不重复 spawn / URL 不变不 reload（SurfaceHost 集成：重复 show 只 loadURL 一次）/ 缺 key 报错且可重试 / 进程退出 code 3 可见 / stop 关闭无孤儿（taskkill /T /F 整树回收后进程消失、可再启动）/ 启动失败只影响控制台（console 失败后 gateway ensureRunning 仍 running）/ key 每安装稳定+损坏重生成+过短重生成+env 覆盖不写文件）；desktop 63 = 53 基线 + 10 新增；pnpm -r build/typecheck/test 全绿
- F1-V2 [passed] 日志与快照只含脱敏地址
  - 方法：断言检查
  - 证据：T4: 日志与快照只含脱敏地址——子进程 URL 行经 redactLaunchSecrets 后 ?k= 值替换为 [redacted]（日志断言 ?k= 后必为 [）；日志/状态消息不含真实 key 与 ?k= 明文；getState 不暴露 URL（认证 URL 只走 ensureReady 授权返回值）；key 仅存 userData（测试断言路径与文件唯一性）

## 涉及模块

- M1 [modify] innate-dogic/apps/desktop/src/main/launcher.ts — 控制台段适配

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W2-runtime.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。
- T4 开工：控制台生命周期适配（W1c 通用生命周期、仅停自己进程）+ key 存储测试 + 契约测试

## 来源原文

### Issue

> （未同步）

### PR

> （未同步）
