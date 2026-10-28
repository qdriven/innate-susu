# 0-setup：任务开发驱动基线

本目录是 `docs/build-path/` 的第一阶段记录：为仓库建立 **GitHub 与本地输入统一的开发闭环**——每个任务一个结构化文件、分析先于编码、证据强制、Canvas 可视化。

## 本阶段产物

| 产物 | 位置 | 作用 |
| --- | --- | --- |
| task-workflow Skill | [.agents/skills/task-workflow/](../../../.agents/skills/task-workflow/SKILL.md) | 管理 Issue/PR、需求文件与本地 task 全生命周期的命令和工作流 |
| task 文件契约 | `docs/sprints/task-*-*.md` | 一任务一文件的事实源（与计划流水线 `S*-*.md` 同目录、前缀区分） |
| 全局 Context | [docs/CONTEXT.md](../../CONTEXT.md) | 全局架构单一入口，task 分析的必读来源 |
| Canvas 投影 | `.task-canvas/`（派生物） | 单任务四视图 + 跨任务总览，可再生、非事实源 |

## 文档索引

1. [issue-task-driver.md](issue-task-driver.md) —— Skill 总结：输入是什么、输入内容是什么、如何使用；以及它的创建方式、结构与目的。
2. [global-context.md](global-context.md) —— 全局 Context 的创建与维护约定：`docs/CONTEXT.md` 的角色、task 如何消费它、何时必须更新。

## 为什么放在 build-path

每个比较的任务一个目录（build-path 惯例）。setup 是所有后续任务的起点：先有任务驱动约定（本目录），再有具体功能任务（`docs/sprints/task-*.md`，各自可在 build-path 建对应目录记录构建步骤）。
