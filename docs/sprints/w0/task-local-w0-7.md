---
schemaVersion: 1.0.0
id: task-local-w0-7
title: W0.7 验证便携目录与资源完整性
createdAt: 2026-10-28T08:20:12.862003Z
updatedAt: 2026-10-28T08:20:12.862003Z
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

便携产物是 W0 的回退点；未验证前 W0 没有可回滚的运行基线。

### 目标

构建目录型便携包；renderer/main/preload、simple patch、magpie.exe 位置核对；从便携目录跑真实 Electron 冒烟；关闭后无孤儿进程；包内无开发仓绝对路径/用户配置/认证信息。

### 范围

- electron-builder 配置与 package scripts 仅修路径缺漏
- tools/package-portable 便携组装路径适配

### 非目标

不做 NSIS 安装器（后置）。

### 依赖

T5（行为已恢复）。

### 假设

AV 锁定场景可用 package:portable 绕行（labs 经验）。

### 未决问题

无

## 全局上下文

### 摘要

Sprint w0 子任务；W0.7 卡是需求定义。

### 来源

- docs/sprints/w0/README.md
- docs/susu/plan/phases/W0-baseline.md

### 约束

- 真实 Electron 冒烟，不用开发服务器代替
- passed 必须有可核查证据

### 全局更新

- 需要：否
- 计划：无

## 设计影响

### 是否受影响

否

### 现状行为

未验证便携产物。

### 目标行为

便携目录独立可跑。

### 决策

目录型便携为 W0 出口；安装器后置。

### 风险

原生二进制遗漏 → 资源清单核对。

### 全局影响

无

## 功能与验证点

### F1 · 便携目录可独立运行

目标：便携包可复制到干净目录运行且行为一致
模块：M1
Spec：S1

- F1-V1 [pending] 便携冒烟通过（真实 Electron，非开发服务器）
  - 方法：从便携目录运行 smoke，截图/断言入证据
  - 证据：-
- F1-V2 [pending] 关闭后无 Harness/console/PTY 孤儿进程
  - 方法：进程枚举对照
  - 证据：-
- F1-V3 [pending] 包内无绝对路径/用户配置/认证信息
  - 方法：全包 grep + 清单核对
  - 证据：-

## 涉及模块

- M1 [modify] innate-dogic/apps/desktop/scripts — 打包配置仅修路径与缺漏
- M2 [modify] tools/package-portable.ts — 便携组装路径适配

## Spec 关联

- S1 [none] docs/susu/plan/phases/W0-baseline.md — W0.7 卡即验收定义

## 交付记录

- 2026-10-28 建档并入 Sprint w0 拆解。

## 来源原文

### 本地任务

需求来自 docs/susu/plan/phases/W0-baseline.md 的 W0.7 卡；全文快照见 docs/sprints/w0/README.md 来源原文节。
