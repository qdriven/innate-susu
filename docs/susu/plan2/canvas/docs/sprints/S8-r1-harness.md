# S8 · R1 Harness 收敛与 DSH 集成链（源编号 R1.1–R1.4）

## T8.1 R1.1 harness.ts 关键路径单测（plan1 并入）
- **状态**：todo
- **做什么**：为 harness.ts（收敛前）与 services/harness-runtime（收敛后）补契约单测：stdout url?token 解析（含畸形）、就绪探针（401 算就绪/超时）、停止路径（taskkill /T 调用）；注入 fakeChild 不真拉 dsh；日志断言走脱敏边界。
- **功能**：收敛改动每步有护栏（先测旧实现，收敛后同组断言跑新实现）。
- **如何验证**：新增 ≥5 用例；现有 dsh 冒烟不回归。
- **预估 / 依赖**：0.5 天 / 需 S4

## T8.2 R1.2 收敛共享实现并保留桌面语义
- **状态**：todo
- **做什么**：系统 Node 解析、端口、stdout 捕获、就绪、脱敏日志、状态事件、停止入壳无关实现；配置显式覆盖 DSH_HOME/patch/超时（桌面默认真实 HOME，测试隔离）；simple patch 语义保持；先裸 boot 再 wire 顺序保持；Windows 进程树回收；矩阵逐项对照后删私有重复逻辑。
- **功能**：单一 Harness 进程实现。
- **如何验证**：Node shim、ELECTRON_RUN_AS_NODE 清理、首启/非首启、patch、重复 launch、超时、异常退出、停止、脱敏（R1.1 断言全量重跑）。
- **预估 / 依赖**：1 天 / T8.1

## T8.3 R1.3 隔离环境 DSH 真实集成链
- **状态**：todo
- **做什么**：复用 W2.6 隔离环境：DSH 裸 boot→选测试模型 wire→Harness 启动→嵌入对话→一次最小真实会话→unwire 恢复与进程树回收；无 magpie/无 DSH 降级冒烟。
- **功能**：真实对话闭环可复验。
- **如何验证**：boot→wire→chat 与降级链路分别通过；证据无 key/token。
- **预估 / 依赖**：0.5 天 / T8.2

## T8.4 R1.4 回归与交接
- **状态**：todo
- **做什么**：总门禁+overlay+便携冒烟；更新模块图与 IPC 清单记录唯一 Harness 入口；状态板回写。
- **功能**：Q3 agent:tools 具备真实前提。
- **如何验证**：W0–W5 行为不回退；矩阵 Harness 侧每项有终态结论。
- **预估 / 依赖**：0.25 天 / T8.3
