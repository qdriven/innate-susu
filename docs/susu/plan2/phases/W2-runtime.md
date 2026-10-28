# W2：magpie 运行链路收口（网关侧）

> 2026-10-28 合并调整：本段瘦身为**网关侧收口**——magpie 生命周期、CLI/模型/接线、控制台、壳状态与网关真实链路。两套 Harness 的收敛与 DSH 集成链拆至 [R1](./R1-harness.md)（依赖本段产出的行为矩阵），避免收敛风险阻塞 W4/W5。

## 阶段目标

让桌面通过明确契约管理 magpie 生命周期、控制台、状态和接线提示。保留现有 DSH/magpie 协议，不复制 per-agent 账号或模型配置体系。

**前置**：W1c 全绿。W2 与 W3 可并行，但不得修改工作区 UI。

## W2.1 建立运行链路和行为对照矩阵

- **改动位置**：runtime 测试与 `evidence/W2/behavior-matrix.md`。
- **实施**：
  1. 列出 desktop launcher/core、`plugins/model-gateway`、`services/model-gateway` 的职责重叠与独有行为。
  2. 列出 desktop `main/harness.ts` 与 `services/harness-runtime` 在 DSH_HOME、首次 profile、patch、Node 解析、端口、状态、日志、停止上的差异（**本段只记录并定收敛方案，实施在 R1**）。
  3. 固定目标链（网关侧）：gateway ensureRunning → 模型目录 → 接线操作 → 状态事件；DSH 段留给 R1。
  4. 明确 console 与 gateway 是两个进程/认证域，不共享猜测的 key。
- **验证**：每个差异都有保留、收敛（R1 执行）或删除决定及对应测试。
- **完成标准**：没有“直接换实现但未覆盖差异”的未决项；矩阵文档是 R1 的直接输入。

## W2.2 统一 magpie sidecar 生命周期

- **改动位置**：`services/model-gateway`、desktop main 组合、`plugins/model-gateway` 必要适配。
- **实施**：
  1. 复用 MagpieGateway ensureRunning/healthcheck/崩溃退避，注入 binary、env、log 和隔离配置。
  2. 桌面启动 magpie 时区分 desktop、serve 与已存在健康实例，不重复启动。
  3. 将停止、异常退出、健康超时映射为稳定的 GatewayStatus。
  4. 保留 DirectModelGateway 降级，但 UI 必须明确“直连/未安装/未运行”，不能显示假健康。
  5. 不在本任务移动 magpie web console 的 key 管理。
- **验证**：已运行复用、未安装、启动超时、健康恢复、异常退出退避、显式停止不再重启等契约测试。
- **完成标准**：桌面不再维护第二套等价的 serve 生命周期，状态可由 SDK 契约表达。

## W2.3 收口 magpie CLI、模型与接线操作

- **改动位置**：desktop main IPC/preload、model-gateway MagpieCli、models/tools 页面适配。
- **实施**：
  1. 模型目录、provider/agent 状态、quota 和 wire/unwire 通过类型化 gateway facade 调用。
  2. 保留 `execFile` 参数数组与超时；不在 renderer 传命令行。
  3. 写操作仅在用户明确动作触发；自动测试使用 mock 或隔离临时 DSH_HOME。
  4. 断开后恢复默认模型的结果、失败原因和下一步 hint 显式返回。
  5. 不引入具体 Agent 的账号、provider pool 或用量实现。
- **验证**：ModelGateway 契约测试、CLI 输出解析、超时/非零退出、伪造 agent/model 参数负路径。
- **完成标准**：桌面模型与接线功能可运行，真实用户配置不被自动测试修改。

## W2.4 保留并适配受管 magpie 控制台

- **改动位置**：desktop `launcher.ts`、console Surface provider、key 存储。
- **实施**：
  1. 控制台继续使用独立回环端口与稳定受管 key，stdout `magpie web on <url?k=>` 只在 main 解析。
  2. key 文件仅存 userData，权限与损坏重生成行为有测试；日志和快照只保留脱敏地址。
  3. console Surface 使用 W1c 通用生命周期，启动失败只影响控制台。
  4. stop/dispose 回收自己启动的进程，不终止非本应用拥有的已有实例。
- **验证**：重复 show 不重复 spawn、URL 不变不 reload、认证链接缺失报错、进程退出状态可见、关闭无孤儿。
- **完成标准**：控制台内嵌和外跳行为与基线一致，key 不泄漏。

## W2.5 将运行状态接入壳状态区

- **改动位置**：W1a 预留的 titlebar 状态槽、Titlebar/Sidebar 状态、overview/models/chat 页面、事件契约。
- **实施**：
  1. 网关状态 pill 挂入 W1a.3 留出的状态槽；状态区区分 gateway 与 console，不用单个“在线”掩盖部分失败（Harness 状态位留给 R1）。
  2. 用事件更新运行状态，必要时低频 reconciling，移除无意义重复轮询。
  3. 对未安装、未接线、网关断开、模型为空、启动超时给出具体下一步。
  4. simple 只显示用户可理解的状态和设置入口，dev 可查看诊断细节。
- **验证**：各状态转换 UI 测试；断开 gateway 后提示出现且恢复后可重试；无明文 token。
- **完成标准**：用户能从壳判断网关阻塞在哪一层，不需查看原始进程日志。

## W2.6 隔离环境完成网关真实链路

- **改动位置**：集成测试脚本与证据，不写真实用户配置。
- **实施**：
  1. 创建临时 DSH_HOME/userData/magpie 配置和空闲回环端口。
  2. 启动 magpie，验证模型目录拉取、健康检查与**直连网关的一次最小 LLM 调用**（Q1 规划链路的网关前提）。
  3. 验证 wire/unwire 在隔离环境可用且恢复原状；DSH boot→wire→chat 的完整链路归 R1。
  4. 另跑无 magpie 的降级冒烟，纯壳功能仍可使用。
- **验证**：真实网关链路和降级链路分别通过；证据不含 key/token，临时目录清理。
- **完成标准**：gateway 起动→模型→直连调用全链路真实通过，失败路径显式可诊断。

## W2.7 全量回归与交接

- **改动位置**：文档、工具、证据。
- **实施**：运行总门禁、overlay、便携冒烟；更新模块图和 IPC 清单；把 W2.1 矩阵中 Harness 差异部分移交 R1 输入。
- **验证**：W0/W1 行为不回退，W2.1 矩阵网关侧每项有结果。
- **完成标准**：W2.1–W2.6 全绿后与 W3 合流开 W4；R1 可开工（可与 Q1/Q2 并行）。

## 阶段回退

若共享 gateway 未达行为矩阵，恢复 W1c 的桌面 adapter 和旧运行时调用；新 service 可保留用于测试，但不得宣称桌面已收敛，也不得开始 W4。Harness 收敛的回退见 R1。
