# R1：Harness 收敛与 DSH 真实集成链

> 2026-10-28 合并新增：从原 W2 拆出的高风险段——两套 Harness 实现的行为对照收敛，加上 DSH 的 boot→wire→chat 真实集成链。独立成段的原因：进程行为差异收敛是全计划最容易踩坑处，不应阻塞 W4/W5 与 Q1/Q2；同时 Q3 的 agent:tools 路径必须以收敛后的单一实现为前提。

## 阶段目标

桌面只保留一套 Harness 进程实现（壳无关 `services/harness-runtime` 收纳共享逻辑，desktop 保留状态/IPC/Surface adapter），并在隔离环境完成 gateway→裸 boot→wire→chat 的真实闭环。

**前置**：W2 全绿（消费其行为矩阵与网关链路）。**W2 移交输入（2026-10-29 网关侧收口完成）**：[W2 行为矩阵](./evidence/W2/behavior-matrix.md) §2 Harness 九项差异对照 + §5 收敛决定（网关侧 A1–A8 已全绿，Harness 差异项待本段逐项收敛）；隔离链路冒烟脚本 `pnpm smoke:magpie`（`tools/smoke-magpie.ts`）可直接复用于 R1.3 隔离环境。可与 Q1/Q2 并行（不触 renderer 工作台 UI）；**Q3 开工前必须全绿**。

## R1.1 harness.ts 关键路径单测补齐（plan1 并入）

- **改动位置**：labs 修复随 W0.2 已带入；本任务在目标仓为 `apps/desktop/src/main/harness.ts`（收敛前）与 `services/harness-runtime`（收敛后）补齐契约单测。
- **实施**：
  1. stdout `dsh web: <url?token>` 解析（含畸形输出、多行、无 token）。
  2. 就绪探针（<500 即就绪、401 算就绪、超时失败）。
  3. 停止路径（Windows `taskkill /T /F` 调用被发出、非 Windows 信号等待）。
  4. 进程交互注入 fakeChild，不真拉 dsh；日志断言全部走脱敏边界。
- **验证**：新增 ≥5 用例入基线；现有 dsh 冒烟不回归。
- **完成标准**：收敛改动的每一步都有单测护栏（先测旧实现，收敛后同一组断言跑新实现）。

## R1.2 收敛 Harness 共享实现并保留桌面语义

- **改动位置**：`services/harness-runtime`、desktop `main/harness.ts` 与 runtime adapter。
- **实施**：
  1. 将系统 Node 解析、端口分配、stdout URL 捕获、就绪探测、脱敏日志、状态事件和停止放入壳无关实现。
  2. 配置项显式覆盖 DSH_HOME、patchPaths、userData/log、启动超时；桌面继续默认真实用户 DSH_HOME，测试必须注入隔离目录。
  3. 保持 simple 模式 `--profile web --patch` 与 dev `web` 参数语义。
  4. 保留首次 DSH_HOME 先裸 boot 再 wire 的顺序；不得把 bootBackend 的具体默认模型静默带入桌面。
  5. Windows 使用进程树回收；非 Windows 使用明确信号并等待退出。
  6. 新实现通过 W2.1 矩阵逐项对照后，desktop 删除私有重复逻辑，仅保留状态/IPC/Surface adapter。
- **验证**：Node shim、ELECTRON_RUN_AS_NODE 清理、首次/非首次启动、patch、重复 launch、60s/120s 超时配置、异常退出、停止进程树、日志脱敏（R1.1 断言全量重跑）。
- **完成标准**：只有一套 Harness 进程实现；桌面状态、overlay 与 W1c 基线一致。
- **回退**：恢复桌面私有 harness.ts 与旧调用；共享服务保留用于测试，不得宣称已收敛，Q3 不得开工。

## R1.3 隔离环境完成 DSH 真实集成链

- **改动位置**：集成测试脚本与证据，不写真实用户配置。
- **实施**：
  1. 复用 W2.6 隔离环境，DSH 裸 boot 生成 profiles，隔离环境选择测试模型并 wire。
  2. 启动 Harness，嵌入对话 Surface，完成一次最小真实会话。
  3. 执行 unwire/default 和停止，验证临时配置恢复与进程树回收。
  4. 验证无 magpie/无 DSH 的降级冒烟仍可使用（纯壳 + terminal 任务不受影响）。
- **验证**：boot→wire→chat 与降级链路分别通过；证据不含 key/token，临时目录清理。
- **完成标准**：一次真实对话闭环；失败路径显式可诊断。

## R1.4 回归与交接

- **改动位置**：文档、工具、证据。
- **实施**：总门禁、overlay、便携冒烟；更新模块图与 IPC 清单，记录唯一 Harness 入口；README 状态板回写。
- **验证**：W0–W5 行为不回退；W2.1 矩阵 Harness 侧每项有终态结论。
- **完成标准**：R1.1–R1.3 全绿；Q3 的 agent:tools 路径具备真实前提。

## 阶段回退

收敛未达矩阵 → 恢复桌面 adapter 与旧实现（见 R1.2）；不得为推进 Q3 放宽「同一组断言跑新实现」的对照标准，不得用 mock 会话冒充真实闭环。
