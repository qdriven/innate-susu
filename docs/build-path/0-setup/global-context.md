# 全局 Context 的创建与维护

## 全局 Context 是什么

[docs/CONTEXT.md](../../CONTEXT.md) 是仓库的**全局架构单一入口**，回答五个问题：做什么、架构是什么、模块是什么、插件模式是什么、协议是什么；末尾带 canonical 文档地图。所有 task 的 `## 全局上下文` 分节都必须以它为第一来源——task 级分析不允许与全局 Context 矛盾而不标注。

## 如何创建（首次）

1. 按五问结构写 `docs/CONTEXT.md`：做什么（产品定位与分工边界）→ 架构（workspace 布局 + 依赖方向）→ 模块（当前真实接线，区分「组合」与「已接线」）→ 插件模式 → 协议/契约；末尾维护文档地图（architecture / build-path / sprints / evidence 各目录的入口链接）。
2. 建立配套目录：`docs/architecture/`（模块图与专题架构）、`docs/sprints/`（计划流水线 `S*-*.md` + 开发任务 `task-*-*.md`）、`docs/build-path/`（每任务一个目录的构建记录，本文件所在处）、`docs/evidence/`（验证产物）。
3. 写入「更新义务」声明：架构、模块或协议变化时必须同步 CONTEXT.md（对应 task 的验证项）。

## task 如何消费它（约定）

- 分析 task 时**先读 CONTEXT.md 和文档地图**，再读 Issue 和代码；`## 全局上下文` 的 `来源` 至少引用 `docs/CONTEXT.md`（validate 强制非空）。
- 旧文档与新 canonical 冲突时，在 task 里标出问题，不静默选边。
- 无法确认的全局事实写入 `### 未决问题`，不写成本结论。

## 何时必须更新它（回写约定）

task 的 `## 设计影响` 决定回写义务：

1. `### 是否受影响` = **是** 时，必须分析 `### 全局影响`，并至少关联一项 `add/modify` 的 Spec；Spec 的 `updateStatus` 在 `validate --phase done` 时必须为 done——**先改 Spec/Context，再关 task**。
2. `## 全局上下文` 的 `### 全局更新` 显式记录 `需要：是/否` 与更新计划；`需要：是` 的任务在交付 PR 时必须包含对应文档改动。
3. 变更类型对照：交互/视觉变化 → 更新对应页面与模式文档；架构/模块边界变化 → 更新 CONTEXT.md 第 2/3 节与 `docs/architecture/module-map.md`；协议/数据契约变化 → 更新协议章节与对应 packages 的契约文件。

## 与 task 驱动的关系

全局 Context 是「读」侧的输入（task 分析的依据），task 文件是「写」侧的触发器（designAnalysis 决定哪些全局文档要更新）。两者通过 `globalContext.sourceRefs`（task → CONTEXT）和 `designAnalysis.globalContextImpact` + Spec `updateStatus`（task → 文档回写）双向连接，构成「分析 → 实现 → 文档同步 → 验证收口」的完整闭环。
