---
schemaVersion: 1.0.0
id: task-local-issue-task-driver
title: 建立 GitHub Issue/PR 驱动的 task 开发闭环
createdAt: 2026-10-28T04:00:00Z
updatedAt: 2026-10-28T04:13:01.171687Z
status: in_review
branch: 
repository: qdriven/innate-susu
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

当前开发将转向 GitHub Issue/PR 驱动，但仓库缺少把每个任务的分析、设计影响、验证证据和交付状态统一起来的任务契约与展示闭环。

### 目标

用项目级 Skill 配合确定性脚本管理单个 task 文件，在编码前完成 Context、功能、验证点、模块和 Spec 分析，并投影到 Canvas。

### 范围

- 提供离线创建、可选 GitHub 同步、分析校验、状态与验证证据记录命令
- 定义单任务 JSON 契约和设计变化强制分析规则
- 生成 Context、功能验证、模块 Spec、交付状态四个 Canvas 视图
- 形成从 Issue/PR 到实现、验证和 PR 交付的 Skill 工作流

### 非目标

- 不自动创建 GitHub Issue、分支、提交或 PR
- 不实现 webhook、CI 机器人、多仓数据库或独立服务
- 不让 Canvas 替代 task 文件成为事实源

### 依赖

- GitHub 同步可选依赖 gh；离线创建与 Canvas 生成只依赖 Python 标准库
- Blueprint Canvas/Widget 用于对话和侧栏展示

### 假设

- 当前需求尚未关联真实 Issue/PR，因此先以本地任务验证完整流程
- 每份 task 的分析由阅读代码后的 Agent 填写，脚本不推测语义

### 未决问题


## 全局上下文

### 摘要

innate-desktop 是共享底座与轻应用平台 monorepo，docs/README.md 是文档入口，docs/CONTEXT.md 保留全局架构与硬约束。任务执行需要保持显式契约、真实证据和最小权限，Canvas 是 Surface/展示层而非任务事实源。

### 来源

- docs/README.md
- docs/CONTEXT.md
- .agents/skills/susu-overview/SKILL.md

### 约束

- 未经用户要求不执行 Git 写操作或 GitHub 写操作
- 认证 URL、token 和私有凭据不得进入 task 或 Canvas
- 设计变化必须同步关联 Spec，完成状态必须有真实验证证据

### 全局更新

- 需要：否
- 计划：本任务新增开发流程入口，不改产品架构与协议，因此不更新全局 CONTEXT；在 docs/README.md 增加任务工作流入口。

## 设计影响

### 是否受影响

是

### 现状行为

已有全局文档、迁移计划和项目计划快照，但单个 Issue/PR 缺少统一 task 分析文件，Canvas 也没有固定的任务分析投影。

### 目标行为

每个任务由一份 JSON 驱动，分析通过后生成四个固定 Canvas 视图；设计、验证和交付状态从同一事实源派生。

### 决策

- 采用项目级 Skill + 零依赖脚本，而非提前建设独立 tools 服务
- AI 负责语义分析，脚本负责 CRUD、交叉引用校验、证据门禁和 HTML 生成
- Canvas 使用四个静态 Widget 投影，不引入 Automation/Binding 作为首轮依赖

### 风险

- task JSON 比 Markdown 更严格，需要模板和校验降低编辑成本
- 静态 Canvas 不会自行感知 task 变化，更新后必须重新 render 并刷新 Widget

### 全局影响

只新增开发流程与文档入口，不改变桌面产品架构、模块依赖和运行协议。

## 功能与验证点

### F1 · 管理 Issue/PR 对应的 task 生命周期

目标：每个任务有独立、可重复校验且不会被同步覆盖分析的文件。
模块：M1, M2
Spec：S1

- F1-V1 [passed] 离线创建能生成 task，重复创建默认拒绝覆盖。
  - 方法：在临时项目连续运行两次 create，检查文件、退出码和原内容。
  - 证据：test_create_refuses_overwrite 通过：第二次 create 拒绝且原文件未变
- F1-V2 [passed] GitHub 同步只更新来源元数据，不覆盖人工分析。
  - 方法：检查 sync 写字段；无 gh 环境验证显式降级错误。
  - 证据：test_sync_without_gh_preserves_analysis 通过：无 gh 显式报错且分析不变；同步实现仅更新 github 元数据

### F2 · 强制覆盖五类分析与设计影响

目标：任何功能在实现前都有 Context、验证点、模块和 Spec 映射，设计变化有额外决策分析。
模块：M1, M3
Spec：S1, S2

- F2-V1 [passed] 缺少验证点、未知模块引用或设计变化无 Spec 更新时分析校验失败。
  - 方法：用单元测试构造三类无效 task 并检查错误信息。
  - 证据：缺少验证点、未知模块引用、设计无 Spec 更新三类单元测试均通过
- F2-V2 [passed] 当前真实 task 通过 analysis 阶段校验。
  - 方法：运行 validate local-issue-task-driver --phase analysis 并检查 ok=true。
  - 证据：validate --phase analysis 返回 ok=true、errors=[]

### F3 · 把每个分析维度投影到 Canvas

目标：从同一 task 生成四个独立视图，并能在对话中打开实际 Canvas。
模块：M1, M4
Spec：S1

- F3-V1 [passed] render 生成 manifest 和四个完整 HTML，输入文本经过转义。
  - 方法：运行脚本和单元测试，检查文件数量、布局以及 HTML 注入夹具。
  - 证据：render 返回 widgets=4；HTML 转义单元测试通过
- F3-V2 [passed] Canvas 包含四个对应 Widget，布局与 manifest 一致。
  - 方法：创建并读取 Blueprint Canvas，核对 mountId、widgetId 和 layout。
  - 证据：Canvas.read 返回 4 个 placement，widgetId 与 6x13 布局均匹配 manifest

### F4 · 记录验证证据并约束 PR 完成状态

目标：完成状态可追溯到验证证据、Spec 更新和真实 PR，而非文字声明。
模块：M1, M3
Spec：S1

- F4-V1 [passed] passed 无证据会被拒绝，done 阶段会拦截未完成验证和缺失 PR。
  - 方法：运行 record 负路径及 done 校验单元测试。
  - 证据：record 无证据负路径及 done 缺 PR 门禁单元测试通过

## 涉及模块

- M1 [add] .agents/skills/task-workflow/scripts/task.py — 提供 task 创建、同步、校验、状态记录和 Canvas 投影的确定性 CLI。
- M2 [modify] tasks — 保存每个 Issue/PR 或本地任务的唯一事实源文件。
- M3 [add] .agents/skills/task-workflow — 承载开发工作流、任务契约和可复用模板。
- M4 [add] .task-canvas — 保存可由 task 重复生成的 Canvas manifest 与静态 Widget HTML。

## Spec 关联

- S1 [add/done] .agents/skills/task-workflow/references/task-file.md — 定义 task、验证点、模块、Spec 与 Canvas 投影契约。
- S2 [modify/done] docs/README.md — 文档地图需要增加 Issue/PR 驱动开发流程入口，保持新会话可发现。
- S3 [none/-] docs/CONTEXT.md — 提供全局架构、安全与协议约束；本任务不改变这些产品事实。

## 交付记录

- 以当前用户需求建立本地任务；未关联或伪造 GitHub Issue/PR。
- 实现、6 项单元测试和四视图 Canvas 已验证；未关联 PR，不进入 done。

## 来源原文

### Issue

> （未同步）

### PR

> （未同步）
