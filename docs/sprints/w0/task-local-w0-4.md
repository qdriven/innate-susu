---
schemaVersion: 1.0.0
id: task-local-w0-4
title: W0.4 按白名单迁入产品与画布模块
createdAt: 2026-10-28T08:20:09.448168Z
updatedAt: 2026-10-28T09:07:40.688244Z
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

产品与画布模块仍在 labs；需要按 W0.1 白名单整树迁入且排除项零进入、imports 零改写。

### 目标

复制白名单 7 项（innate-dogic 全树含 magpie.exe、tools、innate-project-canvas、根配置合并项）到目标仓；保留全部包名/exports；敏感文件扫描零命中；workspace 依赖可解析。

### 范围

- 目标 innate-dogic/ 与 innate-project-canvas/ 整树落位
- tools/ 落位（适配归 T4，本任务只复制）

### 非目标


### 依赖


### 假设


### 未决问题


## 全局上下文

### 摘要

Sprint w0 子任务；W0.4 卡是需求定义。

### 来源

- docs/sprints/w0/README.md
- docs/susu/plan/evidence/W0/migration-inventory.md
- docs/susu/plan/phases/W0-baseline.md

### 约束

- 白名单/排除项以 W0.1 清单为准；敏感文件零进入
- passed 必须有可核查证据

### 全局更新

- 需要：否
- 计划：无

## 设计影响

### 是否受影响

否

### 现状行为

目标仓无产品树。

### 目标行为

白名单模块原样落位。

### 决策


### 风险


### 全局影响

无

## 功能与验证点

### F1 · 白名单整树迁入

目标：计划模块全部落位且来源可追踪
模块：M1
Spec：S1

- F1-V1 [passed] pnpm -r list --depth -1 列出全部预期模块
  - 方法：目标根安装后清单与白名单对照
  - 证据：pnpm -r list 列出全部 12 模块（白名单→目标路径全表核对）
- F1-V2 [passed] 源码 diff 仅含 W0.2 修复（无其他改写）
  - 方法：逐包与 labs 源 diff
  - 证据：diff -rq 双树（排除 node_modules/构建产物）= 0 差异；源含 W0.2 修复；包名/exports/import 零改写
- F1-V3 [passed] 敏感文件扫描零命中
  - 方法：.env/console-key/DSH profile/用户快照全树扫描
  - 证据：敏感扫描 .env/console-key.json 命中 0
- F1-V4 [passed] magpie.exe 落位且 SHA256 与 W0.1 指纹一致
  - 方法：sha256sum 对照 ff061131…
  - 证据：magpie.exe SHA256 ff061131…14d 与 W0.1 指纹一致

## 涉及模块

- M1 [add] innate-dogic/ — 白名单整树
- M2 [add] innate-project-canvas/ — 白名单整树
- M3 [add] tools — 落位（适配归 T4）

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W0-baseline.md — W0.4 卡即验收定义

## 交付记录

- 2026-10-28 建档并入 Sprint w0 拆解。
- 开始白名单整树拷贝
- 整树落位

## 来源原文

### Issue

> （未同步）

### PR

> （未同步）
