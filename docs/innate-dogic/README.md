# docs/innate-dogic — 平台化重启文档树（canonical）

> 建立日期：2026-10-27。本树是 `innate-dogic` 从「DSH 双向宿主工作台」升级为「共享底座 + 轻应用平台」的**唯一前看文档**：
> architecture / build-path / plan / sprint 全部在此重新设计，冲突处以本树为准。
> 旧文档（`docs/CONTEXT.md`、`docs/plans/innate-dogic-dsh/`、`docs/sprints/`、`docs/architecture/`、`docs/build-path/`）保留为
> M0–M2 基线证据与方向 B（DSH 侧插件）依据，不再新增执行任务。

## 决策输入

| 输入 | 结论落点 |
| --- | --- |
| Kimi Work 逆向（`docs/research/kimi-work-zcode-platform-notes.md`） | 底座五类共享服务、轻应用交互形态（目的入口/画布钉卡/审批/本地侧载） |
| ZCode 开源架构（`references/zcode`） | 插件契约走 MCP 标准、市场双轨分发、`architecture-policy.yaml` 模块治理 |
| 可运行原型（`prototypes/kimi-work-clone`，selfcheck 全绿） | PluginManifest v0、权限审批、内容寻址、Widget 钉卡的实现基线 |
| 现有代码（M0–M2 已验证：83 项测试、便携冒烟） | 全部保留为基线；只新增框架层，不推翻 |

## 文档地图

| 问题 | 去哪里 |
| --- | --- |
| 做什么、术语、硬约束 | [CONTEXT.md](./CONTEXT.md) |
| 架构总览（分层/契约/证据映射） | [architecture/overview.md](./architecture/overview.md) |
| 目标模块图与迁移映射 | [architecture/module-map.md](./architecture/module-map.md) |
| 视觉与交互规范（参考 orca） | [architecture/style-guide.md](./architecture/style-guide.md) |
| 构建矩阵、命令、门禁、分发 | [build-path/README.md](./build-path/README.md) |
| 里程碑与决策总纲（P 系列） | [plans/README.md](./plans/README.md) |
| Sprint 任务卡（唯一执行源） | [sprints/README.md](./sprints/README.md) |

## 阅读顺序

新会话先读 `CONTEXT.md` → `architecture/overview.md` → `sprints/README.md` 状态板；
执行任务只看 `sprints/`，做完按 DoD 回写证据到 `docs/innate-dogic/evidence/<P 里程碑>/`。
