# Task 文件契约

## 位置、命名与输入

task 文件是 UTF-8 Markdown。单 Task 位于 `docs/sprints/task-<source>-<slug>.md`；Sprint 子 task 位于 `docs/sprints/<sprint-id>/task-<source>-<slug>.md`。GitHub 任务可使用 `task-123-<slug>.md`，本地任务使用 `task-local-<slug>.md`；文件名必须匹配 `task-*-*.md`，同项目 task id 必须唯一。

**双体系边界**：`docs/sprints/S*-*.md` 是计划流水线事实源；`task-*-*.md` 是开发执行事实源；Sprint 目录的 `README.md` 是大任务 Context 与分解索引事实源（见 `sprint-file.md`）。三者按命名与职责区分，Canvas 投影 `.task-canvas/` 永远只是派生物。

输入可以是 Issue、PR、现有 task、其他项目内需求文件或标题。现有 task 直接继续使用；其他需求文件通过 `create --from-file` 转为 task，`sourcePath` 保存原路径，`## 来源原文/### 本地文件` 保存快照。Issue 不是必填项。

## 结构

frontmatter（`---` 包围，`key: value` 单行标量）承载机器字段；正文用固定 `##`/`###` 分节承载分析。脚本是规范写入者；手工编辑后必须 `validate`。

| 分节 | 必须回答的问题 |
| --- | --- |
| frontmatter | id/标题/时间/status/branch/repository、sourceKind/sourcePath、issue·pr 元数据 |
| `## 任务上下文` | 为什么做（问题/目标/范围/非目标/依赖/假设/未决问题）？ |
| `## 全局上下文` | 处于什么全局架构与约束中？全局 Context 是否要更新？ |
| `## 设计影响` | 设计是否变化？现状、目标行为、决策、风险、全局影响？ |
| `## 功能与验证点` | 做哪些功能？每项如何独立观察与验证？ |
| `## 涉及模块` | 哪些目录/包/边界会新增、修改或删除，为什么？ |
| `## Spec 关联` | 哪些设计文档相关，是否新增/修改，更新到哪一步？ |
| `## 交付记录` | 状态流转 notes？ |
| `## 来源原文` | 本地需求文件快照，或 Issue/PR 正文快照？ |

`execution.status` 取值 `draft/analyzed/in_progress/blocked/in_review/done`。`sourceKind` 常见取值为 `local/file/issue/pr`。

## 功能与验证点约定

```markdown
### F1 · 从需求文件建立任务

目标：一个需求文件对应一个可追踪 task 文件
模块：M1
Spec：S1

- F1-V1 [pending] 不依赖 Issue 即可保留来源并创建 task
  - 方法：从 Markdown 需求文件 create，检查 sourcePath 与原文快照
  - 证据：-
```

- 功能通过 `模块：`/`Spec：` 行引用定义的 ID。
- 验证状态只用 `pending/passed/failed/not_applicable`；`passed` 必须有证据，多条证据用 `；` 分隔。
- 模块行：`- M1 [add|modify|delete|none] 路径 — 原因`。
- Spec 行：`- S1 [none|add|modify/pending|in_progress|done|not_applicable] 路径 — 相关性`。
- `review/done` 阶段 `passed` 必须有证据；`done` 要求全部验证收口、受影响 Spec 更新完成且 `status=done`。
- GitHub Issue 任务的 `done` 还要求关联 PR；纯本地任务不强制 Issue 或 PR。
- 设计受影响时必须有现状/目标行为、决策，且至少一项 `add/modify` Spec。

## 完整示例与迁移

`task.py create` 生成最小合法骨架；`create --from-file <path>` 可从首个一级标题或文件名获得标题。旧版 `tasks/*.task.json` 用 `migrate <path>` 转换，旧文件保留。

## Canvas 投影

`render` 生成单任务视图；`overview` 生成跨任务总览：

```text
.task-canvas/
├── tasks-overview.html
└── <task-id>/
    ├── canvas.json
    ├── context.html
    ├── features.html
    ├── architecture.html
    └── delivery.html
```

这些文件可重复生成，不手工维护。`blueprint.json` 只保存宿主返回的真实 Canvas/Widget/mount ID，便于幂等更新。
