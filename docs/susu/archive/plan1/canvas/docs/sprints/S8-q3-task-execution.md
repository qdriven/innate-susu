# S8 · Q3 一条 task 串行执行 + 证据回写

> 详细任务卡：docs/susu/plan1/phases/Q3-task-execution.md。目标：按 capabilities 路由执行器，一次一条，fail closed；没有 magpie/DSH 时纯终端任务仍能跑。

## T8.1 任务路由器
- **状态**：todo
- **做什么**：用 innate-project-canvas derive 取一条可执行 task（仅 confirmed 快照）；capability 路由：process:execute 走 T4.3 通道、agent:tools 走 DSH（需接线）、network:navigate 走 T5.3；执行器缺失显式 skipped 带原因；单飞串行锁，进行中禁止取下一条，可取消（杀进程树标 cancelled）。
- **功能**：一条跑完才下一条的执行序。
- **如何验证**：三分支路由单测；skipped 带原因负路径；串行锁并发断言；取消路径进程杀净。
- **预估 / 依赖**：1 天 / 需 S7

## T8.2 证据回写
- **状态**：todo
- **做什么**：每次执行落证据（命令与退出码、截断输出、截图、会话摘要，不含 token）；快照 task 状态回写 done/failed/cancelled，回写经校验器 + audit 门后触发看板重生成；失败标 failed 停在 frontier，不自动跳下一条。
- **功能**：执行结果可审计、快照始终合法。
- **如何验证**：真实跑一条 pnpm test 任务三处对账（证据目录、快照状态、看板刷新）；必败命令 fail closed 断言。
- **预估 / 依赖**：1 天 / 需 S7

## T8.3 无外部依赖闭环
- **状态**：todo
- **做什么**：验证无 magpie/无 dsh 环境下纯 process:execute 任务从快照到证据全闭环；规划输入框给显式「规划需网关」提示；agent:tools 任务同环境显式 skipped。
- **功能**：壳的基本执行力不锁死在外部运行时上。
- **如何验证**：停 magpie + 空临时 DSH_HOME 跑通一条终端任务；agent:tools 同环境 skipped 且原因显式。
- **预估 / 依赖**：0.5 天 / 需 S7
