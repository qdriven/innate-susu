# Q3：一次执行一条任务

## 阶段目标

从经审计快照的 derive frontier 选择一条任务，按 capabilities 路由到受控 process、可选 DSH Agent 或 browser 执行器，收集运行事实和证据后回写。任何时刻最多一个活跃项目任务，失败或取消不自动推进。

**前置**：Q2 全绿。

**边界**：不并行 N 个 Agent，不自动开 GitHub issue，不把模型声明当授权，不开放文件写入或 Git 变更的通用能力。

## Q3.1 定义最小任务执行契约

- **改动位置**：`packages/sdk` 独立 task-run 子入口、project-canvas task adapter。
- **实施**：
  1. 定义 TaskInput：requestId、taskId、snapshotHash、capability、受控 input、workspaceId/surfaceId 引用。
  2. 定义 RunEvent：runId、单调 seq、timestamp、started/output/approval/completed/failed/cancelled 等本闭环需要的事件。
  3. 定义 RunResult：succeeded/failed/cancelled、summary、安全输出、artifacts/evidence 引用和 retryable error。
  4. snapshotHash 防止执行期间计划悄悄改变；runId 由宿主生成，不能由模型或 renderer 指定。
  5. 只实现本闭环契约，不顺带完成完整 Agentic UI/Annotation 计划。
- **验证**：版本、重复/乱序 seq、终态后事件、伪造 runId/taskId、哈希不匹配、敏感字段测试。
- **完成标准**：UI、调度器和执行器共享同一运行事实契约。

## Q3.2 建立 capability registry 与执行路由

- **改动位置**：task execution service、terminal/DSH/browser adapters。
- **实施**：
  1. 注册 `process:execute`、`agent:tools`、`network:navigate` 三类 capability 及输入 Schema、所需权限和执行器。
  2. 任务只声明已注册 capability；未注册、输入不合法、上下文越权均 fail closed。
  3. process 路由 W4 受控 executor；agent 路由 W2 DSH adapter；network 路由 W5 browser provider。
  4. 执行端重新检查 workspace、surface 和用户授权，不信任快照或模型中的 context。
  5. DSH 不可用只禁用 agent 类任务，不阻塞纯 process 任务。
- **验证**：三类路由、未知 capability、Schema 错误、越权 context、运行时不存在和降级测试。
- **完成标准**：没有绕过 registry 的直接执行路径。

## Q3.3 实现单运行调度器

- **改动位置**：项目 RunCoordinator、持久运行状态。
- **实施**：
  1. 从当前有效快照调用 deriveState，只取 nextTaskId 或用户明确选择的一个 ready task。
  2. 创建 run 前再次校验 snapshotHash、任务状态、依赖和 capability。
  3. 全局或项目级互斥锁保证一次一条；重复点击返回现有 run，不创建第二个。
  4. 支持取消；暂停/恢复只有执行器真实支持时才显示。
  5. 终态后释放锁但不自动启动下一条，由用户查看结果后决定。
  6. 应用重载可恢复运行记录；无法确认外部进程状态时标记 unknown/failed，不伪造成功。
- **验证**：并发点击、依赖在执行前变化、快照变化、取消、重复事件、重载和孤儿运行恢复。
- **完成标准**：任何时刻最多一个活跃 run，frontier 不会被并发或陈旧状态绕过。

## Q3.4 接通 process 执行任务

- **改动位置**：W4 process executor、RunCoordinator、审批 UI。
- **实施**：
  1. 将任务输入映射到已注册 ProcessRequest，可执行 profile 和参数由受控任务定义校验。
  2. cwd 必须来自当前授权 WorkspaceContext，执行前再次 canonical 检查。
  3. 高影响命令展示应用、目的、命令摘要、cwd 和风险，审批超时/拒绝不启动进程。
  4. 收集 exitCode、时间、截断输出和产物引用；非零退出为 failed。
  5. 取消/超时回收 Windows 进程树，结果标记 cancelled/failed，不写成功证据。
- **验证**：成功只读命令、非零退出、审批拒绝/超时、取消、输出超限、cwd 逃逸和无 DSH 环境。
- **完成标准**：没有 magpie/DSH 时，一条纯 terminal 项目任务仍可真实完成。

## Q3.5 接通可选 DSH Agent 任务

- **改动位置**：W2 Harness/Agent adapter、RunCoordinator。
- **实施**：
  1. 只把 `agent:tools` 任务发送到 DSH，使用明确 profile/session 和受限输入。
  2. 将 DSH 原生事件适配为公共 RunEvent，私有对象和认证 URL 不泄露到 UI/快照。
  3. 工具权限仍由宿主 capability 与审批策略决定，DSH 返回内容不能关闭审批。
  4. 模型输出只能是受控摘要、结构化结果或 artifact 引用；不接受可执行 HTML/JS。
  5. DSH 未安装/未接线时任务明确 blocked/failed，不回退成 shell 执行。
- **验证**：真实最小 Agent 任务、工具审批、运行时缺失、会话失败、取消、事件乱序和敏感信息检查。
- **完成标准**：一条真实 Agent 任务可从看板运行并生成可审计结果。

## Q3.6 接通 browser 导航任务

- **改动位置**：W5 browser provider、network capability adapter。
- **实施**：
  1. 任务只提供经 Schema 限制的 http/https URL 和展示目标，main 再校验协议与重定向。
  2. 打开或激活对应 browser Surface 并记录最终安全 URL、加载状态和错误。
  3. 不自动授予页面权限、不执行脚本、不自动下载；这些行为需要独立用户动作。
  4. 网络失败、非法 URL、权限拒绝均为显式结果，不标记成功。
- **验证**：本地测试站成功、404/超时、非法协议、重定向、下载请求和权限请求。
- **完成标准**：一条 network 任务可经真实 browser Surface 完成且权限没有扩大。

## Q3.7 证据回写与人工确认

- **改动位置**：RunResult store、project snapshot writer、Q2 任务详情。
- **实施**：
  1. RunEvent/RunResult 先存运行记录，任务正式状态不随流式文本即时改变。
  2. succeeded 只生成候选 evidence，包含路径、kind、status 和 runId 关联；证据内容由验证器检查。
  3. 只有验证通过或用户明确确认后，原子更新任务状态与 evidence；写失败保留原快照。
  4. failed/cancelled 不写 verified evidence、不标 done、不自动执行下一项。
  5. 证据路径由宿主生成并限制在受控运行目录，模型不能指定任意写路径。
  6. Q2 刷新后重新 derive frontier，旧草稿标过期。
- **验证**：成功确认、验证失败、人工拒绝、快照写失败、路径注入、重复回写和重载 derive。
- **完成标准**：正式状态可追溯到真实 run 和证据，无“模型说完成即完成”。

## Q3.8 完成三类任务与全系统验收

- **改动位置**：tools/smoke-project-run、便携工具与证据。
- **实施**：
  1. 从同一测试项目分别执行一条 process、agent、network 任务，逐项检查结果和证据。
  2. 验证第二个并发请求不启动、失败后不推进、取消后无进程残留。
  3. 验证无 DSH 的 process 降级、无 browser 的 agent/process 隔离和插件失败隔离。
  4. 重载恢复项目、run 记录和看板；执行便携目录全流程。
  5. 运行全量门禁、overlay、安全扫描并保存最终迁移证据。
- **验证**：三类真实执行链与全部负路径通过，W0–Q2 行为不回退。
- **完成标准**：Q3.1–Q3.8 全绿，才可按总计划第 8 节评审本轮迁移完成。

## 阶段回退

停止调度器并保留所有 RunEvent/RunResult 供诊断，正式快照回到上一有效版本。任何不确定状态都按未完成任务处理，不通过手工添加 verified evidence 掩盖失败。
