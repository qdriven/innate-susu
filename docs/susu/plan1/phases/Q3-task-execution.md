# Q3 · 一条 task 串行执行 + 证据回写

> 预估 2–3 天 · 依赖：Q2
> 目标：从快照取**一条**可执行任务，按其 capabilities 路由到执行器（W4 pty / 可选 DSH / W5 browser），跑完回写证据与状态。**不并行 N 个 Agent；失败 fail closed；没有 magpie/DSH 时纯终端任务仍能跑。**

## 任务卡

### Q3.1 任务路由器

- **做什么**：
  - 取任务：`innate-project-canvas` **derive** 模块（进程内 import）从 confirmed 快照取一条可执行 task（frontier 判定沿用其规则）；一次只取一条，跑完（成功或 fail closed）才允许下一条。
  - 能力路由（读 task 的 capabilities 字段）：
    | capability | 执行器 | 依赖 |
    | --- | --- | --- |
    | `process:execute` | W4.3 执行通道（白名单 + cwd=workspace root + 超时） | 无外部依赖 |
    | `agent:tools` | DSH 会话（经 `harness.ts` 已有通道发起；magpie 接线正常才可用） | magpie+dsh |
    | `network:navigate` | W5.3 受控 browser API（navigate + capture） | 无外部依赖 |
  - 执行器缺失/不可用（如未接线 dsh）：该任务显式 `skipped{reason}`，不静默、不换执行器硬跑。
  - 串行锁：壳内单飞队列（同时最多 1 个任务在跑）；进行中禁止取下一条（UI 置灰 + 取消按钮，取消=杀进程树 + 标 `cancelled`）。
- **如何验证**：单测路由表三分支 + skipped 负路径；串行锁并发断言；取消路径杀净进程（复用 W4.4 断言）。

### Q3.2 证据回写

- **做什么**：
  - 每次执行落证据：`docs/susu/evidence/tasks/<task-id>/<时间戳>/`——命令与退出码、stdout/stderr 截断版、browser 截图、DSH 会话摘要（不含 token）；证据路径写进快照 task 条目。
  - 状态回写：`done`（exit 0 且证据齐）/ `failed`（非 0 或超时）/ `cancelled`；回写经 Q1.2 校验器 + audit 门（防手滑写坏快照），然后触发 Q2 看板重生成。
  - fail closed：失败任务标 `failed` 并停在 frontier，**不自动跳到下一条**；人在看板/快照侧处置（改任务或标放弃）后才继续。
- **如何验证**：真实跑一条 `process:execute` 任务（如「运行 pnpm test 并记录输出」）全链路：证据目录、快照状态、看板刷新三处对账；失败任务（构造必败命令）fail closed 断言。

### Q3.3 无外部依赖闭环

- **做什么**：验证断网/无 magpie/无 dsh 环境下，纯 `process:execute` 任务从快照到证据的完整闭环可跑（Q1 的规划不可用属预期——用已有 confirmed 快照；此时输入框给显式「规划需网关」提示）。
- **如何验证**：停 magpie + 临时 `DSH_HOME` 空环境，跑通一条终端任务；`agent:tools` 任务在同环境被 skipped 且 reason 显式。

## 出口标准

1. 端到端一遍真实闭环：一句话（Q1）→ 确认（Q2）→ 跑一条（Q3）→ 证据 → 看板更新，全程无手工改数据。
2. 串行、fail closed、skipped 显式原因、无 magpie/DSH 可跑四项各有验收记录。
3. 权限红线复验：execute 白名单/cwd 约束在任务执行路径上同样生效（复用 W4.3 负路径）。
4. 测试基线只增；全量门禁绿；plan1 状态板收口，W/Q 主线完成 → 触发 P 系列重启评估。
