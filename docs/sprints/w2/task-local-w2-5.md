---
schemaVersion: 1.0.0
id: task-local-w2-5
title: W2.5 运行状态接入壳状态区
createdAt: 2026-10-28T10:55:12.992941Z
updatedAt: 2026-10-29T07:59:10.699122Z
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

网关状态不可见（5s 轮询、无区分、无 hint）。

### 目标

pill 挂 W1a titlebar 预留状态槽；区分 gateway/console（Harness 位留 R1）；事件驱动+低频 reconciling；未安装/未接线/断开/超时给下一步 hint。

### 范围

- - GatewayStatus 事件通道（进通道表）
- - titlebar 状态槽渲染

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

### F1 · 四态转换 UI 测试；断网关提示出现…

目标：四态转换 UI 测试；断网关提示出现恢复可重试
模块：M1
Spec：S1

- F1-V1 [passed] 四态转换 UI 测试；断网关提示出现恢复可重试
  - 方法：组件测试+smoke
  - 证据：组件测试全过：StatusPills.test.tsx 8 例（四态转换 not-running→starting→running→error、断网关可恢复提示出现、恢复回到 网关运行中、点击启动调 onStartGateway、simple 模式 hint 不进文案）+ status-pills.test.ts 5 例（四态文案/hint/action 映射）+ TitlebarStrip.test.tsx +2 例（事件挂状态槽 data-empty 解除、点击 pill 调 startMagpie）+ App.shell.test.tsx +1 例（onGatewayStatus 回调即发即更 pill 并触发 reconcile refresh）；事件通道 innate:gateway-status/innate:console-status 经 main ipc.ts → preload → api → App.tsx 接线；App.tsx setInterval 30_000 低频 reconcile 替代 5s 轮询；desktop 测试基线 63→79 全过（pnpm -r build/typecheck/test 全绿）
- F1-V2 [passed] 无明文 token/URL
  - 方法：输出断言
  - 证据：输出断言全过：status-pills.test.ts F1-V2 用例（pill 文案/hint 不含 http(s)://、不含 ?k=/?token=/?key= 明文、不含 sk- 前缀值）；StatusPills.test.tsx F1-V2 用例（渲染 textContent 无 URL/token 明文）；detail tooltip 经 redactLaunchSecrets 二次脱敏断言 ?k=[redacted]；事件侧 main/ipc.ts publicGatewayStatus 对 message 过 redactLaunchSecrets、url 仅 state==='running' 下发且不进 pill 文案；renderer 经 @dogic/core/redact 浏览器安全子路径引入纯函数（electron-vite/vitest 别名指向 src/redact.ts）；T4 launcher F1-V2 日志/事件无 key 与明文 ?k 断言一并保留

## 涉及模块

- M1 [modify] innate-dogic/apps/desktop/src/renderer/src/shell — 状态槽接线

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W2-runtime.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。
- T5 开工：gateway-status 事件通道 + 壳状态区 pill + 事件驱动替代 5s 轮询 + 下一步提示
- T5 完成：`innate:gateway-status`/`innate:console-status` 双通道 + 顶栏网关/控制台双 pill（四态文案 + hint + 可恢复点击启动）+ 30s reconcile；F1-V1/F1-V2 证据已记录；desktop 基线 63→79；行为矩阵 A8/§5 回写

## 来源原文

### Issue

> （未同步）

### PR

> （未同步）
