# Plan2：从 innate-labs 迁移到 innate-desktop

> 状态：待执行。本文档集只完成分析与计划，不代表任何迁移任务已经完成。
>
> 范围：以 `innate-labs` 的 M0–M2 可运行桌面基线为源，以当前 `innate-desktop` 为唯一前向目标仓，按 W0–W5、Q1–Q3 逐段迁移。
>
> 原则：先恢复行为，再调整结构；每个阶段都有真实桌面验收；不 fork orca，不把旧 P 系列平台扩建混入基线迁移。

## 1. 阅读顺序

1. [项目分析](./01-project-analysis.md)：两个仓库的真实现状、差距、冲突和迁移判断。
2. [模块分析](./02-module-analysis.md)：模块职责、依赖、重复实现、风险与逐项迁移策略。
3. [迁移总计划](./03-migration-plan.md)：目标结构、阶段依赖、统一门禁、证据和回退规则。
4. 按依赖顺序阅读并执行阶段任务卡。

## 2. 阶段任务卡

| 顺序 | 阶段 | 目标 | 前置 | 任务卡 |
| --- | --- | --- | --- | --- |
| 0 | W0 | 原样恢复可运行基线，统一目标仓工程门禁 | — | [W0 基线迁入](./phases/W0-baseline.md) |
| 1 | W1 | 三栏壳与中栏 Surface 槽，切换不销毁会话 | W0 | [W1 桌面壳](./phases/W1-shell.md) |
| 2 | W2 | magpie 与 DSH 运行链路收口，状态和错误可见 | W1 | [W2 运行时与模型网关](./phases/W2-runtime.md) |
| 3 | W3 | 只读工作区成为右栏 Panel，文档进入中栏 | W1 | [W3 工作区](./phases/W3-workspace.md) |
| 4 | W4 | 主进程 PTY terminal，共享工作区 cwd | W2、W3 | [W4 Terminal](./phases/W4-terminal.md) |
| 5 | W5 | 独立 browser Surface 与安全导航、下载 | W4 | [W5 Browser](./phases/W5-browser.md) |
| 6 | Q1 | 一句话生成经审计的本地项目快照 | W5 | [Q1 计划生成](./phases/Q1-plan.md) |
| 7 | Q2 | project-canvas 成为给人看的项目中栏 Surface | Q1 | [Q2 项目看板](./phases/Q2-canvas.md) |
| 8 | Q3 | 一次执行一条任务，按 capability 路由并回写证据 | Q2 | [Q3 单任务执行](./phases/Q3-task.md) |

W2 与 W3 在 W1 完成后可以并行；合流后才能进入 W4。其余阶段不跨越未通过的前置门禁。

## 3. 本计划解决的问题

- 源仓已有完整 Electron 桌面实现；目标仓的旧 `@susu/web` 验证应用已废弃删除，当前按 Plan2 重新实现桌面，不把“文档里的目标架构”当成已存在代码。
- 目标仓根工程已统一为 `innate-desktop`，后续保持工程名、脚本和新产品描述一致。
- 源仓桌面私有 Harness 与壳无关 Harness 服务并存，必须经真实行为对照后收敛，不能直接指定其中一套然后删除另一套。
- 当前 UI 必须消费外部 `@innate/ui`，不能在目标仓复制 primitive 或重新维护一套 token。
- 旧文档同时存在 P 系列平台计划与 W/Q 迁移计划。本目录只负责 W/Q 迁移；P3–P5、方向 B、MCP Apps、轻应用市场等保留为后续 backlog。
- project-canvas 的 JSON 快照、派生状态与 HTML 展示必须分离；HTML 永不成为任务事实源。

## 4. 统一任务规则

每张任务卡中的任务均使用以下字段：

- **改动位置**：允许修改的主要文件或模块；不是禁止阅读其他文件。
- **实施**：可执行的步骤，不以“完善”“优化”等无法验收的词作为交付。
- **验证**：自动测试、真实 Electron 冒烟或隔离环境集成验证。
- **完成标准**：任务可标记 done 的必要条件。
- **回退**：本阶段失败时回到哪一个可运行点。

统一要求：

1. 产品、工具与测试代码保持 strict TypeScript。
2. 真实 magpie 只跑只读命令；wire/default/unwire 使用 mock 或隔离临时 `DSH_HOME`。
3. 认证 URL、token、key 不进入日志、快照、测试夹具或证据截图。
4. 新 UI primitive 只从 `@innate/ui` 单入口导入；颜色、间距、字号使用语义 token；明暗使用 `.dark` class。
5. 每个阶段结束保存命令结果、测试数、截图和已知限制到 `docs/susu/plan2/evidence/<PHASE>/`。
6. 一个阶段未全绿，不开始依赖它的下一阶段；修复不得通过删除旧测试或降低安全断言完成。

## 5. 非本轮范围

- fork orca 或复制其 per-agent 账号、模型、用量体系。
- 新建空 `innate-backend`、通用动态插件加载器或万能 Cordis 兼容层。
- 文件写入、Git stage/commit、并行多 Agent、GitHub 作为内部任务数据库。
- DSH 作为唯一执行内核，或在 DSH 内递归嵌入完整 Innate 桌面。
- 轻应用市场、Kimi Widget 钉卡、MCP Apps 全量兼容、NSIS 大包装、手机隧道和自动更新。
