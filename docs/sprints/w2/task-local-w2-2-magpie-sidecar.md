---
schemaVersion: 1.0.0
id: task-local-w2-2-magpie-sidecar
title: W2.2 统一 magpie sidecar 生命周期
createdAt: 2026-10-28T10:53:33.446092Z
updatedAt: 2026-10-29T07:02:05.423449Z
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

desktop 私有 serve 生命周期与 services MagpieGateway 并存重复。

### 目标

复用 MagpieGateway ensureRunning/healthcheck/退避；已运行实例复用不重复启动；状态映射 GatewayStatus；保留直连降级但 UI 明示。

### 范围

- - services/model-gateway 注入化改造
- - desktop launcher 接线

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

### F1 · 复用/未安装/超时/恢复/退避/显式…

目标：复用/未安装/超时/恢复/退避/显式停止不重启契约测试全过
模块：M1
Spec：S1

- F1-V1 [passed] 复用/未安装/超时/恢复/退避/显式停止不重启契约测试全过
  - 方法：vitest 契约用例
  - 证据：vitest 契约测试 8/8 全过（复用不重复启动/not-installed/启动超时 recoverable/crash-once 退避恢复 starting→error→running/显式停止不重启/form desktop 无参与 serve 带参/wireDsh 隔离 DSH_HOME+模型白名单拒绝/quota 透传）；pnpm -r build+typecheck+test 全绿；测试基线只增不减（desktop 53/plugin 22/core 34/sdk 9 等不变，服务层 +8）
- F1-V2 [passed] 桌面不再有第二套等价 serve 生命周期
  - 方法：代码审查+矩阵回写
  - 证据：desktop main bundle 含 class MagpieGateway（out/main/index.js 4 处引用）；launcher.ts 私有 fire-and-forget spawn 删除、startMagpie 改经 getGateway().ensureRunning()；electron.vite 打包 @dogic/service-model-gateway 源码；行为矩阵 §1 A1/§5 已回写完成状态

## 涉及模块

- M1 [modify] innate-dogic/services/model-gateway/src/index.ts — 注入化与状态映射
- M2 [modify] innate-dogic/apps/desktop/src/main/launcher.ts — 接线统一实现

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W2-runtime.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。
- 实施 W2.2：统一 magpie sidecar 生命周期（MagpieGateway 增强 + desktop 收口 + 契约测试）

## 来源原文

### Issue

> （未同步）

### PR

> （未同步）
