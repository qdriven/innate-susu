---
schemaVersion: 1.0.0
id: task-local-w2-7
title: W2.7 全量回归与交接
createdAt: 2026-10-28T10:55:13.541334Z
updatedAt: 2026-10-29T08:50:38.382834Z
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

W2 收口需全量回归并向 R1 移交矩阵。

### 目标

总门禁+overlay+便携冒烟；模块图与 IPC 清单更新；矩阵 Harness 部分移交 R1 输入；状态板回写。

### 范围

- - 文档与投影回写
- - 证据归档

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

### F1 · W0/W1 行为不回退…

目标：W0/W1 行为不回退
模块：M1
Spec：S1

- F1-V1 [passed] W0/W1 行为不回退
  - 方法：全量门禁+smoke
  - 证据：总门禁+smoke 全过（2026-10-29）：pnpm -r build/typecheck/test 全绿（desktop 79、plugin-model-gateway 39、service 8、core 34、sdk 9、kernel 28、theme 10、workspace 5、syntax 3、project-canvas 4，基线只增不减）；pnpm verify:overlay 7/7 条目 disabled=true；pnpm smoke:desktop dev 全过（DEV-EXIT:0，12 截图入 evidence/W2/smoke/）；pnpm package:portable 组装完成（PKG-EXIT:0）；pnpm smoke:desktop --packaged 便携全过（PKGSMOKE-EXIT:0，12 截图入 evidence/W2/smoke-packaged/）；pnpm smoke:magpie 10/10（真实链路+降级链路+清理断言，smoke-magpie.json passed:true，秘密扫描 0 命中）
- F1-V2 [passed] 矩阵网关侧每项终态
  - 方法：文档检查
  - 证据：矩阵网关侧每项终态（2026-10-29）：behavior-matrix.md §1 A1–A8 全部有终态标记（A1 收敛 T2 / A2 保留参数化 / A3 双实现分工 / A4 双路径 facade / A5 收敛 T2+T3 / A6 收敛 T3 / A7 收敛 T4 / A8 收敛 T5）；§5 差异决定汇总每行挂钩 T2/T3/T4/T5/R1 测试；§2 Harness 九项差异记录+收敛方案（实施在 R1）；§3 网关侧目标链固定并补 W2.6 冒烟证据链接；R1-harness.md 前置已接 W2 移交输入（矩阵 §2+§5 + smoke:magpie 复用说明）

## 涉及模块

- M1 [modify] docs/susu/plan/README.md — 状态板回写

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W2-runtime.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。
- T6 已提交（738ad9b），开始 T7 收口回归
- T7 完成：总门禁 build/typecheck/test 全绿（基线只增不减）；overlay 7/7；桌面冒烟 dev + 便携（packaged）各 12 截图全过（证据入 evidence/W2/smoke、smoke-packaged，秘密扫描 0 命中）；模块图（02 §2.2/§3.1/§5.1）与 IPC 清单（evidence/W2/ipc-inventory.md）更新；行为矩阵 §3 补 W2.6 冒烟证据；R1-harness.md 接 W2 移交输入指针；证据归档 evidence/W2/README.md；F1-V1/F1-V2 证据已记录

## 来源原文

### Issue

> （未同步）

### PR

> （未同步）
