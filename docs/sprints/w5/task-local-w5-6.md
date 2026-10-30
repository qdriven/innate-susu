---
schemaVersion: 1.0.0
id: task-local-w5-6
title: W5.6 安全浏览布局状态
createdAt: 2026-10-28T10:55:20.595236Z
updatedAt: 2026-10-28T10:55:20.595236Z
status: done
branch: qdriven/implement-w4-w5
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

浏览布局无恢复且敏感 URL 风险。

### 目标

快照持久化恢复；敏感 URL 不入快照；版本不兼容回退。

### 范围

- - snapshot 接入

### 非目标

- 仅限本任务范围；不越段实施

### 依赖

前置段全绿（见 Sprint README）；T 序串行。

### 假设

- 门禁与测试基建（W0/W1b 已建）可用

### 未决问题

见 Sprint README。

## 全局上下文

### 摘要

Sprint W5（docs/sprints/w5/README.md）子任务；需求细节见其来源原文快照与 plan 对应卡。

### 来源

- docs/sprints/w5/README.md
- docs/susu/plan/phases/W5-browser.md
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

按 plan 卡与 04 文档约束执行。

### 风险

行为回退风险由门禁+smoke 兜底。

### 全局影响

无

## 功能与验证点

### F1 · 恢复/敏感 URL/版本/失效站/隐…

目标：恢复/敏感 URL/版本/失效站/隐私扫描
模块：M1
Spec：S1

- F1-V1 [done] 恢复/敏感 URL/版本/失效站/隐私扫描
  - 方法：测试
  - 证据：docs/susu/plan/evidence/W5/layout.md

## 涉及模块

- M1 [modify] innate-dogic/plugins/browser/src/main — 快照

## Spec 关联

- S1 [none] docs/susu/plan/phases/W5-browser.md — 验收定义来源

## 交付记录

- 2026-10-28 建档并入 Sprint 拆解（计划态，未实施）。
- 2026-10-30 W5.6 完成：安全浏览布局状态。布局策略纯模块
  `plugins/browser/src/main/layout.ts`（敏感 URL 判定：内嵌凭据/非
  http(s)/token-key-secret 等敏感 query 参数；构建/解析快照白名单过滤；
  版本不兼容/结构非法/重复 id 抛错或安全回退）+ store（saveUrl 敏感
  拒绝并删除已有记录、consume 取出即移除、clear、setActive、snapshot、
  restore；构造 load 失败丢弃坏快照）。面板 `BrowserPanel` 挂载消费
  恢复 URL 用户可见地重新导航（提示"正在恢复上次浏览的页面…"），
  会话 URL 变化后保存当前普通 URL，卸载/关闭清理布局；provider
  `createBrowserProvider(api, layout)` 注入，desktop 以 localStorage
  为后端实例化（与核心 SurfaceTabs 快照分离——核心快照不含 URL）。
  单元测试 browser 76/76（新增 15）、desktop 100/100（新增 3），
  browser/desktop typecheck 与全仓 `pnpm verify` 退出码 0。快照只含
  普通 URL 与标签 id，不保存 cookie/session/DOM/表单/下载内容/
  WebContents；敏感 URL 不入快照，恢复只重导航不复活认证状态。
  electron spike 不扩展（布局恢复为 renderer 侧逻辑，已由单元+面板
  测试完整覆盖，spike 保持 W5.5 的 34/34）。证据见
  docs/susu/plan/evidence/W5/layout.md。

## 来源原文

### 本地任务

需求来自 plan 对应卡；全文快照见 docs/sprints/w5/README.md 来源原文节，此处不重复。
