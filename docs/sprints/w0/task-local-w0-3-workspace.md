---
schemaVersion: 1.0.0
id: task-local-w0-3-workspace
title: W0.3 统一目标仓工程身份与 workspace
createdAt: 2026-10-28T08:20:07.948165Z
updatedAt: 2026-10-28T09:07:39.193298Z
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

目标仓根 package.json/pnpm-workspace.yaml 仍是"仅 @innate/ui 消费"形态：无产品树 glob、无门禁脚本、无 devDeps；ui:sync 已用当前目录但 workspace 未登记将迁入的模块。

### 目标

按 plan W0.3 卡统一工程身份：根名 innate-desktop 保持；workspace 登记 apps/*、innate-dogic 四组、packages/*、plugins/*、services/*、innate-project-canvas；合并 onlyBuiltDependencies(electron)/allowBuilds(esbuild)；ui:sync 校验；包管理器与 Node engine 对齐记录。

### 范围

- 目标根 package.json / pnpm-workspace.yaml / .npmrc / README
- tsconfig 与 vitest 配置预置（供 T4 门禁使用）

### 非目标


### 依赖


### 假设


### 未决问题


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


### 风险


### 全局影响

无

## 功能与验证点

### F1 · 工程身份与 workspace 统一

目标：一套配置同时承载 UI 基座消费与产品树
模块：M1
Spec：S1

- F1-V1 [passed] pnpm install 成功且 lockfile 无旧 Web importer
  - 方法：目标根 pnpm install 后检查 lockfile 与 -r list
  - 证据：pnpm install 成功；12 workspace 模块解析（10 dogic+canvas+theme）；lockfile grep @susu/susu-web 0 处；electron 二进制经 install.js 兜底就位
- F1-V2 [passed] ui:sync --dry-run 指向正确目标根
  - 方法：pnpm ui:sync -- --dry-run 输出核对
  - 证据：pnpm ui:sync:dry-run 指向本仓根（@innate:registry=127.0.0.1:4873，package.json 无需改写）
- F1-V3 [passed] onlyBuiltDependencies/allowBuilds 合并无丢失
  - 方法：yaml 与 package.json 逐项对照 labs+现有项
  - 证据：allowBuilds 合并 electron+esbuild（electron-winstaller 构建脚本被 pnpm 忽略—打包期依赖，记录为已知项）；packageManager 对齐 12.15.0；vitest 双版本（theme 3.x/root 5.x）记入兼容矩阵

## 涉及模块

- M1 [modify] package.json — 合并 labs 脚本与 devDeps，保留现有身份与 UI 消费
- M2 [modify] pnpm-workspace.yaml — 登记 apps/innate-dogic 四组/innate-project-canvas，合并构建许可

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W0-baseline.md — W0.3 卡即验收定义，无设计变化

## 交付记录

- 2026-10-28 建档并入 Sprint w0 拆解。
- 配置已合并，随 T3 安装验证
- 验证齐

## 来源原文

### Issue

> （未同步）

### PR

> （未同步）
