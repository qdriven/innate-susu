# task-workflow：Skill 总结

## 目的

把 GitHub 与本地开发统一成可审计闭环：**每个任务一个结构化文件，分析先于编码，验证点强制证据，Canvas 投影展示**。Issue/PR 不再是必填入口；现有 task、项目内需求文件和本地标题都进入同一工作流。

Skill 的分工原则：**脚本负责确定性操作**（创建、校验、记录、渲染，标准库零依赖的 `task.py`），**模型负责语义工作**（读输入、读代码、写分析、做实现）。脚本不猜模块和 Spec，模型不伪造证据。

## 输入是什么

五类起点，外加两类必读材料：

| 输入 | 说明 |
| --- | --- |
| GitHub Issue 编号/URL | `create --issue 123 --title "..."` 建档，`sync` 拉取标题、正文和状态 |
| GitHub PR 编号/URL | `create --pr 57 --title "..."` 建档，保留交付关联 |
| 现有 task 文件 | 直接把路径交给 `validate/render/status`，继续原文件，不重复创建 |
| 项目内其他需求文件 | `create --from-file <path>` 建档，保留来源路径和原文快照 |
| 本地任务标题 | `--title "..."` 离线建档，id 自动生成 `task-local-<slug>` |
| 必读：全局 Context | `docs/CONTEXT.md` + canonical 文档地图——填 `## 全局上下文` 分节的来源 |
| 必读：仓库现实 | 实际阅读相关模块代码与 Spec 文档——填 `## 涉及模块`/`## Spec 关联` 的依据 |

“执行指定文件”表示将文件作为需求输入，分析并验证后实施，不是未经分析直接运行文件内容。

## 输入内容是什么（task 文件承载什么）

分析结果写入 **`docs/sprints/task-<source>-<slug>.md`**（一任务一文件，唯一事实源）。格式 = frontmatter 机器字段 + 固定分节，完整契约见 [task-file.md](../../../.agents/skills/task-workflow/references/task-file.md)：

| 分节 | 回答的问题 |
| --- | --- |
| frontmatter | id、标题、时间、status、branch、sourceKind/sourcePath、issue/PR 元数据 |
| `## 任务上下文` | task 的 context：问题、目标、范围、非目标、依赖、假设、未决问题 |
| `## 全局上下文` | 全局 context：架构摘要、来源、约束、是否需要更新全局文档 |
| `## 设计影响` | 是否触及交互、视觉、架构、协议、数据契约或模块边界；现状、目标、决策、风险 |
| `## 功能与验证点` | 每个功能独立 id、目标、模块/Spec 引用；每个验证点有 id、方法、状态、证据 |
| `## 涉及模块` | 变化路径 + 类型（add/modify/delete）+ 原因 |
| `## Spec 关联` | 相关 Spec 文档、是否新增/修改、更新进度；无变化也记录依据 |
| `## 交付记录` / `## 来源原文` | 状态流转 notes；本地需求文件或 Issue/PR 正文快照 |

## 如何使用

常用命令（项目根运行，只读 GitHub，不自动建分支/PR）：

```bash
T=".agents/skills/task-workflow/scripts/task.py"
python $T create --title "任务标题" --issue 123
python $T create --from-file docs/requests/example.md
python $T validate docs/sprints/task-local-example.md --phase analysis
python $T sync task-123-xxx
python $T render task-123-xxx
python $T overview
python $T record task-123-xxx F1-V1 passed --evidence "命令与结果"
python $T status task-123-xxx in_review --note "已实现，等待评审"
```

五步工作流：**① 建立或定位任务**（按输入路由，已有 task 不重建）→ **② 先分析后改代码**（填五项分析，过 `--phase analysis`）→ **③ Canvas 展示**（render + overview，宿主支持时更新真实 Widget）→ **④ 实施与验证**（逐验证点 `record`，`passed` 必须真实证据）→ **⑤ 完成交付**（`--phase review` → `--phase done`）。done 要求全部验证收口、受影响 Spec 更新完成且状态 done；GitHub Issue 任务另需关联 PR，纯本地任务不强制 Issue 或 PR。

## SKILL 的创建

- **位置与结构**：项目副本 `.agents/skills/task-workflow/`，全局副本 `~/.agents/skills/task-workflow/`；两者内容一致。包含 `SKILL.md`、`references/task-file.md`、单文件 CLI `scripts/task.py` 和 `scripts/test_task.py`（13 个用例）。
- **创建原则**：契约先行；脚本唯一规范写入者；与计划流水线同目录不同前缀（`S*-*.md` vs `task-*-*.md`），互不为事实源；Canvas 只做可重建投影，宿主没有 Canvas 能力时退化为静态 HTML。
- **测试与迁移**：`python scripts/test_task.py` 覆盖创建、需求文件输入、往返、门禁、渲染、总览、迁移和漂移告警；旧格式 `tasks/*.task.json` 用 `migrate <path>` 转换并保留旧文件。
- **升级边界**：出现多仓并发写入、GitHub webhook、CI 机器人、多客户端 API 或数据库需求时，才把 schema + CLI 核心提取为独立 tools 包；当前保持 Skill + 单脚本。
