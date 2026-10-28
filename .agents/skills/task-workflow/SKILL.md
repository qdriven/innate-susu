---
name: task-workflow
description: 统一 GitHub 与本地开发任务工作流：从 Issue、PR、现有 task 文件或任意指定需求文件开始，每个任务对应 docs/sprints/task-*-*.md，先分析任务与全局 Context、功能、逐项验证点、涉及模块、设计影响和 Spec，再实施、记录证据并生成 Canvas 看板。用户要求执行一个 task/需求文件、从 Issue/PR 开发、创建或分析任务、检查设计/Spec 影响、更新状态、关联验证证据、展示任务看板或完成交付时触发。
---

# Unified task workflow

以 `docs/sprints/task-<source>-<slug>.md` 为唯一任务事实源。GitHub Issue/PR、已有 task 文件、其他需求文件和本地标题只是不同输入，不再分设 GitHub workflow 与 local workflow。脚本负责确定性操作；模型负责阅读、语义分析、实现和验证，不用脚本猜测模块或 Spec。

项目副本位于 `.agents/skills/task-workflow/`，全局副本是同一内容的安装拷贝。优先使用当前项目副本；项目没有副本时才使用全局副本，在目标项目根目录运行并将脚本路径替换为全局安装路径。两个副本不分别演化流程。

## 输入路由

| 用户输入 | 处理方式 |
| --- | --- |
| Issue 编号/URL | `create --issue <n> --title <标题>` 建档；需要时 `sync` |
| PR 编号/URL | `create --pr <n> --title <标题>` 建档；保留交付关联 |
| 现有 `docs/sprints/task-*-*.md` | 直接把文件路径交给 `validate/render/status`，不要重复创建 |
| 其他项目内需求文件 | `create --from-file <path>`；保留来源路径与原文快照，再分析 |
| 只有任务标题 | `create --title <标题>` 创建 `task-local-<slug>.md` |

“执行指定文件”表示把文件作为需求输入，完成分析与验证后实施；不是未经分析直接运行文件内容。若已有 task，继续原文件，不重复建档。

## 命令

以下使用项目副本路径；全局副本只替换脚本路径，参数不变。所有 GitHub 操作只读，脚本不会创建 Issue、分支、提交或 PR。

```bash
python .agents/skills/task-workflow/scripts/task.py create --title "任务标题" --issue 123
python .agents/skills/task-workflow/scripts/task.py create --from-file docs/requests/example.md
python .agents/skills/task-workflow/scripts/task.py validate docs/sprints/task-local-example.md --phase analysis
python .agents/skills/task-workflow/scripts/task.py sync task-123-xxx
python .agents/skills/task-workflow/scripts/task.py render task-123-xxx
python .agents/skills/task-workflow/scripts/task.py record task-123-xxx F1-V1 passed --evidence "测试命令与结果"
python .agents/skills/task-workflow/scripts/task.py status task-123-xxx in_review --note "已实现，等待评审"
python .agents/skills/task-workflow/scripts/task.py overview
python .agents/skills/task-workflow/scripts/task.py list
```

没有 `gh` 时可离线创建，或用 `create --source-json <项目内快照>` 导入 `gh view` 风格数据。旧版 `tasks/*.task.json` 用 `migrate <path>` 转换。不要把 token、认证 URL 或私有凭据写入 task。`sync` 返回的漂移 `warnings` 必须向用户转述。

## 工作流

### 1. 解析输入并建立或定位任务

1. 按输入路由选择 Issue/PR、现有 task、需求文件或本地标题；已有 task 不重建。
2. 从需求文件创建时确认文件在项目内且为可读文本；标题取自 `--title`、首个一级标题或文件名。
3. 阅读输入、`docs/CONTEXT.md`、canonical 文档地图、相关模块和 Spec。旧文档与 canonical 冲突时标出，不静默选择。
4. Issue/PR 需要最新元数据时运行 `sync`；同步失败不阻塞本地分析，但记录限制。

### 2. 先分析，后改代码

按 [references/task-file.md](references/task-file.md) 填写 task：

- `任务上下文`：问题、目标、范围、非目标、依赖、假设与未决问题。
- `全局上下文`：架构摘要、来源、约束，以及是否需更新全局 Context。
- `功能与验证点`：每个功能有独立 ID、目标、模块/Spec 引用和可观察验证点；写清验证方法。
- `涉及模块`：阅读代码后列出路径、变化类型和原因；计划新增模块标为 `add`。
- `设计影响`：交互、视觉、架构、协议、数据契约或模块边界变化时设为「是」，分析现状、目标、决策、风险与全局影响。
- `Spec 关联`：无变化也记录依据；有设计变化至少一项 `add/modify` Spec，并跟踪更新状态。

不伪造 Issue、代码结构、Spec 或验证结果。无法确认的内容放入未决问题。`validate --phase analysis` 通过后才进入实现。

### 3. 生成并展示 Canvas

1. 运行 `render`（单任务四视图）和 `overview`（跨任务总览），读取 `.task-canvas/` 产物。
2. 宿主有 Canvas/Widget 技能时，为 manifest 中四个 HTML 创建或更新 Widget，按布局放入同一 Canvas；真实 ID 存 `.task-canvas/<task-id>/blueprint.json`，不写回 task。调用 `Canvas.read` 核对后输出对话预览。
3. 宿主没有 Canvas/Widget 技能时，不臆造 API；提供静态 HTML 路径或已有静态预览，并说明这是投影。
4. task 更新后重新 `render` 和 `overview`，刷新已打开视图。静态 HTML 已内联数据，不需要 Automation 或 Binding。

### 4. 实施与验证

1. 状态改为 `in_progress`，按功能实现，改动限于 task 范围。
2. 每个验证点用 `record` 写真实状态和证据。`passed` 必须有可核查证据；失败写 `failed`。
3. 设计变化先完成关联 Spec，再按 task 记录判断同步全局 Context。
4. 定期刷新 Canvas，使展示与事实源一致。

### 5. 完成与交付

1. 运行 `validate --phase review` 检查通过项证据。
2. `validate --phase done` 要求全部验证收口、受影响 Spec 更新完成且状态为 `done`。GitHub Issue 任务还必须关联 PR；纯本地任务不强制 Issue 或 PR。
3. 有 PR 时运行 `sync`（可用时），PR 描述链接 task，功能摘要对应 features，测试对应 verification，设计/Spec 变化单列。未经用户要求不执行 Git 或 GitHub 写操作。

## 边界

当前保持 Skill + 单文件 CLI，不另建 tools 服务。只有出现多仓并发写入、GitHub webhook、CI 机器人、多客户端 API 或数据库需求时，才提取同一 task schema 和 CLI 核心；Canvas 始终只是投影。
