---
schemaVersion: 1.0.0
id: task-local-w2-3-magpie-cli
title: W2.3 收口 magpie CLI 模型与接线操作
createdAt: 2026-10-28T10:55:12.446169Z
updatedAt: 2026-10-29T07:21:29.096114Z
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

模型目录/quota/wire/unwire 调用路径不统一，renderer 可达命令行参数。

### 目标

全部经类型化 gateway facade；execFile 参数数组+超时；写操作仅用户动作触发（测试 mock/隔离 HOME）。

### 范围

- - MagpieCli facade 收口
- - desktop ipc/preload 改走 facade

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

### F1 · ModelGateway 契约测试+…

目标：ModelGateway 契约测试+CLI 解析+超时/非零退出负路径
模块：M1
Spec：S1

- F1-V1 [passed] ModelGateway 契约测试+CLI 解析+超时/非零退出负路径
  - 方法：vitest
  - 证据：T3: ModelGateway 契约套件（runModelGatewayContractTests 10 例）+ CLI 解析 3 例 + 超时/非零退出 2 例 + 参数白名单守卫 2 例 + 隔离 HOME 零修改 1 例，共 18 例全过（plugin model-gateway 39 = 22 基线 + 17 新增）；pnpm -r build/typecheck/test 全绿（desktop 53 / service 8 / core 34 / sdk 9 / kernel 28 基线保持，只增不减）
- F1-V2 [passed] 真实用户配置零修改
  - 方法：隔离 HOME 断言
  - 证据：T3: wire/unwire 只写隔离临时 DSH_HOME（fake 记录 env + wired-*.txt 断言）；真实 ~/.dsh 前后目录对比断言零新增 wired-* 文件；测试基线只增不减（39=22+17）

## 涉及模块

- M1 [modify] innate-dogic/plugins/model-gateway/src/magpie-cli.ts — facade 定型
- M2 [modify] innate-dogic/apps/desktop/src/main/ipc.ts — 通道改接 facade

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W2-runtime.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。
- 实施 W2.3：收口 magpie CLI 模型与接线操作（MagpieCli facade 定型 + desktop ipc 改走 facade）

## 来源原文

### Issue

> （未同步）

### PR

> （未同步）
