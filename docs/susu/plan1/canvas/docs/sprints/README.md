# plan1 执行看板（project-canvas 投影）

> 本目录是 `docs/susu/plan1/` 的机器可读投影，供 project-canvas 派生看板与审计。
> 段映射：S0–S5 = plan1 的 W0–W5（迁移段），S6–S8 = plan1 的 Q1–Q3（能力闭环段）。
> 任务卡细节以 [plan1/phases/](../../phases/) 对应任务卡为准；两处同步修改，plan1 叙述优先。
> 状态字段必须显式写 `todo`（引擎对 S5/S6 段有 optional/debt 默认值，显式覆盖）。

| [S0](./S0-w0-baseline.md) | W0 基线整树迁入 | dogic + tools + project-canvas 进仓，门禁与 labs 同绿 | 0.5–1 天 | **下一执行项** |
| [S1](./S1-w1-shell.md) | W1 壳：三栏 + token + 中栏多标签槽 | 换皮不换逻辑；布局对齐 orca | 2–3 天 | 排队 |
| [S2](./S2-w2-magpie.md) | W2 magpie 收口进壳状态 | 网关状态 pill；干净环境接线冒烟 | 1–2 天 | 排队，可与 S3 并行 |
| [S3](./S3-w3-workspace-panel.md) | W3 文件树变常驻右栏 Panel | root 全局化；布局快照恢复 | 1–2 天 | 排队，可与 S2 并行 |
| [S4](./S4-w4-terminal.md) | W4 terminal：pty + process:execute | 首个高权限 Surface；白名单 + 负路径 | 2–3 天 | 排队 |
| [S5](./S5-w5-browser.md) | W5 browser Surface | 独立分区；权限默认拒；外链外跳 | 1–2 天 | 排队 |
| [S6](./S6-q1-plan-snapshot.md) | Q1 一句话 → project-snapshot 快照 | 网关规划 + schema 校验 + audit 门 | 2 天 | 排队 |
| [S7](./S7-q2-canvas-board.md) | Q2 人看的看板进中栏 | 只读；草稿≠正式；HTML≠数据源 | 1–2 天 | 排队 |
| [S8](./S8-q3-task-execution.md) | Q3 一条 task 串行执行 + 证据回写 | 能力路由；fail closed；无外部依赖可跑 | 2–3 天 | 排队 |
