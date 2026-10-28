---
schemaVersion: 1.0.0
id: task-local-sprint-task-routing
title: 扩展 Sprint 与 Task 分流工作流
createdAt: 2026-10-28T07:28:52.293724Z
updatedAt: 2026-10-28T07:45:08.557969Z
status: in_review
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

现有 task-workflow 把每次输入都当作单任务；W1b 这类大任务缺少先分析、拆分为 Sprint 目录和多个子任务的阶段，容易过早实施或生成不必要的单任务计划。

### 目标

在同一 Skill 与 CLI 中增加 Sprint/Task 粒度分流：明确单任务直接执行；大任务默认只生成 Sprint Context、子 task 和 Canvas，只有用户明确要求执行子任务或全部完成时才进入实施。

### 范围

- 增加 Sprint 目录、README Context 契约和子 task 建档方式
- 支持递归定位嵌套 task、Sprint 校验和四视图 Canvas
- 明确单任务不生成 Sprint 文件，大任务默认停在计划完成
- 更新 Skill、任务契约和自动化回归测试

### 非目标

- 不让脚本推测语义或自动决定功能拆分
- 不另建独立 tools 服务或第二套 Skill
- 不改变现有根目录单任务的 Markdown schema
- 不自动执行 Sprint 的全部子任务

### 依赖

- 沿用现有 task Markdown 读写、验证门禁和静态 Canvas 生成器
- 保持 GitHub 只读及未经要求不执行 Git 写操作的约束

### 假设

- 用户明确说 task、单个任务或给出既有 task 文件时，可按单任务处理
- W1b 这类包含多个可独立验证子目标的大任务按 Sprint 处理

### 未决问题


## 全局上下文

### 摘要

task 文件仍是开发执行事实源；Sprint README 只是大任务 Context 与分解索引，子 task 承载各自分析、验证和交付证据。Canvas 始终是可重建投影，不替代文件。

### 来源

- docs/CONTEXT.md
- docs/README.md
- .agents/skills/task-workflow/SKILL.md
- .agents/skills/task-workflow/references/task-file.md

### 约束

- 脚本只做确定性存储、路径解析、校验和渲染，模型负责语义拆解
- 明确单任务不得额外创建 Sprint 目录或 Sprint Canvas
- 大任务未明确要求全部完成时，计划产物完成后停止
- 每个子 task 仍独立通过 analysis/review/done 门禁

### 全局更新

- 需要：否
- 计划：无；本次只改变开发工作流，不改变产品架构或协议

## 设计影响

### 是否受影响

是

### 现状行为

所有输入都映射到 docs/sprints 根目录的一个 task 文件；缺少 Sprint Context、子任务索引和嵌套任务发现。

### 目标行为

先按输入明确程度选择 Task 或 Sprint。Task 沿用原流程；Sprint 使用独立目录承载 README 和多个子 task，支持整组校验与 Canvas，并默认只完成计划。

### 决策

- 修改现有 task-workflow，不新增分解 Skill
- Sprint 目录使用 docs/sprints/<sprint-id>/，README.md 为 Sprint 唯一 Context 与索引事实源
- create --sprint 将子 task 写入目录并登记索引；task 按 id 递归唯一解析
- Sprint Canvas 复用静态 HTML 与 Blueprint 投影方式

### 风险

- 嵌套 task id 重复可能造成引用歧义，必须显式报错
- Sprint 索引与子 task 状态可能漂移，校验和渲染需重新读取子 task
- 大任务完成后误继续实施，Skill 必须设置明确停止点

### 全局影响

不改变产品全局 Context；文档地图中的 task-workflow 描述继续有效。

## 功能与验证点

### F1 · 按 Task 或 Sprint 粒度分流

目标：明确单任务直接执行，大任务默认只完成拆解计划
模块：M1
Spec：S1, S2

- F1-V1 [passed] 单任务路径不会被要求生成 Sprint 文件
  - 方法：检查 Skill 路由和单任务回归测试保持原行为
  - 证据：test_single_task_create_does_not_create_sprint_directory 通过：只生成根目录 task 文件；原 13 项单任务测试保持通过
- F1-V2 [passed] 大任务计划完成后默认停止，全部完成需显式要求
  - 方法：检查 Skill 停止点与全量执行例外规则
  - 证据：test_skill_defines_sprint_stop_and_explicit_run_all_exception 通过：默认停止与全部完成例外均已断言

### F2 · 建立 Sprint Context 与子任务目录

目标：一个 Sprint 对应一个目录、README Context 和多个独立 task 文件
模块：M2, M4
Spec：S2, S3

- F2-V1 [passed] create-sprint 能保留来源并拒绝默认覆盖
  - 方法：在临时项目创建 Sprint，检查 README、来源和重复创建错误
  - 证据：test_create_sprint_preserves_source_and_refuses_overwrite 通过：README、来源快照和重复创建拒绝均验证
- F2-V2 [passed] create --sprint 创建子 task 并原子登记 Sprint 索引
  - 方法：在临时 Sprint 创建两个子任务，检查路径、T 编号和 Markdown 回读
  - 证据：test_create_child_registers_index_and_supports_recursive_commands 通过：两个子任务登记 T1/T2；真实 CLI 冒烟创建 README、子 task 和 T1 成功

### F3 · 校验 Sprint 并兼容嵌套任务

目标：Sprint 与子 task 都有可检查的分析门禁，嵌套 task 可按唯一 id 使用现有命令
模块：M2, M5
Spec：S2, S3

- F3-V1 [passed] 缺少 Context 或子 task 分析不完整时 Sprint 校验失败
  - 方法：构造空 Sprint 和未分析子 task，检查 analysis 负路径
  - 证据：test_validate_sprint_checks_context_and_child_analysis 通过：空 Sprint 与未分析子 task 被拒绝，完整分析通过
- F3-V2 [passed] 嵌套 task 可递归解析，重复 id 会显式报错，总览包含嵌套任务
  - 方法：运行 task_path、validate、overview 单元测试
  - 证据：递归 validate、overview 与重复 id 负路径测试通过；总览包含 2 个嵌套任务

### F4 · 生成 Sprint Canvas

目标：从 Sprint README 和子 task 实时生成 Context、任务、架构与交付四视图
模块：M2, M5
Spec：S2, S3

- F4-V1 [passed] render-sprint 生成四个 HTML 和 manifest，内容经过转义
  - 方法：运行渲染测试，检查文件、布局、子任务摘要和 HTML 注入夹具
  - 证据：test_render_sprint_creates_four_views_and_escapes_html 通过：四 HTML、manifest 与 HTML 转义全部验证；20 项测试全绿

## 涉及模块

- M1 [modify] .agents/skills/task-workflow/SKILL.md — 增加粒度分流、Sprint 停止点和命令入口
- M2 [modify] .agents/skills/task-workflow/scripts/task.py — 增加 Sprint 存储、校验、嵌套解析与渲染
- M3 [modify] .agents/skills/task-workflow/references/task-file.md — 说明根目录与 Sprint 子任务契约
- M4 [add] .agents/skills/task-workflow/references/sprint-file.md — 定义 Sprint README 和索引格式
- M5 [modify] .agents/skills/task-workflow/scripts/test_task.py — 覆盖 Sprint 正路径、负路径和回归

## Spec 关联

- S1 [modify/done] .agents/skills/task-workflow/SKILL.md — 工作流路由与执行边界 Spec
- S2 [modify/done] .agents/skills/task-workflow/references/task-file.md — task 存储与嵌套目录 Spec
- S3 [add/done] .agents/skills/task-workflow/references/sprint-file.md — Sprint Context、索引与 Canvas Spec
- S4 [none/-] docs/CONTEXT.md — 产品架构和协议不变

## 交付记录

- Sprint/Task 分流、目录契约与 Canvas 影响分析通过，开始实现
- Sprint/Task 分流、目录、校验、Canvas 与 Spec 已完成；20 项测试和 CLI 冒烟通过，等待评审

## 来源原文

### Issue

> （未同步）

### PR

> （未同步）
