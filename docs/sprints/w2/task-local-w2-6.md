---
schemaVersion: 1.0.0
id: task-local-w2-6
title: W2.6 隔离环境网关真实链路
createdAt: 2026-10-28T10:55:13.264271Z
updatedAt: 2026-10-29T08:30:21.335759Z
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

网关链路无隔离环境的真实端到端验证。

### 目标

临时 DSH_HOME/userData/配置：magpie 起→模型列表→健康检查→直连一次最小 LLM 调用（Q1 网关前提）；wire/unwire 隔离验证并恢复；无 magpie 降级冒烟。

### 范围

- - tools 集成脚本（不入默认门禁）
- - 证据无 key/token

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

### F1 · 真实链路与降级链路分别通过…

目标：真实链路与降级链路分别通过
模块：M1
Spec：S1

- F1-V1 [passed] 真实链路与降级链路分别通过
  - 方法：脚本执行记录
  - 证据：pnpm smoke:magpie 10/10 全过（2026-10-29）：真实链路 gateway 就绪（magpie 0.1.1883 @ 127.0.0.1:3425 复用运行中网关）→ 模型目录 35 个 → 直连最小 LLM 调用成功（xiaomi/mimo-v2.6-flash，16 token 上限；有界重试候选覆盖上游 volcengine key 失效 401 场景）→ magpie dsh wire/unwire 隔离（volcengine/ark-code-latest 写入临时 DSH_HOME config.yaml，dsh default 恢复）→ 真实 ~/.dsh 顶层快照零修改断言；降级链路：空闲端口无网关 → 健康检查/状态汇总/直连调用均显式失败可诊断不挂死；证据文件 docs/susu/plan/evidence/W2/smoke-magpie/smoke-magpie.json passed:true，秘密扫描 0 命中；门禁 build/typecheck/test 全绿
- F1-V2 [passed] 临时目录清理
  - 方法：脚本断言
  - 证据：临时目录清理断言通过：smoke 结束后临时根目录（os.tmpdir innate-w26-*）existsSync 为 false；magpie serve 仅在本脚本自行 spawn 时经 win32 taskkill /T /F 回收进程树（本次复用运行中网关，无 spawn 无残留）；证据文件仅含 port/checks/passed 脱敏字段，无 sk-/token=/key=/?k= 明文

## 涉及模块

- M1 [add] tools/smoke-magpie.ts — 隔离链路脚本

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W2-runtime.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。
- T6 开工：magpie 冒烟链路 smoke 工具（隔离 DSH_HOME + 真实 magpie 只读 + wire/unwire 隔离）
- T6 完成：tools/smoke-magpie.ts 隔离环境网关真实链路冒烟 10/10 全过（复用/自启网关 → 模型目录 → 直连最小 LLM 调用有界重试 → dsh wire/unwire 隔离 → ~/.dsh 零修改 → 降级链路显式失败 → 临时目录清理断言）；证据 docs/susu/plan/evidence/W2/smoke-magpie/smoke-magpie.json passed:true；新增根 script `smoke:magpie`；F1-V1/F1-V2 证据已记录

## 来源原文

### Issue

> （未同步）

### PR

> （未同步）
