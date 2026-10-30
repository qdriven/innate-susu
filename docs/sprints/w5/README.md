---
schemaVersion: 1.0.0
id: sprint-w5
title: W5：独立 Browser Surface
createdAt: 2026-10-28T10:55:18.513563Z
updatedAt: 2026-10-30T00:00:00.000Z
status: analyzed
repository: 
sourceKind: file
sourcePath: docs/susu/plan/phases/W5-browser.md
issueNumber: 
issueUrl: 
issueState: 
issueTitle: 
issueUpdatedAt: 
---

## 任务上下文

### 问题

无受控浏览器；外链目前只能系统浏览器打开；Q3 的 network:navigate 能力需要受控执行面（navigate/capture）。

### 目标

按 plan W5 卡：provider+安全策略（协议白名单/独立分区/network:navigate capability 预留）→ WebContents 生命周期 → 导航与外链 → 权限默认拒 → 受控下载 → 布局快照 → 端到端便携验收。

### 范围

- - 新 plugins/browser 包（main provider+renderer 地址栏）
- - session 权限/下载 handler
- - 快照与负路径测试

### 非目标

- 不在 DSH 内嵌浏览器
- 不做收藏/历史/多窗口（v0 不做）
- 无用户侧 devtools 入口

### 依赖


### 假设

- W0–W1b 交付的门禁/测试基建/smoke 可用

### 未决问题


## 全局上下文

### 摘要

innate-desktop 唯一前向仓；plan（docs/susu/plan/）为执行源；本 Sprint 为 W5 独立 Browser Surface 的拆解与实施单元。

### 来源

- docs/susu/plan/phases/W5-browser.md
- docs/susu/plan/README.md
- docs/susu/plan/04-platform-gap-review.md

### 约束

- 一 task 一提交；并发协作协议见 plan README §5 第 7 条
- 测试基线只增不减；认证信息不进证据

### 全局更新

- 需要：否
- 计划：收口时回写 plan README §4 与投影

## 设计影响

### 是否受影响

否

### 现状行为

见问题节。

### 目标行为

见目标节。

### 决策


### 风险

- 实施前置门禁未满足时任务保持 blocked；行为回退由门禁+smoke 兜底

### 全局影响

无

## 分解任务

- T1 task-local-w5-1-browser-provider.md — W5.1 browser provider 与安全策略
- T2 task-local-w5-2-webcontents.md — W5.2 独立 WebContents 生命周期
- T3 task-local-w5-3.md — W5.3 导航与外链规则
- T4 task-local-w5-4.md — W5.4 默认拒绝敏感权限
- T5 task-local-w5-5.md — W5.5 受控下载
- T6 task-local-w5-6.md — W5.6 安全浏览布局状态
- T7 task-local-w5-7.md — W5.7 端到端与便携验收

## Spec 关联

- S1 [none/-] docs/susu/plan/phases/W5-browser.md — Sprint 级验收定义

## 交付记录

- 2026-10-28 拆解为计划态（analyzed 前置），未实施任何子任务。
- 2026-10-29 W5.1 完成：新包 `plugins/browser`——browser 契约（协议白名单
  http/https、独立持久分区 `persist:innate-browser`、`network:navigate`
  capability 声明、非法 descriptor/capability 拒绝、凭据内嵌 URL 拒绝）
  与 `BrowserProvider` 策略层实现（会话/历史状态机、activate/deactivate
  不销毁、close 隔离、并发上限 8、dispose 统一回收）；单元测试 26/26，
  全量门禁 `pnpm verify` 退出码 0。证据见 docs/susu/plan/evidence/W5/contract.md。
- 2026-10-29 W5.2 完成：W5.1 策略层升级为持有真实视图的会话服务
  `BrowserSurfaceService`（`plugins/browser/src/main/index.ts`）：
  SurfaceHost 经 provider.createView 创建独立 WebContentsView（新工厂
  `electron-view.ts`：独立持久分区 + contextIsolation/nodeIntegration
  禁用 + sandbox、窗口新开拒绝、事件中性上报），多标签按 providerId
  匹配共存、切换只 detach 不重载、close 只回收本会话、崩溃/失败隔离、
  dispose 统一回收、禁止 executeJavaScript（类型层断言）。SurfaceHost
  新增 provider 钩子（createView/deferredUrl/onViewAttached/onViewDetached/
  onViewClosed），desktop ipc 挂 navigate/back/forward/reload/state 窄
  通道与 `innate:browser-event` 广播，renderer 挂 W1c registry。
  单元测试 browser 34/34、desktop 87/87，全量门禁 `pnpm verify` 退出码 0；
  electron 技术 spike（`plugins/browser/scripts/spike-browser.cjs`，本地
  HTTP 测试站点真实链路）12/12 通过。证据见
  docs/susu/plan/evidence/W5/webcontents.md。
- 2026-10-30 W5.3 完成：地址栏面板 + 导航守卫（renderer
  `plugins/browser/src/renderer/BrowserPanel.tsx`：地址栏、前进/后退/
  刷新/停止、加载进度、崩溃/失败重试与关闭标签；视图生命周期自管理）。
  导航守卫在视图层逐跳拦截：`will-frame-navigate`/`will-redirect` 主框架
  目标过协议白名单与凭据检查，拒绝即 `preventDefault` + 固定安全文案
  （errorCode -3）；服务层 `navigated` 事件兜底复验最终地址（errorCode
  -2），重定向最终地址优先（修复初始 URL 覆盖缺陷并加回归测试）；
  错误页文本经 `sanitizeBrowserDisplayText` 净化（剥离内嵌凭据）；
  window.open http/https 交系统浏览器。desktop ipc/preload 挂
  browserNavigate/Back/Forward/Reload/Stop/State 窄通道与面板样式；
  `plugins/terminal` 修复超时/取消终止进程退出码竞态（归一为 null）。
  单元测试 browser 43/43、desktop 95/95（含面板渲染测试 8），全量门禁
  `pnpm verify` 退出码 0；electron 技术 spike 扩展至 20/20（守卫拦截、
  合法重定向放行、window.open 交系统浏览器、凭据拒绝）。证据见
  docs/susu/plan/evidence/W5/navigation.md。
- 2026-10-30 W5.4 完成：默认拒绝敏感权限。权限策略纯模块
  `plugins/browser/src/main/permission.ts`（origin 脱敏提取：仅
  http/https、剥除凭据/路径/query；全拒决策，生成脱敏记录）+ 接线
  `electron-view.ts` 的 `attachPermissionPolicy`（只挂
  `persist:innate-browser` 分区 session 的 `setPermissionRequestHandler`/
  `setPermissionCheckHandler`，一律拒绝；事件按来源 webContents 路由，
  每分区 session 只挂一次）；服务层 `permission-denied` 事件按会话转发，
  面板呈现脱敏拒绝文案（已拒绝 <origin> 的 <type> 权限请求）。
  Harness/console 默认 session 不继承 browser handler。单元测试
  browser 49/49（新增 6）、desktop 96/96（新增 1），全量门禁
  `pnpm verify` 退出码 0；electron 技术 spike 扩展至 23/23（页面逐类
  请求权限全拒、事件携带 origin+类型、不改变页面状态）。证据见
  docs/susu/plan/evidence/W5/permissions.md。

## 来源原文

### 本地文件：docs/susu/plan/phases/W5-browser.md

> （未读取）

### Issue

> （未同步）
