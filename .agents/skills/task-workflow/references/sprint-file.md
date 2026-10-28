# Sprint 文件契约

## 位置与职责

一个需要拆解的大任务对应 `docs/sprints/<sprint-id>/`。目录内：

- `README.md`：Sprint Context、全局约束、设计影响、Spec 和子 task 索引的唯一事实源。
- `task-<source>-<slug>.md`：可独立分析、验证和交付的子 task，契约见 `task-file.md`。

Sprint 不复制子 task 的功能验证证据。GitHub Issue/PR、需求文件或标题只是输入，不决定任务粒度。

## 创建与分解

```bash
python .agents/skills/task-workflow/scripts/task.py create-sprint --id w1b --title "W1b 壳组合"
python .agents/skills/task-workflow/scripts/task.py create --sprint w1b --title "抽取壳组合"
python .agents/skills/task-workflow/scripts/task.py create --sprint w1b --title "扩展页面注册表"
```

`create-sprint` 支持 `--from-file`、`--issue`、`--source-json` 和 `--repository`，默认拒绝覆盖已有 README。`create --sprint` 要求 Sprint 已存在，创建子 task 后登记下一个 `T<n>` 索引；同项目 task id 必须唯一。

模型负责阅读代码与需求后填写语义分析和拆解，脚本不自动推测子任务。

## README 结构

frontmatter 使用单行标量：

```yaml
---
schemaVersion: 1.0.0
id: sprint-w1b
title: W1b 壳组合
createdAt: <UTC 时间>
updatedAt: <UTC 时间>
status: draft
repository:
sourceKind: local
sourcePath:
issueNumber:
issueUrl:
issueState:
issueTitle:
issueUpdatedAt:
---
```

正文固定分节：

| 分节 | 内容 |
| --- | --- |
| `## 任务上下文` | 问题、目标、范围、非目标、依赖、假设、未决问题 |
| `## 全局上下文` | 架构摘要、来源、约束、是否需更新全局 Context |
| `## 设计影响` | 是否受影响、现状、目标行为、决策、风险、全局影响 |
| `## 分解任务` | 子 task 的本地索引，不记录执行状态或证据 |
| `## Spec 关联` | Sprint 级 Spec；子 task 自身 Spec 仍在各 task 文件 |
| `## 交付记录` | Sprint 状态流转 notes |
| `## 来源原文` | 本地需求文件或 Issue 快照 |

分解任务行：

```markdown
- T1 task-local-shell-layout.md — 抽取 Sidebar 与 ContentArea
- T2 task-local-page-registry.md — 扩展页面注册表
```

索引路径只能是当前 Sprint 目录中的 Markdown 文件名。子 task 状态由各自 frontmatter 决定，Canvas 渲染时实时读取，避免索引状态漂移。

## 状态与校验

Sprint 状态沿用 `draft/analyzed/in_progress/blocked/in_review/done`：

```bash
python .agents/skills/task-workflow/scripts/task.py validate-sprint w1b --phase analysis
python .agents/skills/task-workflow/scripts/task.py sprint-status w1b analyzed --note "拆解完成，等待选择子任务"
```

- `analysis`：Sprint Context、全局 Context、设计与 Spec 完整；至少一个子 task；索引路径有效；每个子 task 通过 task analysis。
- `review/done`：对每个子 task 应用同名阶段门禁；Sprint `done` 还要求自身状态为 `done` 且受影响 Spec 更新完成。
- Sprint 默认只到 `analyzed`。选择子 task 后才执行该 task；只有明确要求全部完成时才按依赖逐个实施。

## Sprint Canvas

```bash
python .agents/skills/task-workflow/scripts/task.py render-sprint w1b
python .agents/skills/task-workflow/scripts/task.py overview
```

产物：

```text
.task-canvas/sprint-w1b/
├── canvas.json
├── context.html       # Sprint 与全局 Context、设计影响
├── tasks.html         # 子 task 实时状态与验证进度
├── architecture.html  # 聚合子 task 模块与 Sprint Spec
└── delivery.html      # Sprint 状态、来源、记录与未决问题
```

`blueprint.json` 只保存宿主真实 Canvas/Widget/mount ID。Canvas 是投影，不回写 Sprint 或 task 事实源。
