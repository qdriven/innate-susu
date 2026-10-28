---
schemaVersion: 1.0.0
id: task-local-w0-3-workspace
title: W0.3 统一目标仓工程身份与 workspace
createdAt: 2026-10-28T08:20:07.948165Z
updatedAt: 2026-10-28T08:20:07.948165Z
status: draft
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

目标仓根 package.json/pnpm-workspace.yaml 仍是"仅 @innate/ui 消费"形态：无产品树 glob、无门禁脚本、无 devDeps；ui:sync 已用当前目录但 workspace 未登记将迁入的模块。

### 目标

按 plan W0.3 卡统一工程身份：根名 innate-desktop 保持；workspace 登记 apps/*、innate-dogic 四组、packages/*、plugins/*、services/*、innate-project-canvas；合并 onlyBuiltDependencies(electron)/allowBuilds(esbuild)；ui:sync 校验；包管理器与 Node engine 对齐记录。

### 范围

- 目标根 package.json / pnpm-workspace.yaml / .npmrc / README
- tsconfig 与 vitest 配置预置（供 T4 门禁使用）

### 非目标

不迁产品代码（T3）、不装依赖跑门禁（T4 验证）、不恢复旧 Web 应用。

### 依赖

T1（脱敏修复完成后的源基线才允许接线拷贝语义）。

### 假设

pnpm 12.15.0 对合并后 workspace 可直接 install。

### 未决问题

无

## 全局上下文

### 摘要

Sprint w0 子任务；W0.3 卡是需求定义。

### 来源

- docs/sprints/w0/README.md
- docs/susu/plan/phases/W0-baseline.md
- docs/CONTEXT.md

### 约束

- 合并而非覆盖；不恢复已删应用
- passed 必须有可核查证据

### 全局更新

- 需要：否
- 计划：无

## 设计影响

### 是否受影响

否

### 现状行为

目标根仅有 UI 消费配置。

### 目标行为

一套配置同时承载 UI 基座消费与产品树。

### 决策

合并 labs 脚本与 workspace 登记，保留现有身份与 UI 消费。

### 风险

glob 冲突或依赖版本不一致 → F1-V1 install 验证。

### 全局影响

无

## 功能与验证点

### F1 · 工程身份与 workspace 统一

目标：一套配置同时承载 UI 基座消费与产品树
模块：M1
Spec：S1

- F1-V1 [pending] pnpm install 成功且 lockfile 无旧 Web importer
  - 方法：目标根 pnpm install 后检查 lockfile 与 -r list
  - 证据：-
- F1-V2 [pending] ui:sync --dry-run 指向正确目标根
  - 方法：pnpm ui:sync -- --dry-run 输出核对
  - 证据：-
- F1-V3 [pending] onlyBuiltDependencies/allowBuilds 合并无丢失
  - 方法：yaml 与 package.json 逐项对照 labs+现有项
  - 证据：-

## 涉及模块

- M1 [modify] package.json — 合并 labs 脚本与 devDeps，保留现有身份与 UI 消费
- M2 [modify] pnpm-workspace.yaml — 登记 apps/innate-dogic 四组/innate-project-canvas，合并构建许可

## Spec 关联

- S1 [none] docs/susu/plan/phases/W0-baseline.md — W0.3 卡即验收定义，无设计变化

## 交付记录

- 2026-10-28 建档并入 Sprint w0 拆解。

## 来源原文

### 本地任务

需求来自 docs/susu/plan/phases/W0-baseline.md 的 W0.3 卡；全文快照见 docs/sprints/w0/README.md 来源原文节。
