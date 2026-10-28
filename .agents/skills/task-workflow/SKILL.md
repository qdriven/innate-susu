---
name: task-workflow
description: 统一 GitHub 与本地开发工作流：先区分单 Task 与需拆解的大任务/Sprint。明确 Task 直接分析、实施和验证；大任务先生成 Sprint Context、子 task 与 Canvas，默认只完成计划。支持 Issue、PR、需求文件、嵌套 task、设计/Spec 影响、验证证据和交付看板。用户要求开工、执行 task/需求文件、拆解 Sprint、从 Issue/PR 开发、展示任务看板或完成交付时触发。
---

# Unified task workflow

Task 以 `task-<source>-<slug>.md` 为执行事实源；Sprint 以目录内 `README.md` 为 Context 与分解索引事实源。GitHub Issue/PR、需求文件和本地标题只是输入。脚本负责确定性存储、校验和渲染；模型负责阅读、语义拆解、实现与验证。

项目副本位于 `.agents/skills/task-workflow/`；全局副本只是同一内容的安装拷贝，不分别演化。

## 1. 先判定粒度

| 输入 | 路由与停止点 |
| --- | --- |
| 明确说是 Task/单任务，或给出既有 `task-*-*.md` | 直接进入单 Task 流程；不创建 Sprint 目录、README 或 Sprint Canvas |
| Sprint、Epic、大任务，或包含多个可独立验证子目标的需求 | 先进入 Sprint 拆解；默认只生成计划文件与 Sprint Canvas，然后停止 |
| 无法判断粒度 | 先确认，未确认前不创建计划文件 |
| 明确指定 Sprint 中一个子 task | 只执行该子 task，不自动执行同 Sprint 其他任务 |
| 明确说“全部任务全部做完” | 先完成 Sprint 拆解，再按依赖逐个子 task 实施；不得跳过各自门禁 |

不要仅凭 Issue/PR 判断粒度：Issue 可以对应单 Task，也可以对应 Sprint。既有 task 不重建，既有 Sprint 继续原目录。

## 2. 输入与命令

```bash
# 单 Task
python .agents/skills/task-workflow/scripts/task.py create --title "任务标题" --issue 123
python .agents/skills/task-workflow/scripts/task.py create --from-file docs/requests/example.md
python .agents/skills/task-workflow/scripts/task.py validate docs/sprints/task-local-example.md --phase analysis
python .agents/skills/task-workflow/scripts/task.py status task-local-example in_progress --note "开始实施"

# 大任务/Sprint：只建立计划
python .agents/skills/task-workflow/scripts/task.py create-sprint --id w1b --from-file docs/requests/w1b.md
python .agents/skills/task-workflow/scripts/task.py create --sprint w1b --title "子任务一"
python .agents/skills/task-workflow/scripts/task.py validate-sprint w1b --phase analysis
python .agents/skills/task-workflow/scripts/task.py sprint-status w1b analyzed --note "拆解完成，等待选择子任务"
python .agents/skills/task-workflow/scripts/task.py render-sprint w1b

# 执行、证据与投影
python .agents/skills/task-workflow/scripts/task.py record task-local-example F1-V1 passed --evidence "测试命令与结果"
python .agents/skills/task-workflow/scripts/task.py sync task-123-xxx
python .agents/skills/task-workflow/scripts/task.py render task-123-xxx
python .agents/skills/task-workflow/scripts/task.py overview
python .agents/skills/task-workflow/scripts/task.py list
```

`create-sprint` 也支持 `--issue`、`--source-json`。没有 `gh` 时可离线建档或导入快照；同步失败不阻塞本地分析，但记录限制。所有 GitHub 操作只读，不自动创建 Issue、分支、提交或 PR。旧版 JSON 用 `migrate` 转换。

## 3. 单 Task：直接执行

1. 按输入选择 `create --issue/--pr/--from-file/--title`；阅读输入、`docs/CONTEXT.md`、canonical 文档地图、相关模块和 Spec。
2. 按 [references/task-file.md](references/task-file.md) 填写任务 Context、全局 Context、功能验证点、涉及模块、设计影响与 Spec。
3. `validate --phase analysis` 通过后改为 `in_progress` 并实施；不要额外制作 Sprint 计划。
4. 每个验证点用 `record` 写真实证据；`passed` 必须有证据，失败写 `failed`。
5. 默认不为单 Task 生成 Sprint Canvas。用户要求单 task 看板时，才运行 `render` 生成原四视图。
6. `review/done` 门禁保持原规则：验证收口、受影响 Spec 完成；Issue 任务还必须关联 PR。

## 4. Sprint：先拆解，默认停止

1. 用 `create-sprint` 建立 `docs/sprints/<sprint-id>/README.md`，保留输入来源。
2. 阅读原始需求、全局 Context、相关模块和 Spec，按 [references/sprint-file.md](references/sprint-file.md) 填写 Sprint Context、全局约束、设计影响、Spec 与未决问题。
3. 模型把大任务拆成可独立分析、验证和交付的子 task；逐个运行 `create --sprint <sprint-id>`，再按 task-file 契约完成每个子 task 的分析。脚本不猜测语义拆分。
4. 运行 `validate-sprint --phase analysis`，确认 Sprint Context 完整、索引有效且每个子 task 通过 analysis。
5. 将 Sprint 状态设为 `analyzed`，运行 `render-sprint` 和 `overview`，生成 Context、分解任务、模块 Spec、交付状态四视图。
6. 宿主有 Canvas/Widget 能力时按 manifest 创建或更新同一 Canvas，真实 ID 写入对应 `.task-canvas/<sprint-id>/blueprint.json`，并用 `Canvas.read` 核对。
7. **默认到此停止**：报告 Sprint 文件、子 task、依赖和建议首个子 task，不改为 `in_progress`，不实施任何子 task。
8. 只有用户选择子 task 或明确要求全部完成时才继续；每个子 task 独立执行单 Task 门禁，Sprint 不替代子 task 证据。

## 5. 路径与 Canvas 边界

```text
docs/sprints/
├── task-local-single.md                 # 单 Task
└── w1b/                                 # Sprint
    ├── README.md                        # Sprint Context + 分解索引
    ├── task-local-shell-layout.md
    └── task-local-page-registry.md
```

- 子 task 可按唯一 id 递归用于 `validate/status/record/render/sync`；重复 id 必须改用完整路径并先消除歧义。
- Sprint README 不复制子 task 的验证证据；Canvas 渲染时重新读取子 task 状态和模块。
- `.task-canvas/` 永远是可重建投影，不需要 Automation 或 Binding。
- 未经用户要求不执行 Git 或 GitHub 写操作；不要把 token、认证 URL 或私有凭据写入文件。

保持 Skill + 单文件 CLI，不另建 tools 服务。只有出现多仓并发写入、webhook、CI 机器人、多客户端 API 或数据库需求时，才提取同一 schema 和 CLI 核心。
