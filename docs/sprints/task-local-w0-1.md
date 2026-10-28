---
schemaVersion: 1.0.0
id: task-local-w0-1
title: W0.1 冻结源基线并建立迁移清单
createdAt: 2026-10-28T07:11:14.171564Z
updatedAt: 2026-10-28T08:19:38.233357Z
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

`innate-desktop/docs/susu/plan/`（唯一执行源）的 W0 要求把 labs 的 M0–M2 基线整树迁入本仓，但源基线从未被冻结：没有记录两仓 commit、没有本机实测的门禁输出（历史 83 项测试数只是 2026-10-26 的文档记载）、没有机器可核对的迁移白名单与排除清单。缺这三样，W0.4 拷贝后无法判断回归来自迁移还是源本身。

### 目标

1. 冻结源基线：记录 labs 与 innate-desktop 的 commit、工作区状态、Node/pnpm 版本。 2. 实测 labs 门禁：build / typecheck / test / check:typescript / verify:overlay / smoke:desktop 六项真实输出与实测测试数（不照抄历史 83）。 3. 建立迁移清单：白名单（innate-dogic、tools、innate-project-canvas、根配置）、排除项（.git、node_modules、构建产物、references、prototypes、真实用户配置与密钥）、`bin/magpie.exe` 版本与 SHA256。

### 范围

- 只读操作 + 证据落盘 `docs/susu/plan/evidence/W0/`。
- 六门禁在 labs 原地运行，不修改任何产品代码。

### 非目标

- 不执行任何拷贝（W0.4）、不修日志脱敏（W0.2，那是源仓代码改动）。
- 不改 workspace/package 配置（W0.3）。

### 依赖


### 假设

- labs 的 node_modules 可用（历史开发机）。
- 本机已安装 dsh 与系统 Node（verify:overlay / smoke:desktop 需要）；不可用时如实记 failed 与原因。

### 未决问题

- verify:overlay 与 smoke:desktop 依赖真实 dsh/Electron 环境，当日是否可跑需实测确认。

## 全局上下文

### 摘要

plan（原 plan2，v2.1 合并版）是唯一执行源；W0 是 12 段迁移的第一段，本任务是 71 卡推进面的第一项（S0/T0.1）。迁移采取 strangler 逐段策略，"上一段全绿才开下一段"的纪律依赖本任务产出的实测基线。

### 来源

- docs/susu/plan/README.md
- docs/susu/plan/phases/W0-baseline.md
- docs/susu/plan/01-project-analysis.md

### 约束

- 只读操作，不修改 labs 任何产品代码
- 不照抄历史 83 测试数，以当日实测为准
- 认证 URL/token 不进证据文件

### 全局更新

- 需要：否
- 计划：纯记录任务，无架构变化。

## 设计影响

### 是否受影响

否

### 现状行为


### 目标行为


### 决策


### 风险


### 全局影响


## 功能与验证点

### F1 · 冻结源基线记录

目标：两仓 commit 与版本可复现
模块：M1
Spec：S1

- F1-V1 [passed] labs 与 innate-desktop 的 commit/工作区状态/Node/pnpm 版本完整落盘
  - 方法：git log/status + node --version + pnpm --version，写入 evidence/W0/environment.md
  - 证据：evidence/W0/environment.md：labs（main 零提交，工作区快照冻结）+ desktop HEAD 77305bc + Node v24.16.0/pnpm 12.15.0

### F2 · 实测 labs 门禁基线

目标：六项门禁的真实输出与实测测试数
模块：M1
Spec：S1

- F2-V1 [passed] pnpm build 通过
  - 方法：labs 根目录运行，记录退出码与输出尾部
  - 证据：pnpm build exit 0（全 workspace，sites 最后 3m12s）— evidence/W0/commands.md
- F2-V2 [passed] pnpm typecheck 通过
  - 方法：同上
  - 证据：pnpm typecheck exit 0 — evidence/W0/commands.md
- F2-V3 [passed] pnpm test 通过且记录实测测试数
  - 方法：运行并从汇总行提取 Test Files / Tests 数量
  - 证据：pnpm test 实测 83/83（12 文件：core16 kernel28 sdk9 syntax3 mg22 ws5）— evidence/W0/commands.md
- F2-V4 [passed] pnpm check:typescript 通过（TS-only 门禁）
  - 方法：运行记录退出码
  - 证据：pnpm check:typescript exit 0（TS-only）— evidence/W0/commands.md
- F2-V5 [passed] pnpm verify:overlay 通过（真实 dsh 入口校验 simple patch）
  - 方法：运行记录退出码；环境不可用则 failed 并注明原因
  - 证据：verify:overlay 7/7 disabled=true（显式传 dsh bin.js 入口重跑；首跑 exit 2 已记录）— evidence/W0/commands.md
- F2-V6 [passed] pnpm smoke:desktop 通过（真实 Electron CDP 冒烟）
  - 方法：运行记录退出码与断言输出；环境不可用则 failed 并注明原因
  - 证据：smoke:desktop 真机全过：控制台认证/simple 门控/dev 导航/工作区快照/Git diff — evidence/W0/commands.md

### F3 · 迁移清单

目标：白名单与排除项机器可核对
模块：M1
Spec：S1

- F3-V1 [passed] 白名单每个 workspace 包/目录映射到目标路径
  - 方法：evidence/W0/migration-inventory.md 列「源路径 → 目标路径」全表
  - 证据：evidence/W0/migration-inventory.md 白名单 7 项全表（源→目标）
- F3-V2 [passed] 排除项不出现在白名单
  - 方法：清单中显式列排除项并与白名单互斥核对
  - 证据：同文件排除项 7 类与白名单互斥核对
- F3-V3 [passed] bin/magpie.exe 记录大小与 SHA256
  - 方法：du + sha256sum，写入清单
  - 证据：magpie v0.1.1230 · 46,978,560B · SHA256 ff061131…14d — evidence/W0/environment.md

## 涉及模块

- M1 [add] docs/susu/plan/evidence/W0/ — W0 证据目录（environment.md / commands.md / migration-inventory.md）

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W0-baseline.md — W0.1 任务卡即本任务的需求来源与验收定义，无需修改

## 交付记录

- 2026-10-28 创建（task.py create），进入分析。
- 分析通过，开始实测 labs 门禁与产出迁移清单
- 六门禁全绿+83项实测+清单复核完成，等待人工确认后 done
- 用户确认 W0 开工，W0.1 收口：六门禁全绿+83 实测+清单复核

## 来源原文

### Issue

> （未同步）

### PR

> （未同步）
