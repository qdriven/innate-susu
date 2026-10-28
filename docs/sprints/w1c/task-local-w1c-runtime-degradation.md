---
schemaVersion: 1.0.0
id: task-local-w1c-runtime-degradation
title: W1c.3 可摘除的运行时降级
createdAt: 2026-10-28T08:43:02.613464Z
updatedAt: 2026-10-28T08:47:01.542374Z
status: blocked
branch: 
repository: 
sourceKind: file
sourcePath: docs/susu/plan/phases/W1-shell.md
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

外部 DSH 或控制台 provider 失败不能拖垮整个桌面壳。

### 目标

实现可摘除 provider 注册与明确错误/重试界面，隔离单个客人的失败。

### 范围

- provider 注册失败、DSH 缺失与控制台失败降级
- 壳和其他本地页面可用性验证

### 非目标

- 不重写 magpie/DSH 启动协议，不实现 terminal/browser。
- 不降低 W0 行为与安全断言，不把认证 URL、token、key 写入快照或证据。
- 不复制 @innate/ui primitive，不在组件中硬编码颜色、字号或像素间距。
- 不改变 W1b 已定壳组合，不新增无功能 provider 占位入口。

### 依赖

- W1b 全绿；当前四个 W1b 子 task 均为 blocked。
- T2 全绿

### 假设

- 不新增 terminal/browser 等无功能入口。

### 未决问题


## 全局上下文

### 摘要

降级只影响 apps/desktop renderer 组合与 provider dispose，runtime 服务仍由 main 管理。

### 来源

- docs/CONTEXT.md
- docs/susu/plan/README.md
- docs/susu/plan/phases/W1-shell.md

### 约束

- 前置阶段未全绿时只允许计划，不实施产品代码。
- 严格使用 @innate/ui 单入口、产品主题入口和语义 token，明暗只经 .dark。
- 保持 strict TypeScript、W0 行为基线与进程/安全边界，验证证据必须来自真实执行。

### 全局更新

- 需要：否
- 计划：无；按 W1 既定架构实施，完成时只补阶段证据与任务状态。

## 设计影响

### 是否受影响

是

### 现状行为

专用组合可能让单个运行时失败扩散为 App 白屏或停止其他 Surface。

### 目标行为

DSH 缺失显示启动/重试/提示；控制台禁用只移除自身贡献，Harness 与其他页面继续可用。

### 决策

- 错误常驻且恢复动作显式可达。
- provider dispose 只清理自身 listener/Surface。

### 风险

- 共享 dispose 或全局错误边界可能误停其他 provider。

### 全局影响

无；不超出 W1 已定义的壳组合与 Surface 边界。

## 功能与验证点

### F1 · 运行时故障隔离

目标：单个 provider 失败不破坏壳
模块：M1
Spec：S1

- F1-V1 [pending] 模拟 DSH 缺失/未启动/注册失败时壳、导航和其他页面仍可用
  - 方法：运行三类故障注入测试并断言错误与重试动作
  - 证据：-
- F1-V2 [pending] 禁用控制台只移除其标签和贡献，不停止 Harness；dispose 不影响其他 provider
  - 方法：运行 provider 隔离与 dispose 测试
  - 证据：-

## 涉及模块

- M1 [modify] apps/desktop/src/renderer/ — 实现 provider 错误页、重试与可摘除组合

## Spec 关联

- S1 [modify/pending] docs/susu/plan/phases/W1-shell.md — 对应 W1 阶段任务卡；实施完成后登记实际行为与证据。
- S2 [none/-] docs/CONTEXT.md — 全局 Context 已定义模式门控、壳 IPC 与 Surface 安全约束，本任务按既有边界实施。

## 交付记录

- 计划已完成；等待 W1b 全绿及前置子任务完成

## 来源原文

### 本地文件：docs/susu/plan/phases/W1-shell.md

> W1c：中栏多 Surface 标签 + 降级 **前置**：W1b 全绿。 **明确不做**：不改 magpie/DSH 启动协议，不加 terminal/browser。 ### W1c.1 provider 中立的 Surface 标签模型 - **改动位置**：`packages/core/src/surface.ts`、renderer `surfaces/`、surface 测试。 - **实施**： 1. 复用 SurfaceDescriptor/Registry，定义 renderer 标签状态只保存 id/kind/providerId/title/workspaceId/capabilities。 2. 定义 provider 注册接口，至少容纳 `webcontents` 与 renderer document/panel 两类实现；terminal/browser 只保留 kind，不建空实现。 3. 实现 SurfaceTabs：open/activate/deactivate/close，激活项持久化安全 id。 4. 保持 snapshot v1 可读；新增元数据必须可选，非法版本安全回退。 5. URL token、webContents、ChildProcess 不进入 renderer 标签状态。 - **验证**：多 Surface 打开/切换/关闭、activeId 恢复、重复 id、非法 descriptor、旧快照兼容单测。 - **完成标准**：标签条不感知 Harness/magpie 私有类型，生命周期语义与现有 Registry 一致。 ### W1c.2 Harness 与控制台接入统一槽 - **改动位置**：main `surface-host.ts`、`ipc.ts`、preload、renderer HarnessPage/ConsolePage。 - **实施**： 1. 增加 provider 中立的 surface show/hide/bounds/close 窄 IPC，参数为安全 descriptor、provider 句柄和 bounds。 2. main 内部将认证 URL 解析限制在对应 runtime provider；通用 renderer 不提交任意认证 URL。 3. 保留旧 Harness/console IPC 作为临时适配，逐一转到新 SurfaceTabs。 4. 切换标签只 detach；URL 未变不 reload；显式 close 才销毁 view。 5. 新路径全绿后删除重复 renderer 状态和无调用旧通道，保留 runtime 启动 API。 - **验证**：Harness 与控制台交替切换不重载（CDP 断言）；resize/maximize bounds 正确；关闭其中一个不影响另一个；伪造 providerId 被拒。 - **完成标准**：两个 WebContents 客人使用同一中栏槽，无专用重复标签逻辑，token 不进快照。 ### W1c.3 可摘除的运行时降级 - **改动位置**：renderer 组合、runtime provider 注册与错误页。 - **实施**： 1. DSH 未安装、未启动或 provider 注册失败时，壳、导航和其他本地页面仍可用。 2. 对话 Surface 显示明确启动/重试/查看提示，不白屏、不阻塞整个 App。 3. 禁用 magpie console provider 时只移除其标签和贡献，不停止 Harness。 4. 不为 terminal/browser 添加无功能入口。 - **验证**：模拟 DSH 缺失、控制台启动失败、provider dispose；壳与其余 Surface 保持可用。 - **完成标准**：任一客人失败只影响自身，错误和恢复动作显式可见。 ### W1c.4 壳与便携回归（W1 出口） - **改动位置**：tools/smoke-desktop、证据文档。 - **实施**： 1. 更新 DOM 断言覆盖三栏、标签、simple/dev 与错误降级。 2. 运行全量门禁、overlay（7/7）和开发桌面冒烟。 3. 构建便携目录，重复多 Surface 切换、resize、关闭回收。 4. 保存明暗截图和生命周期日志摘要，检查无 token。 - **验证**：W0 所有行为不回退，新生命周期断言全绿。 - **完成标准**：W1a–W1c 证据齐全，才允许 W2/W3 并行开始。

### Issue

> （未同步）

### PR

> （未同步）
